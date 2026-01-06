import Room from "../models/Room.js";
import Move from "../models/Move.js";
import Match from "../models/Match.js";
import User from "../models/User.js";
import { calcEloDelta } from "../utils/elo.js";
import { ENV } from "../config/env.js";
import {
  emptyBoard,
  inBounds,
  checkWinnerWithLine,
} from "../utils/gameLogic.js";
import { startTurnTimer, clearTurnTimer } from "./turnTimer.js";

function uid(v) {
  return (v?._id ?? v)?.toString?.() ?? String(v);
}

function publicRoom(room) {
  return {
    id: room._id,
    code: room.code,
    hostId: room.hostId?._id ?? room.hostId,
    status: room.status,
    boardSize: room.boardSize,
    winLength: room.winLength,
    xIsNext: room.xIsNext,
    winner: room.winner,
    players: room.players.map((p) => ({
      userId: p.userId?._id ?? p.userId,
      username: p.userId?.username ?? null,
      elo: p.userId?.elo ?? 1000,
      symbol: p.symbol,
      isReady: p.isReady,
    })),
    turnStartedAt: room.turnStartedAt,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function findPlayer(room, userId) {
  return room.players.find((p) => uid(p.userId) === uid(userId));
}

async function buildBoardFromMoves(roomId, size) {
  const moves = await Move.find({ roomId }).sort({ createdAt: 1 }).lean();
  const board = emptyBoard(size);
  for (const m of moves) {
    if (inBounds(size, m.x, m.y)) board[m.y][m.x] = m.symbol;
  }
  return { board, moves };
}

async function finishMatch(room, winner) {
  const match = await Match.create({
    roomCode: room.code,
    players: room.players.map((p) => ({
      userId: p.userId?._id ?? p.userId,
      symbol: p.symbol,
    })),
    winner,
    endedAt: new Date(),
  });

  await Move.updateMany(
    { roomId: room._id, matchId: null },
    { $set: { matchId: match._id } }
  );

  return match;
}

async function applyElo(room, winner) {
  // winner: "X" | "O" | "draw"
  const px = room.players.find((p) => p.symbol === "X");
  const po = room.players.find((p) => p.symbol === "O");
  if (!px || !po) return null;

  const xId = uid(px.userId);
  const oId = uid(po.userId);

  const [ux, uo] = await Promise.all([
    User.findById(xId).select("elo").lean(),
    User.findById(oId).select("elo").lean(),
  ]);
  if (!ux || !uo) return null;

  let scoreX = 0.5;
  let scoreO = 0.5;

  if (winner === "X") {
    scoreX = 1;
    scoreO = 0;
  }
  if (winner === "O") {
    scoreX = 0;
    scoreO = 1;
  }

  const deltaX = calcEloDelta(ux.elo, uo.elo, scoreX);
  const deltaO = -deltaX;

  await Promise.all([
    User.updateOne({ _id: xId }, { $inc: { elo: deltaX } }),
    User.updateOne({ _id: oId }, { $inc: { elo: deltaO } }),
  ]);

  return {
    X: { userId: xId, delta: deltaX },
    O: { userId: oId, delta: deltaO },
  };
}

export function registerGameHandlers(io, socket) {
  socket.on("game:move", async ({ roomCode, x, y }) => {
    try {
      const userId = socket.userId;

      const room = await Room.findOne({ code: roomCode })
        .populate("players.userId", "username elo")
        .populate("hostId", "username elo");
      if (!room)
        return socket.emit("room:error", { message: "Phòng không tồn tại" });

      if (room.status !== "playing")
        return socket.emit("room:error", { message: "Ván chưa bắt đầu" });

      if (room.winner)
        return socket.emit("room:error", { message: "Ván đã kết thúc" });

      const me = findPlayer(room, userId);
      if (!me)
        return socket.emit("room:error", { message: "Bạn không thuộc phòng" });

      const size = room.boardSize || ENV.BOARD_SIZE;
      if (!inBounds(size, x, y))
        return socket.emit("room:error", { message: "Nước đi không hợp lệ" });

      const currentSymbol = room.xIsNext ? "X" : "O";
      if (me.symbol !== currentSymbol)
        return socket.emit("room:error", { message: "Chưa tới lượt bạn" });

      const existed = await Move.findOne({ roomId: room._id, x, y }).lean();
      if (existed)
        return socket.emit("room:error", { message: "Ô đã được đánh" });

      const move = await Move.create({
        roomId: room._id,
        matchId: null,
        x,
        y,
        symbol: currentSymbol,
        by: userId,
        at: new Date(),
      });

      const { board, moves } = await buildBoardFromMoves(room._id, size);
      const winLen = room.winLength || ENV.WIN_LENGTH;

      const { winner, winningLine } = checkWinnerWithLine(
        board,
        { x, y, symbol: currentSymbol },
        winLen
      );

      const lastMovePayload = {
        x,
        y,
        symbol: currentSymbol,
        by: userId,
        at: move.at,
      };

      if (winner) {
        room.winner = winner;
        room.status = "finished";
        room.turnStartedAt = null;
        room.players.forEach((p) => (p.isReady = false));
        await room.save();

        const eloChange = await applyElo(room, winner);

        await finishMatch(room, winner);
        clearTurnTimer(roomCode);

        io.to(roomCode).emit("game:ended", {
          room: publicRoom(room),
          winner,
          winningLine,
          lastMove: lastMovePayload,
          eloChange, // ✅ gửi cho FE
        });
        return;
      }

      if (moves.length >= size * size) {
        room.winner = "draw";
        room.status = "finished";
        room.turnStartedAt = null;
        room.players.forEach((p) => (p.isReady = false));
        await room.save();

        const eloChange = await applyElo(room, "draw");

        await finishMatch(room, "draw");
        clearTurnTimer(roomCode);

        io.to(roomCode).emit("game:ended", {
          room: publicRoom(room),
          winner: "draw",
          winningLine: null,
          lastMove: lastMovePayload,
          eloChange,
        });
        return;
      }

      room.xIsNext = !room.xIsNext;
      room.turnStartedAt = new Date();
      await room.save();

      io.to(roomCode).emit("game:moved", {
        room: publicRoom(room),
        lastMove: lastMovePayload,
      });

      startTurnTimer(io, roomCode);
    } catch (e) {
      socket.emit("room:error", { message: "Đánh cờ thất bại" });
    }
  });

  socket.on("game:moves", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room)
        return socket.emit("room:error", { message: "Phòng không tồn tại" });

      const moves = await Move.find({ roomId: room._id })
        .sort({ createdAt: 1 })
        .lean();

      socket.emit("game:moves", {
        roomCode,
        moves: moves.map((m) => ({
          x: m.x,
          y: m.y,
          symbol: m.symbol,
          by: m.by ?? m.userId,
          at: m.at ?? m.createdAt,
        })),
      });
    } catch {
      socket.emit("room:error", { message: "Không lấy được moves" });
    }
  });
}
