"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

// ================= TYPES =================
// BE có thể trả player.userId = string hoặc object (khi populate)
type PlayerUser = string | { _id?: string; id?: string; userId?: string; username?: string };

type Player = {
  userId: PlayerUser;
  symbol: "X" | "O";
  isReady: boolean;
  username?: string | null; // optional nếu BE đã gửi sẵn
};

type RoomState = {
  code: string;
  status: "waiting" | "ready" | "playing" | "finished";
  hostId: string | { _id?: string; id?: string; userId?: string; username?: string };
  players: Player[];
};

function getId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v._id || v.id || v.userId || null;
}

function getUsername(p: Player): string | null {
  // ưu tiên p.username nếu BE map ra
  if (p.username) return p.username;

  // nếu BE populate players.userId
  const u = p.userId as any;
  if (u && typeof u === "object" && u.username) return u.username;

  return null;
}

function shortId(id: string | null, left = 6, right = 4) {
  if (!id) return "—";
  if (id.length <= left + right) return id;
  return `${id.slice(0, left)}…${id.slice(-right)}`;
}

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

  const myPlayer = useMemo(() => {
    if (!room?.players?.length || !userId) return null;
    return room.players.find((p) => String(getId(p.userId)) === String(userId)) || null;
  }, [room?.players, userId]);

  const hostId = useMemo(() => getId(room?.hostId), [room?.hostId]);
  const isHost = !!userId && !!hostId && String(hostId) === String(userId);

  // ===== SOCKET =====
  useEffect(() => {
    if (!roomCode) return;

    socket.emit("room:sync", { roomCode });

    const onRoomUpdated = ({ room }: any) => {
      setRoom(room);
      setError(null);

      // nếu game start thì chuyển sang game page
      if (room?.status === "playing") {
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
    if (!myPlayer) return;
    socket.emit("room:ready", { roomCode, ready: !myPlayer.isReady });
  };

  const startGame = () => {
    socket.emit("room:start", { roomCode });
  };

  const leaveRoom = () => {
    socket.emit("room:leave", { roomCode });
    router.replace("/");
  };

  const canStart = isHost && room?.players?.length === 2 && room?.players?.every((p) => p.isReady);

  // ===== UI =====
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              ROOM <span className="font-mono text-indigo-300">{roomCode}</span>
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              status: <span className="font-mono text-slate-200">{room?.status ?? "—"}</span>
              {"  "}•{"  "}
              players: <span className="font-mono text-slate-200">{room?.players?.length ?? 0}/2</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!roomCode) return;
              navigator.clipboard?.writeText(String(roomCode));
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition"
          >
            COPY CODE
          </button>
        </div>

        {error && (
          <div className="text-red-300 text-sm bg-red-950/30 border border-red-900/40 rounded-lg p-3">
            {error}
          </div>
        )}

        {!userId && (
          <div className="text-yellow-300 text-sm bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-3">
            Bạn chưa login (không có userId trong localStorage). Hãy login trước khi Ready/Start.
          </div>
        )}

        {/* Players list */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Players
          </div>

          {(room?.players?.length ? room.players : []).map((p) => {
            const pid = getId(p.userId);
            const uname = getUsername(p);
            const isMe = !!userId && !!pid && String(pid) === String(userId);
            const isHostPlayer = !!hostId && !!pid && String(pid) === String(hostId);

            const badgeColor =
              p.symbol === "X" ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20";

            return (
              <div
                key={`${p.symbol}-${pid ?? Math.random()}`}
                className="flex items-center justify-between gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeColor}`}>
                    {p.symbol}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-semibold truncate">
                        {uname ?? `User ${shortId(pid)}`}
                      </div>

                      {isHostPlayer && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                          HOST
                        </span>
                      )}

                      {isMe && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 font-mono truncate">
                      id: {pid ? pid : "—"}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={[
                      "text-xs font-bold px-2.5 py-1 rounded-lg border",
                      p.isReady
                        ? "text-green-300 bg-green-500/10 border-green-500/20"
                        : "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
                    ].join(" ")}
                  >
                    {p.isReady ? "READY" : "WAITING"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Placeholder nếu thiếu người */}
          {(!room?.players || room.players.length < 2) && (
            <div className="border border-dashed border-slate-700 rounded-xl p-3 text-sm text-slate-400 bg-slate-900/40">
              Đang chờ người chơi còn lại vào phòng…
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={toggleReady}
            disabled={!myPlayer}
            className={[
              "py-2.5 rounded-xl font-semibold border transition",
              myPlayer
                ? myPlayer.isReady
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-750"
                  : "bg-indigo-600 border-indigo-500/30 hover:bg-indigo-500"
                : "bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed",
            ].join(" ")}
          >
            {myPlayer ? (myPlayer.isReady ? "UNREADY" : "READY") : "READY"}
          </button>

          <button
            onClick={startGame}
            disabled={!isHost || !canStart}
            className={[
              "py-2.5 rounded-xl font-semibold border transition",
              isHost && canStart
                ? "bg-emerald-600 border-emerald-500/30 hover:bg-emerald-500"
                : "bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed",
            ].join(" ")}
            title={
              !isHost
                ? "Chỉ host mới được Start"
                : !canStart
                ? "Cần đủ 2 người và cả hai READY"
                : ""
            }
          >
            START
          </button>
        </div>

        <button
          onClick={leaveRoom}
          className="w-full text-sm text-red-300 hover:text-red-200 hover:underline pt-1"
        >
          Leave room
        </button>
      </div>
    </div>
  );
}
