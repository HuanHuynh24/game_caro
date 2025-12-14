import Room from "../models/Room.js";
import Move from "../models/Move.js";
import Match from "../models/Match.js";
import { ENV } from "../config/env.js";
import { emptyBoard, inBounds, checkWinnerWithLine } from "../utils/gameLogic.js";

// Chuẩn hoá dữ liệu room gửi về FE
function publicRoom(room) {
  return {
    id: room._id,
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    boardSize: room.boardSize,
    winLength: room.winLength,
    xIsNext: room.xIsNext,
    winner: room.winner,
    players: room.players.map((p) => ({
      userId: p.userId,
      symbol: p.symbol,
      isReady: p.isReady,
    })),
    turnStartedAt: room.turnStartedAt,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function findPlayer(room, userId) {
  return room.players.find((p) => p.userId.toString() === userId.toString());
}

// Rebuild board từ Move (đúng tuyệt đối)
async function buildBoardFromMoves(roomId, size) {
  const moves = await Move.find({ roomId }).sort({ createdAt: 1 }).lean();

  const board = emptyBoard(size);
  for (const m of moves) {
    if (inBounds(size, m.x, m.y)) {
      board[m.y][m.x] = m.symbol; // board[y][x]
    }
  }
  return { board, moves };
}

// Tạo Match khi kết thúc ván
async function finishMatch(room, winner) {
  const match = await Match.create({
    roomCode: room.code,
    players: room.players.map((p) => ({
      userId: p.userId,
      symbol: p.symbol,
    })),
    winner, // "X" | "O" | "draw"
    endedAt: new Date(),
  });

  await Move.updateMany(
    { roomId: room._id, matchId: null },
    { $set: { matchId: match._id } }
  );

  return match;
}

export function registerGameHandlers(io, socket) {
  // =========================
  // GAME MOVE (authoritative)
  // =========================
  socket.on("game:move", async ({ roomCode, x, y }) => {
    try {
      const userId = socket.userId;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

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

      // Kiểm tra lượt
      const currentSymbol = room.xIsNext ? "X" : "O";
      if (me.symbol !== currentSymbol)
        return socket.emit("room:error", { message: "Chưa tới lượt bạn" });

      // Kiểm tra ô đã đánh chưa
      const existed = await Move.findOne({ roomId: room._id, x, y }).lean();
      if (existed)
        return socket.emit("room:error", { message: "Ô đã được đánh" });

      // Lưu Move
      const move = await Move.create({
        roomId: room._id,
        matchId: null,
        x,
        y,
        symbol: currentSymbol,
        by: userId,
        at: new Date(),
      });

      // Rebuild board để check thắng
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

      // ========= WIN =========
      if (winner) {
        room.winner = winner; // "X" | "O"
        room.status = "finished";
        room.turnStartedAt = null;
        await room.save();

        await finishMatch(room, winner);

        io.to(roomCode).emit("game:ended", {
          room: publicRoom(room),
          winner,
          winningLine, // ✅ NEW: [{x,y}...]
          lastMove: lastMovePayload,
        });
        return;
      }

      // ========= DRAW =========
      if (moves.length >= size * size) {
        room.winner = "draw";
        room.status = "finished";
        room.turnStartedAt = null;
        await room.save();

        await finishMatch(room, "draw");

        io.to(roomCode).emit("game:ended", {
          room: publicRoom(room),
          winner: "draw",
          winningLine: null, // ✅
          lastMove: lastMovePayload,
        });
        return;
      }

      // ========= NEXT TURN =========
      room.xIsNext = !room.xIsNext;
      room.turnStartedAt = new Date();
      await room.save();

      io.to(roomCode).emit("game:moved", {
        room: publicRoom(room),
        lastMove: lastMovePayload,
      });
    } catch (e) {
      socket.emit("room:error", { message: "Đánh cờ thất bại" });
    }
  });

  // =========================
  // Lấy toàn bộ moves (refresh FE)
  // =========================
  socket.on("game:moves", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

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
