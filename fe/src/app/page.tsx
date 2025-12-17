"use client";

import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/Button";
import { Play } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { MatchmakingLoader } from "@/components/MatchmakingLoader";
import { JoinRoomModal } from "@/components/JoinRoomModal";
import { useRouter } from "next/navigation";

import type { Socket } from "socket.io-client";
import { getSocket, resetSocket } from "@/lib/socket";

type NextAction = "none" | "quick-play" | "create-room" | "join-room";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [nextAction, setNextAction] = useState<NextAction>("none");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  type LeaderUser = { _id: string; username: string; elo: number };

  const [leaderboard, setLeaderboard] = useState<LeaderUser[]>([]);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:4000";

  const router = useRouter();

  //  Socket nằm trong state để khi reset thì effect re-bind listeners
  const [socket, setSocket] = useState<Socket | null>(null);

  // init socket 1 lần khi mount
  useEffect(() => {
    const s = getSocket();
    setSocket(s);
  }, []);

  useEffect(() => {
    let alive = true;

    fetch(`${API_BASE}/api/users/leaderboard?limit=10`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setLeaderboard(Array.isArray(d?.users) ? d.users : []);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // Load user
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("user");
    if (raw) setCurrentUser(JSON.parse(raw));
  }, []);

  // ===== MATCHMAKING HELPERS =====
  const startMatchmaking = useCallback(() => {
    if (!socket) return;
    setRoomError(null);
    socket.emit("matchmaking:find"); //  quan trọng: emit bắt cặp
  }, [socket]);

  const cancelMatchmaking = useCallback(() => {
    if (!socket) return;
    socket.emit("matchmaking:cancel");
  }, [socket]);

  //  Khi mở loader => tự động tìm trận
  useEffect(() => {
    if (!socket) return;
    if (!isMatchmakingOpen) return;

    startMatchmaking();
  }, [socket, isMatchmakingOpen, startMatchmaking]);

  //  Socket listeners: room + matchmaking
  useEffect(() => {
    if (!socket) return;

    // ---------- ROOM (giữ nguyên) ----------
    const onRoomCreated = (payload: any) => {
      setRoomError(null);
      setJoinLoading(false);

      const roomCode = payload?.roomCode || payload?.room?.code;
      if (roomCode) router.push(`/room/${roomCode}`);
      else console.error("room:created missing roomCode", payload);
    };

    const onRoomJoined = (payload: any) => {
      setRoomError(null);
      setJoinLoading(false);

      const roomCode = payload?.roomCode || payload?.room?.code;
      if (roomCode) router.push(`/room/${roomCode}`);
      else console.error("room:joined missing roomCode", payload);
    };

    const onRoomError = ({ message }: any) => {
      setRoomError(message || "Room error");
      setJoinLoading(false);
      console.error("room:error", message);
    };

    // ---------- MATCHMAKING (mới) ----------
    const onMMWaiting = () => {
      // optional: bạn có thể set state hiển thị "đang tìm"
      // console.log("matchmaking:waiting");
    };

    const onMMMatched = (payload: any) => {
      const roomCode = payload?.roomCode;
      if (!roomCode) {
        setRoomError("Matchmaking matched nhưng thiếu roomCode");
        setIsMatchmakingOpen(false);
        return;
      }

      setIsMatchmakingOpen(false);

      //  VÀO TRẬN LUÔN
      // Nếu bạn có route game riêng: đổi thành router.replace(`/game/${roomCode}`)
      router.replace(`/room/${roomCode}`);
    };

    const onMMCanceled = () => {
      // console.log("matchmaking:canceled");
      setIsMatchmakingOpen(false);
    };

    const onMMError = ({ message }: any) => {
      setRoomError(message || "Matchmaking error");
      setIsMatchmakingOpen(false);
    };

    // bind
    socket.on("room:created", onRoomCreated);
    socket.on("room:joined", onRoomJoined);
    socket.on("room:error", onRoomError);

    socket.on("matchmaking:waiting", onMMWaiting);
    socket.on("matchmaking:matched", onMMMatched);
    socket.on("matchmaking:canceled", onMMCanceled);
    socket.on("matchmaking:error", onMMError);

    return () => {
      socket.off("room:created", onRoomCreated);
      socket.off("room:joined", onRoomJoined);
      socket.off("room:error", onRoomError);

      socket.off("matchmaking:waiting", onMMWaiting);
      socket.off("matchmaking:matched", onMMMatched);
      socket.off("matchmaking:canceled", onMMCanceled);
      socket.off("matchmaking:error", onMMError);
    };
  }, [socket, router]);

  // ===== ACTIONS =====
  const handlePlayNow = () => {
    setNextAction("quick-play");
    setRoomError(null);

    if (!currentUser) setIsModalOpen(true);
    else setIsMatchmakingOpen(true); //  mở loader -> effect sẽ emit matchmaking:find
  };

  const handleCreateRoom = () => {
    setNextAction("create-room");
    setRoomError(null);

    if (!currentUser) {
      setIsModalOpen(true);
      return;
    }

    socket?.emit("room:create");
  };

  const handleJoinRoom = () => {
    setNextAction("join-room");
    setRoomError(null);

    if (!currentUser) {
      setIsModalOpen(true);
      return;
    }

    setIsJoinRoomOpen(true);
  };

  const handleSubmitJoinCode = (roomCode: string) => {
    setIsJoinRoomOpen(false);
    setRoomError(null);
    setJoinLoading(true);

    socket?.emit("room:join", { roomCode });
  };

  // ===== AUTH SUCCESS =====
  const handleAuthSuccess = ({ user, token }: any) => {
    setCurrentUser(user);
    setIsModalOpen(false);

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);

    //  reset socket => tạo socket mới => setSocket để listeners gắn lại
    resetSocket();
    const s = getSocket();
    setSocket(s);

    if (nextAction === "quick-play") {
      setIsMatchmakingOpen(true); //  mở loader -> effect sẽ emit matchmaking:find
    } else if (nextAction === "create-room") {
      s.emit("room:create");
    } else if (nextAction === "join-room") {
      setIsJoinRoomOpen(true);
    }

    setNextAction("none");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    resetSocket();
    setSocket(getSocket());

    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans">
      <div className="absolute inset-0 z-0">
        <img
          src="https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/05/co-caro.jpg"
          alt="Game Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none" />
      </div>

      <nav className="relative z-20 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg rotate-45 flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <div className="w-3 h-3 bg-white rounded-full -rotate-45" />
          </div>
          <span className="text-2xl font-display font-bold text-white tracking-widest ml-2">
            NEON<span className="text-indigo-500">NEXUS</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && (
            <span className="text-sm text-slate-300">
              Xin chào{" "}
              <span className="font-semibold text-white">
                {currentUser.username}
              </span>
            </span>
          )}

          {currentUser ? (
            <Button variant="ghost" onClick={handleLogout}>
              LOGOUT
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setIsModalOpen(true)}>
              LOGIN
            </Button>
          )}
        </div>
      </nav>

      <main className="relative z-20 flex-grow flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {roomError && <p className="text-red-400">{roomError}</p>}

          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-widest mb-4">
            SEASON 5 IS LIVE
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-2xl">
            Caro Online <br />
            <span className="uppercase md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              Chơi Mọi Lúc, Thắng Mọi Nơi
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Chơi đối kháng trực tuyến, ghép trận nhanh, bảng xếp hạng cập nhật
            theo thời gian thực.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handlePlayNow} icon={<Play />}>
              CHƠI NGAY
            </Button>

            <Button variant="secondary" onClick={handleCreateRoom}>
              CHƠI CÙNG BẠN
            </Button>

            <Button variant="secondary" onClick={handleJoinRoom}>
              THAM GIA PHÒNG
            </Button>
          </div>

          {/* LEADERBOARD */}
          <div className="max-w-2xl mx-auto mt-10 mb-24 text-left">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Leaderboard
                  </div>
                  <div className="text-white font-semibold mt-1">
                    Top người chơi ELO cao nhất
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold tracking-widest">
                  RANKED
                </div>
              </div>

              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 italic py-6">
                    Chưa có dữ liệu xếp hạng
                  </div>
                ) : (
                  leaderboard.map((u, i) => (
                    <div
                      key={u._id}
                      className={[
                        "flex items-center justify-between px-4 py-3 rounded-xl border transition",
                        i === 0
                          ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.22)]"
                          : "bg-slate-950/30 border-slate-800 hover:bg-slate-800/30",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={[
                            "w-8 text-center font-mono text-xs font-bold",
                            i === 0 ? "text-amber-400" : "text-slate-500",
                          ].join(" ")}
                        >
                          #{i + 1}
                        </span>

                        <span className="text-sm text-slate-200 font-semibold truncate">
                          {u.username}
                        </span>
                      </div>

                      <span className="text-sm font-mono font-bold text-indigo-400">
                        {u.elo}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 text-[11px] text-slate-500 font-mono">
                Tip: Chơi “CHƠI NGAY” để được tính ELO (ranked).
              </div>
            </div>
          </div>
        </div>
      </main>

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNextAction("none");
        }}
        onAuthSuccess={handleAuthSuccess}
      />

      <MatchmakingLoader
        isOpen={isMatchmakingOpen}
        onCancel={() => {
          cancelMatchmaking(); //  hủy tìm trận
          setIsMatchmakingOpen(false);
        }}
      />

      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        onSubmitRoomCode={handleSubmitJoinCode}
        error={roomError}
        loading={joinLoading}
      />
    </div>
  );
}
