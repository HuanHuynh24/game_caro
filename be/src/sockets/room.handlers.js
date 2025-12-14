import Room from "../models/Room.js";
import Move from "../models/Move.js";
import { ENV } from "../config/env.js";
import { genRoomCode6 } from "../utils/codeGen.js";

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

export function registerRoomHandlers(io, socket) {
  // ---------------------------
  // CREATE ROOM (host = X)
  // ---------------------------
  socket.on("room:create", async () => {
    try {
      const hostUserId = socket.userId;

      let code = genRoomCode6();
      // đảm bảo unique
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

      socket.join(code);

      socket.emit("room:created", { roomCode: code, room: publicRoom(room) });
      io.to(code).emit("room:updated", { room: publicRoom(room) });
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
      const room = await Room.findOne({ code: roomCode });
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

      socket.join(roomCode);

      socket.emit("room:joined", { roomCode, room: publicRoom(room), me: userId });

      // ✅ notify host/player1 ngay
      io.to(roomCode).emit("room:updated", { room: publicRoom(room) });
    } catch (e) {
      socket.emit("room:error", { message: "Vào phòng thất bại" });
    }
  });

  // ---------------------------
  // SYNC ROOM (refresh page)
  // ---------------------------
  socket.on("room:sync", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ code: roomCode });
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
      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

      const p = findPlayer(room, userId);
      if (!p) return socket.emit("room:error", { message: "Bạn không thuộc phòng" });

      p.isReady = !!ready;

      // auto-start nếu đủ 2 người và 모두 ready
      if (room.players.length === 2 && room.players.every((x) => x.isReady)) {
        // reset game state
        room.status = "playing";
        room.winner = null;
        room.xIsNext = true;
        room.turnStartedAt = new Date();

        // xoá moves cũ (nếu bạn muốn rematch trong cùng room)
        await Move.deleteMany({ roomId: room._id });

        await room.save();

        io.to(roomCode).emit("room:updated", { room: publicRoom(room) });
        io.to(roomCode).emit("game:started", { room: publicRoom(room) });
        return;
      }

      await room.save();
      io.to(roomCode).emit("room:updated", { room: publicRoom(room) });
    } catch {
      socket.emit("room:error", { message: "Ready thất bại" });
    }
  });

  // ---------------------------
  // START (host-only, nếu bạn muốn manual start)
  // ---------------------------
  socket.on("room:start", async ({ roomCode }) => {
    try {
      const userId = socket.userId;
      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("room:error", { message: "Phòng không tồn tại" });

      if (room.hostId.toString() !== userId.toString()) {
        return socket.emit("room:error", { message: "Chỉ host được bắt đầu" });
      }
      if (room.players.length < 2) {
        return socket.emit("room:error", { message: "Chưa đủ 2 người" });
      }

      room.status = "playing";
      room.winner = null;
      room.xIsNext = true;
      room.turnStartedAt = new Date();

      await Move.deleteMany({ roomId: room._id }); // reset
      await room.save();

      io.to(roomCode).emit("room:updated", { room: publicRoom(room) });
      io.to(roomCode).emit("game:started", { room: publicRoom(room) });
    } catch {
      socket.emit("room:error", { message: "Start thất bại" });
    }
  });

  // ---------------------------
  // LEAVE ROOM
  // - host leave => đóng phòng
  // - O leave => reset waiting
  // ---------------------------
  socket.on("room:leave", async ({ roomCode }) => {
    try {
      const userId = socket.userId;
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      socket.leave(roomCode);

      const isHost = room.hostId.toString() === userId.toString();
      if (isHost) {
        await Move.deleteMany({ roomId: room._id });
        await Room.deleteOne({ _id: room._id });
        io.to(roomCode).emit("room:error", { message: "Host rời phòng, phòng bị đóng" });
        return;
      }

      const idx = room.players.findIndex((p) => p.userId.toString() === userId.toString());
      if (idx === -1) return;

      // remove player O
      room.players.splice(idx, 1);
      room.status = "waiting";
      room.winner = null;
      room.xIsNext = true;
      room.turnStartedAt = null;

      // reset ready của người còn lại
      room.players.forEach((p) => (p.isReady = false));

      await Move.deleteMany({ roomId: room._id }); // tuỳ bạn: giữ lại hay xoá
      await room.save();

      io.to(roomCode).emit("room:updated", { room: publicRoom(room) });
    } catch {
      // ignore
    }
  });

  // ---------------------------
  // DISCONNECT (tối thiểu)
  // ---------------------------
  socket.on("disconnect", async () => {
    // Tối giản: không quét toàn DB (tốn)
    // Thực tế: bạn track currentRoomCode theo socket.data.currentRoomCode để xử lý sạch hơn.
  });
}
