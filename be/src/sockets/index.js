import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

import { registerRoomHandlers } from "./room.handlers.js";
import { registerGameHandlers } from "./game.handlers.js";
import { registerChatHandlers } from "./chat.handlers.js";
import { registerMatchmakingHandlers } from "./matchmaking.handlers.js"; // ✅ đúng tên

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: ENV.CLIENT_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("UNAUTHORIZED"));
    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
    registerMatchmakingHandlers(io, socket); //   chơi ngay
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
  });

  return io;
}
