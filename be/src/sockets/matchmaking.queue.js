// src/sockets/matchmaking.queue.js

// item: { userId, socketId, joinedAt }
const queue = [];

export function mmHasUser(userId) {
  return queue.some((x) => String(x.userId) === String(userId));
}

export function mmEnqueue(userId, socketId) {
  if (mmHasUser(userId)) return false;
  queue.push({ userId, socketId, joinedAt: Date.now() });
  return true;
}

export function mmDequeue() {
  return queue.shift() || null;
}

export function mmRemoveBySocketId(socketId) {
  const idx = queue.findIndex((x) => x.socketId === socketId);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  return true;
}

export function mmRemoveByUserId(userId) {
  const idx = queue.findIndex((x) => String(x.userId) === String(userId));
  if (idx === -1) return false;
  queue.splice(idx, 1);
  return true;
}
