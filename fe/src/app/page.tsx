"use client";

import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/Button";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
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

  const router = useRouter();

  // ✅ Socket nằm trong state để khi reset thì effect re-bind listeners
  const [socket, setSocket] = useState<Socket | null>(null);

  // init socket 1 lần khi mount
  useEffect(() => {
    const s = getSocket();
    setSocket(s);
  }, []);

  // Load user
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("user");
    if (raw) setCurrentUser(JSON.parse(raw));
  }, []);

  // ✅ Socket listeners: luôn attach theo socket hiện tại
  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (payload: any) => {
      setRoomError(null);
      setJoinLoading(false);

      // BE của bạn trả roomCode (không có roomId)
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

    socket.on("room:created", onRoomCreated);
    socket.on("room:joined", onRoomJoined);
    socket.on("room:error", onRoomError);

    return () => {
      socket.off("room:created", onRoomCreated);
      socket.off("room:joined", onRoomJoined);
      socket.off("room:error", onRoomError);
    };
  }, [socket, router]);

  // ===== ACTIONS =====

  const handlePlayNow = () => {
    setNextAction("quick-play");
    setRoomError(null);

    if (!currentUser) setIsModalOpen(true);
    else setIsMatchmakingOpen(true);
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

    // ✅ reset socket => tạo socket mới => setSocket để listeners gắn lại
    resetSocket();
    const s = getSocket();
    setSocket(s);

    if (nextAction === "quick-play") {
      setIsMatchmakingOpen(true);
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
      {/* UI của bạn giữ nguyên... */}
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
        onCancel={() => setIsMatchmakingOpen(false)}
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
