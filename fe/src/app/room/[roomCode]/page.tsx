"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

// ================= TYPES =================
type Player = {
  userId: string;
  symbol: "X" | "O";
  isReady: boolean;
};

type RoomState = {
  code: string;
  status: "waiting" | "ready" | "playing" | "finished";
  hostId: string;
  players: Player[];
};

export default function RoomLobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const socket = useMemo(() => getSocket(), []);

  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ===== CURRENT USER =====
  const userId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u._id || u.id || u.userId || null;
    } catch {
      return null;
    }
  }, []);

  const me = room?.players?.find(
    (p) => String(p.userId) === String(userId)
  );

  const isHost = room?.hostId === userId;

  // ===== SOCKET =====
  useEffect(() => {
    if (!roomCode) return;

    socket.emit("room:sync", { roomCode });

    const onRoomUpdated = ({ room }: any) => {
      setRoom(room);
      setError(null);

      // nếu game start thì chuyển sang game page
      if (room.status === "playing") {
        router.replace(`/game/${room.code}`);
      }
    };

    const onRoomError = ({ message }: any) => {
      setError(message || "Room error");
    };

    socket.on("room:updated", onRoomUpdated);
    socket.on("room:error", onRoomError);

    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:error", onRoomError);
    };
  }, [roomCode, socket, router]);

  // ===== ACTIONS =====
  const toggleReady = () => {
    if (!me) return;
    socket.emit("room:ready", {
      roomCode,
      ready: !me.isReady,
    });
  };

  const startGame = () => {
    socket.emit("room:start", { roomCode });
  };

  const leaveRoom = () => {
    socket.emit("room:leave", { roomCode });
    router.replace("/");
  };

  // ===== UI =====
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[420px] space-y-4">
        <h2 className="text-xl font-bold text-center">
          ROOM <span className="font-mono">{roomCode}</span>
        </h2>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="space-y-2">
          {room?.players?.map((p) => (
            <div
              key={p.userId}
              className="flex justify-between bg-slate-800 p-2 rounded"
            >
              <span>
                Player {p.symbol} {p.userId === userId && "(You)"}
              </span>
              <span
                className={p.isReady ? "text-green-400" : "text-yellow-400"}
              >
                {p.isReady ? "READY" : "WAITING"}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          {me && (
            <button
              onClick={toggleReady}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded py-2"
            >
              {me.isReady ? "UNREADY" : "READY"}
            </button>
          )}

          {isHost && room?.players?.length === 2 && (
            <button
              onClick={startGame}
              className="flex-1 bg-green-600 hover:bg-green-700 rounded py-2"
            >
              START
            </button>
          )}
        </div>

        <button
          onClick={leaveRoom}
          className="w-full text-sm text-red-400 hover:underline"
        >
          Leave room
        </button>
      </div>
    </div>
  );
}
