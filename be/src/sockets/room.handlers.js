import Room from "../models/Room.js";
import Move from "../models/Move.js";
import { ENV } from "../config/env.js";
import { genRoomCode6 } from "../utils/codeGen.js";
import { startTurnTimer, clearTurnTimer } from "./turnTimer.js";

// helper: lấy id thật kể cả khi populate
function uid(v) {
  return (v?._id ?? v)?.toString?.() ?? String(v);
}

// Populate + chuẩn hoá dữ liệu room gửi về FE (thêm username)
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

function findPlayer(room, userId) {
  return room.players.find((p) => uid(p.userId) === uid(userId));
}

async function loadRoomPopulated(code) {
  return Room.findOne({ code })
    .populate("players.userId", "username")
    .populate("hostId", "username");
}

export function registerRoomHandlers(io, socket) {
  // ---------------------------
  // CREATE ROOM (host = X)
  // ---------------------------
  socket.on("room:create", async () => {
    try {
      const hostUserId = socket.userId;

      let code = genRoomCode6();
      while (await Room.findOne({ code })) code = genRoomCode6();

      const room = await Room.create({
        code,
        hostId: hostUserId,
        status: "waiting",
        boardSize: ENV.BOARD_SIZE,
        winLength: ENV.WIN_LENGTH,
        xIsNext: true,
        winner: null,
        turnStartedAt: null,
        players: [{ userId: hostUserId, symbol: "X", isReady: false }],
      });

      const populated = await loadRoomPopulated(code);

      socket.join(code);
      socket.emit("room:created", { roomCode: code, room: publicRoom(populated) });
      io.to(code).emit("room:updated", { room: publicRoom(populated) });
    } catch (e) {
      socket.emit("room:error", { message: "Tạo phòng thất bại" });
    }
  });

  // ---------------------------
  // JOIN ROOM (player2 = O)
  // ---------------------------
  socket.on("room:join", async ({ roomCode }) => {
    try {
      const userId = socket.userId;
      const room = await loadRoomPopulated(roomCode);
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

      // nếu user đã ở trong phòng => cho join lại (refresh/reconnect)
      const existedPlayer = findPlayer(room, userId);
      if (existedPlayer) {
        socket.join(roomCode);
        socket.emit("room:joined", { roomCode, room: publicRoom(room), me: userId });
        io.to(roomCode).emit("room:updated", { room: publicRoom(room) });
        return;
      }

      if (room.players.length >= 2) {
        return socket.emit("room:error", { message: "Phòng đã đủ 2 người" });
      }

      room.players.push({ userId, symbol: "O", isReady: false });
      room.status = "ready";
      await room.save();

      const updated = await loadRoomPopulated(roomCode);

      socket.join(roomCode);
      socket.emit("room:joined", { roomCode, room: publicRoom(updated), me: userId });
      io.to(roomCode).emit("room:updated", { room: publicRoom(updated) });
    } catch (e) {
      socket.emit("room:error", { message: "Vào phòng thất bại" });
    }
  });

  // ---------------------------
  // SYNC ROOM (refresh page)
  // ---------------------------
  socket.on("room:sync", async ({ roomCode }) => {
    try {
      const room = await loadRoomPopulated(roomCode);
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

      socket.join(roomCode);
      socket.emit("room:updated", { room: publicRoom(room) });
    } catch {
      socket.emit("room:error", { message: "Sync thất bại" });
    }
  });

  // ---------------------------
  // READY TOGGLE
  // auto-start nếu đủ 2 người & ready hết
  // ---------------------------
  socket.on("room:ready", async ({ roomCode, ready }) => {
    try {
      const userId = socket.userId;
      const room = await loadRoomPopulated(roomCode);
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

      const p = findPlayer(room, userId);
      if (!p) return socket.emit("room:error", { message: "Bạn không thuộc phòng" });

      p.isReady = !!ready;

      if (room.players.length === 2 && room.players.every((x) => x.isReady)) {
        room.status = "playing";
        room.winner = null;
        room.xIsNext = true;
        room.turnStartedAt = new Date();

        await Move.deleteMany({ roomId: room._id });
        await room.save();

        const updated = await loadRoomPopulated(roomCode);

        io.to(roomCode).emit("room:updated", { room: publicRoom(updated) });
        io.to(roomCode).emit("game:started", { room: publicRoom(updated) });

        startTurnTimer(io, roomCode);
        return;
      }

      await room.save();

      const updated = await loadRoomPopulated(roomCode);
      io.to(roomCode).emit("room:updated", { room: publicRoom(updated) });
    } catch {
      socket.emit("room:error", { message: "Ready thất bại" });
    }
  });

  // ---------------------------
  // START (host-only, manual)
  // ---------------------------
  socket.on("room:start", async ({ roomCode }) => {
    try {
      const userId = socket.userId;
      const room = await loadRoomPopulated(roomCode);
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

      if (uid(room.hostId) !== uid(userId)) {
        return socket.emit("room:error", { message: "Chỉ host được bắt đầu" });
      }
      if (room.players.length < 2) {
        return socket.emit("room:error", { message: "Chưa đủ 2 người" });
      }

      //  bắt buộc cả 2 người phải ready lại trước khi start (fix rematch)
      if (!room.players.every((p) => p.isReady)) {
        return socket.emit("room:error", { message: "Cần cả 2 người bấm READY/Play again trước khi bắt đầu" });
      }

      room.status = "playing";
      room.winner = null;
      room.xIsNext = true;
      room.turnStartedAt = new Date();

      await Move.deleteMany({ roomId: room._id });
      await room.save();

      const updated = await loadRoomPopulated(roomCode);

      io.to(roomCode).emit("room:updated", { room: publicRoom(updated) });
      io.to(roomCode).emit("game:started", { room: publicRoom(updated) });

      startTurnTimer(io, roomCode);
    } catch {
      socket.emit("room:error", { message: "Start thất bại" });
    }
  });

  // ---------------------------
  // LEAVE ROOM
  // ---------------------------
  socket.on("room:leave", async ({ roomCode }) => {
    try {
      const userId = socket.userId;
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      socket.leave(roomCode);

      const isHost = uid(room.hostId) === uid(userId);
      if (isHost) {
        clearTurnTimer(roomCode);

        await Move.deleteMany({ roomId: room._id });
        await Room.deleteOne({ _id: room._id });

        io.to(roomCode).emit("room:error", { message: "Host rời phòng, phòng bị đóng" });
        return;
      }

      const idx = room.players.findIndex((p) => uid(p.userId) === uid(userId));
      if (idx === -1) return;

      room.players.splice(idx, 1);
      room.status = "waiting";
      room.winner = null;
      room.xIsNext = true;
      room.turnStartedAt = null;
      room.players.forEach((p) => (p.isReady = false));

      clearTurnTimer(roomCode);

      await Move.deleteMany({ roomId: room._id });
      await room.save();

      const updated = await loadRoomPopulated(roomCode);
      io.to(roomCode).emit("room:updated", { room: publicRoom(updated) });
    } catch {
      // ignore
    }
  });

  socket.on("disconnect", async () => {});
}
