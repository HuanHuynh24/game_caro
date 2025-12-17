import Room from "../models/Room.js";
import User from "../models/User.js";
import { calcEloDelta } from "../utils/elo.js";

export const TURN_SECONDS = 30;

// roomCode -> Timeout
const timers = new Map();

export function clearTurnTimer(roomCode) {
  const t = timers.get(roomCode);
  if (t) clearTimeout(t);
  timers.delete(roomCode);
}

/**
 * Start timer cho lượt hiện tại dựa trên room.turnStartedAt
 * - Nếu hết giờ: người đang tới lượt sẽ thua
 */
export async function startTurnTimer(io, roomCode) {
  clearTurnTimer(roomCode);

  // đọc room để tính remaining từ turnStartedAt
  const room = await Room.findOne({ code: roomCode })
    .populate("players.userId", "username elo") // ✅
    .populate("hostId", "username elo");

  if (!room) return;
  if (room.status !== "playing" || room.winner) return;

  const startedAt = room.turnStartedAt
    ? new Date(room.turnStartedAt).getTime()
    : Date.now();
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = Math.max(0, TURN_SECONDS * 1000 - elapsedMs);

  const t = setTimeout(async () => {
    try {
      const room2 = await Room.findOne({ code: roomCode })
        .populate("players.userId", "username elo") // ✅
        .populate("hostId", "username elo");

      if (!room2) return;
      if (room2.status !== "playing" || room2.winner) return;

      const loserSymbol = room2.xIsNext ? "X" : "O";
      const winnerSymbol = loserSymbol === "X" ? "O" : "X";

      const px = room2.players.find((p) => p.symbol === "X");
      const po = room2.players.find((p) => p.symbol === "O");

      let eloChange = null;

      if (px && po) {
        const xId = uid(px.userId);
        const oId = uid(po.userId);

        const [ux, uo] = await Promise.all([
          User.findById(xId).select("elo").lean(),
          User.findById(oId).select("elo").lean(),
        ]);

        const scoreX = winnerSymbol === "X" ? 1 : 0;
        const deltaX = calcEloDelta(ux.elo, uo.elo, scoreX);
        const deltaO = -deltaX;

        await Promise.all([
          User.updateOne({ _id: xId }, { $inc: { elo: deltaX } }),
          User.updateOne({ _id: oId }, { $inc: { elo: deltaO } }),
        ]);

        eloChange = {
          X: { userId: xId, delta: deltaX },
          O: { userId: oId, delta: deltaO },
        };
      }

      room2.winner = winnerSymbol;
      room2.status = "finished";
      room2.turnStartedAt = null;

      // ✅ reset ready để rematch bắt buộc 2 người ready lại
      room2.players.forEach((p) => (p.isReady = false));

      await room2.save();

      io.to(roomCode).emit("game:ended", {
        room: {
          id: room2._id,
          code: room2.code,
          hostId: room2.hostId?._id ?? room2.hostId,
          status: room2.status,
          boardSize: room2.boardSize,
          winLength: room2.winLength,
          xIsNext: room2.xIsNext,
          winner: room2.winner,
          players: room2.players.map((p) => ({
            userId: p.userId?._id ?? p.userId,
            username: p.userId?.username ?? null,
            symbol: p.symbol,
            isReady: p.isReady,
          })),
          turnStartedAt: room2.turnStartedAt,
          createdAt: room2.createdAt,
          updatedAt: room2.updatedAt,
        },
        winner: winnerSymbol,
        winningLine: null,
        lastMove: null,
        reason: "timeout",
        loser: loserSymbol,
        turnSeconds: TURN_SECONDS,
        eloChange,
      });

      clearTurnTimer(roomCode);
    } catch (e) {
      // ignore
    }
  }, remainingMs);

  timers.set(roomCode, t);
}
