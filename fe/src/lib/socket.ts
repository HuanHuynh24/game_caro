// src/lib/socket.ts
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getSocket(): Socket {
  if (socket) return socket;

  const token = getToken();

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
    transports: ["websocket"],
    withCredentials: true,
    autoConnect: true,
    auth: {
      token, // ✅ BE đọc socket.handshake.auth.token
    },
  });

  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
