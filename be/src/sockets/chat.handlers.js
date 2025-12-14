export function registerChatHandlers(io, socket) {
  socket.on("chat:send", ({ roomCode, text }) => {
    io.to(roomCode).emit("chat:message", {
      from: socket.id,
      text,
      at: Date.now(),
    });
  });
}
