// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { getSocket } from "@/lib/socket";
// import { BOARD_SIZE } from "@/interface/type";

// type Player = { userId: string; symbol: "X" | "O" };

// type RoomState = {
//   code: string;
//   status: "playing" | "finished";
//   xIsNext: boolean;
//   winner: "X" | "O" | "draw" | null;
//   boardSize: number;
//   players: Player[];
// };

// type Move = { x: number; y: number; symbol: "X" | "O"; at: string };

// // BE sẽ gửi dạng [{x,y}] hoặc [idx] — mình hỗ trợ cả 2
// type WinningLine = Array<{ x: number; y: number }> | number[] | null;

// export default function GamePage() {
//   const { roomCode } = useParams<{ roomCode: string }>();
//   const router = useRouter();
//   const socket = useMemo(() => getSocket(), []);

//   const [room, setRoom] = useState<RoomState | null>(null);
//   const [moves, setMoves] = useState<Move[]>([]);
//   const [timers, setTimers] = useState({ X: 600, O: 600 });
//   const [winningLineIdx, setWinningLineIdx] = useState<number[] | null>(null);

//   const timerRef = useRef<NodeJS.Timeout | null>(null);

//   const userId = useMemo(() => {
//     if (typeof window === "undefined") return null;
//     try {
//       const raw = localStorage.getItem("user");
//       if (!raw) return null;
//       const u = JSON.parse(raw);
//       return u._id || u.id || u.userId || null;
//     } catch {
//       return null;
//     }
//   }, []);

//   const boardSize = room?.boardSize ?? BOARD_SIZE;

//   const squares = useMemo(() => {
//     const arr = Array(boardSize * boardSize).fill(null) as (null | "X" | "O")[];
//     for (const m of moves) arr[m.y * boardSize + m.x] = m.symbol;
//     return arr;
//   }, [moves, boardSize]);

//   const normalizeWinningLine = (wl: WinningLine): number[] | null => {
//     if (!wl) return null;
//     if (Array.isArray(wl) && wl.length === 0) return null;

//     // case: [idx, idx, ...]
//     if (Array.isArray(wl) && typeof wl[0] === "number") return wl as number[];

//     // case: [{x,y}, ...]
//     if (Array.isArray(wl) && typeof wl[0] === "object") {
//       return (wl as Array<{ x: number; y: number }>).map(
//         (p) => p.y * boardSize + p.x
//       );
//     }
//     return null;
//   };

//   // ================= SOCKET =================
//   useEffect(() => {
//     if (!roomCode) return;

//     socket.emit("room:sync", { roomCode });
//     socket.emit("game:moves", { roomCode });

//     const onRoomUpdated = ({ room }: any) => {
//       setRoom(room);

//       // Khi server chuyển finished => giữ lại winner/line một chút rồi quay lobby
//       if (room.status === "finished") {
//         setTimeout(() => router.replace(`/room/${room.code}`), 1500);
//       }
//     };

//     const onGameMoves = ({ moves }: any) => {
//       setMoves(moves || []);
//       // ván mới / sync mới => clear line (nếu đang playing)
//       if (room?.status === "playing") setWinningLineIdx(null);
//     };

//     const onGameMoved = ({ lastMove, room, winningLine }: any) => {
//       if (lastMove) setMoves((prev) => [...prev, lastMove]);
//       if (room) setRoom(room);

//       // Một số BE emit line ngay khi kết thúc ở game:moved
//       const idxs = normalizeWinningLine(winningLine ?? null);
//       if (idxs) setWinningLineIdx(idxs);
//     };

//     const onGameEnded = ({ room, winningLine, lastMove }: any) => {
//       setRoom(room);
//       setWinningLineIdx(normalizeWinningLine(winningLine ?? null));

//       // ✅ add nước cuối để vẽ được quân thắng (ô thứ 5)
//       if (lastMove) {
//         setMoves((prev) => {
//           const existed = prev.some(
//             (m) => m.x === lastMove.x && m.y === lastMove.y
//           );
//           return existed ? prev : [...prev, lastMove];
//         });

//         // (optional) highlight last move nếu bạn có state
//         // setLastMoveIndex(lastMove.y * boardSize + lastMove.x);
//       }
//     };

//     socket.on("room:updated", onRoomUpdated);
//     socket.on("game:moves", onGameMoves);
//     socket.on("game:moved", onGameMoved);
//     socket.on("game:ended", onGameEnded);

//     return () => {
//       socket.off("room:updated", onRoomUpdated);
//       socket.off("game:moves", onGameMoves);
//       socket.off("game:moved", onGameMoved);
//       socket.off("game:ended", onGameEnded);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [roomCode, socket, router, boardSize]);

//   // ================= TIMER =================
//   useEffect(() => {
//     if (!room || room.status !== "playing") return;

//     if (timerRef.current) clearInterval(timerRef.current);

//     timerRef.current = setInterval(() => {
//       setTimers((prev) => {
//         const p = room.xIsNext ? "X" : "O";
//         return { ...prev, [p]: Math.max(0, prev[p] - 1) };
//       });
//     }, 1000);

//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//   }, [room?.xIsNext, room?.status]);

//   // ================= MOVE =================
//   const handleMove = (idx: number) => {
//     if (!room || room.status !== "playing") return;
//     if (!userId) return;
//     if (squares[idx]) return;

//     const x = idx % boardSize;
//     const y = Math.floor(idx / boardSize);
//     socket.emit("game:move", { roomCode, x, y });
//   };

//   return (
//     <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
//       <h2 className="text-lg font-bold">
//         GAME ROOM <span className="font-mono">{roomCode}</span>
//       </h2>

//       <div className="flex gap-4 text-sm">
//         <span>X: {timers.X}s</span>
//         <span>O: {timers.O}s</span>
//       </div>

//       <div
//         className="grid border border-slate-600"
//         style={{ gridTemplateColumns: `repeat(${boardSize}, 32px)` }}
//       >
//         {squares.map((v, i) => {
//           const isWin = winningLineIdx?.includes(i) ?? false;
//           return (
//             <div
//               key={i}
//               onClick={() => handleMove(i)}
//               className={[
//                 "w-8 h-8 border border-slate-700 flex items-center justify-center",
//                 room?.status === "playing" && !v
//                   ? "cursor-pointer hover:bg-slate-800"
//                   : "",
//                 isWin ? "bg-emerald-500/30 ring-2 ring-emerald-400" : "",
//               ].join(" ")}
//             >
//               {v}
//             </div>
//           );
//         })}
//       </div>

//       {room?.winner && (
//         <div className="text-lg font-bold text-green-400">
//           {room.winner === "draw" ? "DRAW" : `WINNER: PLAYER ${room.winner}`}
//         </div>
//       )}

//       <button
//         onClick={() => {
//           socket.emit("room:leave", { roomCode });
//           router.replace("/");
//         }}
//         className="text-red-400 text-sm"
//       >
//         Leave game
//       </button>
//     </div>
//   );
// }


"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BOARD_SIZE, ChatMessage, MoveLog } from "@/interface/type";
import { PlayerCard } from "@/components/PlayerCard";
import { Chat } from "@/components/Chat";
import { Modal } from "@/components/Modal";
import { Square } from "@/components/Square";

// ================= TYPES =================
type Player = { userId: string; symbol: "X" | "O" };

type RoomState = {
  code: string;
  status: "playing" | "finished";
  xIsNext: boolean;
  winner: "X" | "O" | "draw" | null;
  boardSize: number;
  players: Player[];
};

type Move = { x: number; y: number; symbol: "X" | "O"; at: string };

// BE sẽ gửi dạng [{x,y}] hoặc [idx]
type WinningLine = Array<{ x: number; y: number }> | number[] | null;

export default function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const socket = useMemo(() => getSocket(), []);

  const [room, setRoom] = useState<RoomState | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [timers, setTimers] = useState({ X: 600, O: 600 });
  const [winningLineIdx, setWinningLineIdx] = useState<number[] | null>(null);

  // UI-only state (không ảnh hưởng socket)
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [moveLogs, setMoveLogs] = useState<MoveLog[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const moveLockRef = useRef(false);

  // ===== USER =====
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

  const boardSize = room?.boardSize ?? BOARD_SIZE;

  const squares = useMemo(() => {
    const arr = Array(boardSize * boardSize).fill(null) as (null | "X" | "O")[];
    for (const m of moves) arr[m.y * boardSize + m.x] = m.symbol;
    return arr;
  }, [moves, boardSize]);

  const normalizeWinningLine = (wl: WinningLine): number[] | null => {
    if (!wl) return null;
    if (Array.isArray(wl) && wl.length === 0) return null;

    // case: [idx, idx, ...]
    if (Array.isArray(wl) && typeof wl[0] === "number") return wl as number[];

    // case: [{x,y}, ...]
    if (Array.isArray(wl) && typeof wl[0] === "object") {
      return (wl as Array<{ x: number; y: number }>).map((p) => p.y * boardSize + p.x);
    }
    return null;
  };

  // Convert column index to label (A, B, ..., AA)
  const getColLabel = (index: number) => {
    let label = "";
    index++;
    while (index > 0) {
      const remainder = (index - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      index = Math.floor((index - 1) / 26);
    }
    return label;
  };

  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "System", text, timestamp: new Date() },
    ]);
  }, []);

  // ================= SOCKET (GIỮ NGUYÊN LOGIC) =================
  useEffect(() => {
    if (!roomCode) return;

    socket.emit("room:sync", { roomCode });
    socket.emit("game:moves", { roomCode });

    const onRoomUpdated = ({ room }: any) => {
      setRoom(room);

      if (room.status === "finished") {
        setTimeout(() => router.replace(`/room/${room.code}`), 1500);
      }
    };

    const onGameMoves = ({ moves }: any) => {
      const list: Move[] = moves || [];
      setMoves(list);

      // rebuild logs (UI only)
      const logs: MoveLog[] = list.map((m, i) => ({
        step: i + 1,
        player: m.symbol,
        row: m.y + 1,
        col: m.x + 1,
        timestamp: new Date(m.at).toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      setMoveLogs(logs);

      if (list.length) {
        const last = list[list.length - 1];
        setLastMoveIndex(last.y * boardSize + last.x);
      } else setLastMoveIndex(null);

      if (room?.status === "playing") setWinningLineIdx(null);
    };

    const onGameMoved = ({ lastMove, room, winningLine }: any) => {
      if (lastMove) {
        setMoves((prev) => [...prev, lastMove]);

        setMoveLogs((prev) => [
          ...prev,
          {
            step: prev.length + 1,
            player: lastMove.symbol,
            row: lastMove.y + 1,
            col: lastMove.x + 1,
            timestamp: new Date(lastMove.at).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        setLastMoveIndex(lastMove.y * boardSize + lastMove.x);
      }
      if (room) setRoom(room);

      const idxs = normalizeWinningLine(winningLine ?? null);
      if (idxs) setWinningLineIdx(idxs);
    };

    const onGameEnded = ({ room, winningLine, lastMove, winner }: any) => {
      setRoom(room);
      setWinningLineIdx(normalizeWinningLine(winningLine ?? null));

      // ✅ add last move để vẽ được quân thắng
      if (lastMove) {
        setMoves((prev) => {
          const existed = prev.some((m) => m.x === lastMove.x && m.y === lastMove.y);
          return existed ? prev : [...prev, lastMove];
        });
        setLastMoveIndex(lastMove.y * boardSize + lastMove.x);

        setMoveLogs((prev) => {
          const step = prev.length + 1;
          // tránh add trùng nếu server đã gửi moves rồi (best-effort)
          const existed = prev.some((l) => l.step === step && l.row === lastMove.y + 1 && l.col === lastMove.x + 1);
          if (existed) return prev;
          return [
            ...prev,
            {
              step,
              player: lastMove.symbol,
              row: lastMove.y + 1,
              col: lastMove.x + 1,
              timestamp: new Date(lastMove.at).toLocaleTimeString([], {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ];
        });
      }

      // UI score (không ảnh hưởng logic)
      if (winner === "X" || winner === "O") {
        setScores((prev) => ({ ...prev, [winner]: prev[winner] + 1 }));
      }
    };

    socket.on("room:updated", onRoomUpdated);
    socket.on("game:moves", onGameMoves);
    socket.on("game:moved", onGameMoved);
    socket.on("game:ended", onGameEnded);

    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("game:moves", onGameMoves);
      socket.off("game:moved", onGameMoved);
      socket.off("game:ended", onGameEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, socket, router, boardSize]);

  // ================= TIMER (GIỮ NGUYÊN LOGIC) =================
  useEffect(() => {
    if (!room || room.status !== "playing") return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimers((prev) => {
        const p = room.xIsNext ? "X" : "O";
        return { ...prev, [p]: Math.max(0, prev[p] - 1) };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.xIsNext, room?.status]);

  // ===== Center board on load (UI only) =====
  useEffect(() => {
    if (!boardRef.current) return;
    const cell = 32;
    const centerOffset = (boardSize * cell) / 2 - boardRef.current.clientWidth / 2;
    boardRef.current.scrollTo({ top: centerOffset, left: centerOffset, behavior: "auto" });
  }, [boardSize]);

  // ================= CHAT (UI/Socket send) =================
  const handleSendMessage = (text: string) => {
    const t = (text || "").trim();
    if (!t || !roomCode) return;
    socket.emit("chat:send", { roomCode, text: t });
    // UI local echo (tuỳ bạn muốn giữ/không)
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "Me", text: t, timestamp: new Date() },
    ]);
  };

  // ================= MOVE (GIỮ NGUYÊN LOGIC) =================
  const handleSquareClick = useCallback(
    (idx: number) => {
      if (!room || room.status !== "playing") return;
      if (!userId) return;
      if (squares[idx]) return;

      if (moveLockRef.current) return;
      moveLockRef.current = true;

      const x = idx % boardSize;
      const y = Math.floor(idx / boardSize);
      socket.emit("game:move", { roomCode, x, y });

      window.setTimeout(() => {
        moveLockRef.current = false;
      }, 250);
    },
    [room, userId, squares, boardSize, socket, roomCode]
  );

  const leaveRoom = () => {
    socket.emit("room:leave", { roomCode });
    router.replace("/");
  };

  // ===== Player display =====
  const pX = room?.players?.find((p) => p.symbol === "X");
  const pO = room?.players?.find((p) => p.symbol === "O");

  const nameX = pX?.userId ? "Player X" : "Waiting...";
  const nameO = pO?.userId ? "Player O" : "Waiting...";

  const currentPlayer = room?.xIsNext ? "X" : "O";

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* --- Navbar --- */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg rotate-45 flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <div className="w-3 h-3 bg-white rounded-full -rotate-45" />
          </div>
          <div>
            <span className="text-2xl font-display font-bold text-white tracking-widest ml-2">
              NEON<span className="text-indigo-500">NEXUS</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-green-600/10 text-green-400 hover:bg-green-600/20 border border-green-600/30 rounded text-xs font-bold uppercase tracking-wider transition-all">
            Online: {room?.players?.length ?? 0}
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <span className="text-xs text-slate-400">GS</span>
          </div>
        </div>
      </header>

      {/* --- Main Grid Layout --- */}
      <main className="flex-grow grid grid-cols-1 xl:grid-cols-[300px_1fr_350px] overflow-hidden">
        {/* --- Left Panel: Player Stats --- */}
        <aside className="bg-slate-900/30 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
            Players
          </div>

          <PlayerCard
            player="X"
            name={nameX}
            elo={1450}
            isActive={!!room?.xIsNext && room?.status === "playing" && !room?.winner}
            score={scores.X}
            winner={room?.winner === "draw" ? "Draw" : (room?.winner as any)}
            timeRemaining={timers.X}
          />

          <div className="flex items-center gap-4 my-2 opacity-50">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
            <span className="text-slate-500 text-xs font-mono">VS</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
          </div>

          <PlayerCard
            player="O"
            name={nameO}
            elo={1380}
            isActive={!room?.xIsNext && room?.status === "playing" && !room?.winner}
            score={scores.O}
            winner={room?.winner === "draw" ? "Draw" : (room?.winner as any)}
            timeRemaining={timers.O}
          />

          <div className="mt-auto pt-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 mb-2 font-semibold">
                ROOM CODE
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-sm font-mono tracking-widest text-slate-300">
                  {roomCode || "—"}
                </span>
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                  onClick={() => {
                    if (!roomCode) return;
                    navigator.clipboard?.writeText(String(roomCode));
                    addSystemMessage("Copied room code.");
                  }}
                >
                  COPY
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 font-mono">
                status: {room?.status ?? "—"} • turn: {currentPlayer}
              </div>

              {!userId && (
                <div className="mt-2 text-xs text-red-400">
                  Chưa có userId (hãy login).
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* --- Center Panel: The Board --- */}
        <section className="relative bg-[#0b1121] flex flex-col overflow-hidden">
          <div
            ref={boardRef}
            className="flex-grow overflow-auto custom-scrollbar flex items-center justify-center p-10 relative"
            style={{
              backgroundImage: "radial-gradient(circle at center, #1e293b 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          >
            <div className="relative bg-slate-900/80 p-6 rounded-lg shadow-2xl border border-slate-800 backdrop-blur-sm">
              {/* Column Labels (Top) */}
              <div className="flex mb-2 pl-8">
                {Array.from({ length: boardSize }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 sm:w-8 text-center text-[10px] text-slate-600 font-mono select-none"
                  >
                    {getColLabel(i)}
                  </div>
                ))}
              </div>

              <div className="flex">
                {/* Row Labels (Left) */}
                <div className="flex flex-col mr-2">
                  {Array.from({ length: boardSize }).map((_, i) => (
                    <div
                      key={i}
                      className="h-7 sm:h-8 flex items-center justify-end pr-2 text-[10px] text-slate-600 font-mono select-none w-6"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div
                  className="grid bg-slate-800/50 border border-slate-700"
                  style={{ gridTemplateColumns: `repeat(${boardSize}, min-content)` }}
                >
                  {squares.map((val, idx) => (
                    <Square
                      key={idx}
                      value={val}
                      onClick={() => handleSquareClick(idx)}
                      isWinningSquare={winningLineIdx?.includes(idx) ?? false}
                      isLastMove={lastMoveIndex === idx}
                      disabled={room?.status !== "playing" || !!room?.winner}
                    />
                  ))}
                </div>
              </div>

              {/* Winner banner */}
              {room?.winner && (
                <div className="mt-4 text-sm font-semibold">
                  {room.winner === "draw" ? (
                    <span className="text-yellow-400">Draw.</span>
                  ) : (
                    <span className="text-emerald-400">
                      Winner: {room.winner}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* --- Right Panel: Chat & History --- */}
        <aside className="bg-slate-900/30 border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative
                ${activeTab === "chat" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              Chat
              {activeTab === "chat" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative
                ${activeTab === "history" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              History
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-grow overflow-hidden relative">
            {activeTab === "chat" ? (
              <Chat messages={messages} onSendMessage={handleSendMessage} currentPlayer={currentPlayer} />
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase sticky top-0 z-10 backdrop-blur">
                    <tr>
                      <th className="p-3 font-medium">#</th>
                      <th className="p-3 font-medium">Player</th>
                      <th className="p-3 font-medium">Pos</th>
                      <th className="p-3 font-medium text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {moveLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-600 text-xs italic">
                          No moves yet
                        </td>
                      </tr>
                    ) : (
                      moveLogs.map((log) => (
                        <tr key={log.step} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 text-slate-500 font-mono">{log.step}</td>
                          <td className="p-3">
                            <span className={`font-bold ${log.player === "X" ? "text-cyan-400" : "text-rose-400"}`}>
                              {log.player}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 font-mono">
                            {getColLabel(log.col - 1)}
                            {log.row}
                          </td>
                          <td className="p-3 text-right text-slate-500 text-xs font-mono">
                            {log.timestamp}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Buttons */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => addSystemMessage("Undo (UI only).")}
                className="py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800/40 font-semibold rounded-lg text-sm transition-colors"
              >
                Undo (local)
              </button>

              <button
                onClick={() => addSystemMessage("Reset (UI only).")}
                className="py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800/40 font-semibold rounded-lg text-sm transition-colors"
              >
                Reset (local)
              </button>

              <button
                onClick={leaveRoom}
                className="col-span-2 py-2.5 border border-red-900/30 text-red-400 hover:bg-red-950/30 font-semibold rounded-lg text-sm transition-colors"
              >
                Rời phòng
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Modal Overlay */}
      <Modal
        winner={room?.winner === "draw" ? ("Draw" as any) : (room?.winner as any)}
        onRestart={() => router.replace(`/room/${roomCode}`)}
      />
    </div>
  );
}
