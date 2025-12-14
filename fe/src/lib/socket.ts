
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      transports: ["websocket"],
      auth: { token }, // BE đọc socket.handshake.auth.token
      autoConnect: true,
    });
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
