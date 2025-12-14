import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

import { registerRoomHandlers } from "./room.handlers.js";
import { registerGameHandlers } from "./game.handlers.js";
import { registerChatHandlers } from "./chat.handlers.js";

/**
 * Attach Socket.IO server vào HTTP server
 * - Auth socket bằng JWT (lấy từ client auth.token)
 * - Gắn socket.userId để dùng xuyên suốt handlers
 */
export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ENV.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  // ===============================
  // Socket Authentication (JWT)
  // ===============================
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("UNAUTHORIZED"));
    }

    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET);

      // gắn userId vào socket để handlers dùng
      socket.userId = payload.userId;

      next();
    } catch (err) {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  // ===============================
  // Connection
  // ===============================
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.userId);

    // Đăng ký handlers
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);

    // Optional: ping/pong để test
    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", socket.userId, reason);
    });
  });

  return io;
}
