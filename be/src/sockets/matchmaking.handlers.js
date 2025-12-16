import Room from "../models/Room.js";
import Move from "../models/Move.js";
import { ENV } from "../config/env.js";
import { genRoomCode6 } from "../utils/codeGen.js";
import { startTurnTimer, clearTurnTimer } from "./turnTimer.js";
import {
  mmEnqueue,
  mmDequeue,
  mmRemoveBySocketId,
  mmHasUser,
} from "./matchmaking.queue.js";

// helper: id thật kể cả populate
function uid(v) {
  return (v?._id ?? v)?.toString?.() ?? String(v);
}

// room trả về FE có username
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
      symbol: p.symbol,
      isReady: p.isReady,
    })),
    turnStartedAt: room.turnStartedAt,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

async function loadRoomPopulated(code) {
  return Room.findOne({ code })
    .populate("players.userId", "username")
    .populate("hostId", "username");
}

function safeJoin(io, socketId, roomCode) {
  const s = io.sockets.sockets.get(socketId);
  if (s) s.join(roomCode);
}

export function registerMatchmakingHandlers(io, socket) {
  socket.on("matchmaking:find", async () => {
    try {
      const userId = socket.userId;
      if (!userId)
        return socket.emit("matchmaking:error", { message: "UNAUTHORIZED" });

      // chống spam
      if (mmHasUser(userId)) return socket.emit("matchmaking:waiting");

      const opponent = mmDequeue();

      // chưa có ai -> vào queue
      if (!opponent) {
        mmEnqueue(userId, socket.id);
        return socket.emit("matchmaking:waiting");
      }

      // edge-case: dequeue trúng chính mình
      if (String(opponent.userId) === String(userId)) {
        mmEnqueue(opponent.userId, opponent.socketId);
        mmEnqueue(userId, socket.id);
        return socket.emit("matchmaking:waiting");
      }

      // tạo code phòng tránh trùng
      let code = genRoomCode6();
      while (await Room.findOne({ code })) code = genRoomCode6();

      // ✅ AUTO-START: tạo phòng là playing luôn, cả 2 ready=true
      const room = await Room.create({
        code,
        hostId: opponent.userId, // người vào trước làm host
        status: "playing",
        boardSize: ENV.BOARD_SIZE,
        winLength: ENV.WIN_LENGTH,
        xIsNext: true,
        winner: null,
        turnStartedAt: new Date(),
        players: [
          { userId: opponent.userId, symbol: "X", isReady: true },
          { userId: userId, symbol: "O", isReady: true },
        ],
      });

      // dọn moves cũ (thường không có, nhưng để chắc)
      await Move.deleteMany({ roomId: room._id });

      // join socket.io room
      safeJoin(io, opponent.socketId, code);
      socket.join(code);

      // lấy room có username
      const populated = await loadRoomPopulated(code);

      // ✅ thông báo match + bắt đầu game ngay
      io.to(code).emit("matchmaking:matched", { roomCode: code, roomId: room._id });

      // đồng bộ room + game started (FE bạn đang listen room:updated + game:started)
      io.to(code).emit("room:updated", { room: publicRoom(populated) });
      io.to(code).emit("game:started", { room: publicRoom(populated) });

      // start timer lượt
      clearTurnTimer(code);
      startTurnTimer(io, code);
    } catch (e) {
      socket.emit("matchmaking:error", { message: "Không thể tìm trận" });
    }
  });

  socket.on("matchmaking:cancel", () => {
    mmRemoveBySocketId(socket.id);
    socket.emit("matchmaking:canceled");
  });

  socket.on("disconnect", () => {
    mmRemoveBySocketId(socket.id);
  });
}
