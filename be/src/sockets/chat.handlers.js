import Room from "../models/Room.js";
import User from "../models/User.js";
import ChatMessage from "../models/ChatMessage.js";

function isMember(room, userId) {
  return room.players.some((p) => p.userId.toString() === userId.toString());
}

function getSymbol(room, userId) {
  const p = room.players?.find(
    (x) => x.userId.toString() === userId.toString()
  );
  return p?.symbol || null;
}

export function registerChatHandlers(io, socket) {
  socket.on("chat:send", async ({ roomCode, text }) => {
    try {
      const userId = socket.userId;
      const clean = (text || "").trim();
      if (!roomCode)
        return socket.emit("room:error", { message: "Thiếu roomCode" });
      if (!clean) return;
      if (clean.length > 500)
        return socket.emit("room:error", {
          message: "Tin nhắn quá dài (max 500 ký tự)",
        });

      const room = await Room.findOne({ code: roomCode }).lean();
      if (!room)
        return socket.emit("room:error", { message: "Phòng không tồn tại" });
      if (!isMember(room, userId))
        return socket.emit("room:error", { message: "Bạn không thuộc phòng" });

      const senderSymbol = getSymbol(room, userId);
      if (!senderSymbol)
        return socket.emit("room:error", {
          message: "Không xác định được quân của bạn",
        });

      const user = await User.findById(userId).select("_id username").lean();
      const username = user?.username || "Unknown";

      const msg = await ChatMessage.create({
        roomCode,
        userId,
        username,
        text: clean,
      });

      io.to(roomCode).emit("chat:message", {
        id: msg._id,
        roomCode,
        sender: senderSymbol,
        from: { userId, username },
        text: msg.text,
        at: msg.createdAt,
      });
    } catch {
      socket.emit("room:error", { message: "Gửi chat thất bại" });
    }
  });

  socket.on("chat:history", async ({ roomCode, limit = 30 }) => {
    try {
      const userId = socket.userId;
      const room = await Room.findOne({ code: roomCode }).lean();
      if (!room)
        return socket.emit("room:error", { message: "Phòng không tồn tại" });
      if (!isMember(room, userId))
        return socket.emit("room:error", { message: "Bạn không thuộc phòng" });

      const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));

      const messages = await ChatMessage.find({ roomCode })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();

      socket.emit("chat:history", {
        roomCode,
        messages: messages.reverse().map((m) => ({
          id: m._id,
          roomCode: m.roomCode,
          sender: getSymbol(room, m.userId),
          from: { userId: m.userId, username: m.username },
          text: m.text,
          at: m.createdAt,
        })),
      });
    } catch {
      socket.emit("room:error", { message: "Không lấy được lịch sử chat" });
    }
  });
}
