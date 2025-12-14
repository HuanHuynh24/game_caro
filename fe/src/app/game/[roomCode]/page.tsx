"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BOARD_SIZE, ChatMessage, MoveLog } from "@/interface/type";
import { PlayerCard } from "@/components/PlayerCard";
import { Chat } from "@/components/Chat";
import { Modal } from "@/components/Modal";
import { Square } from "@/components/Square";

const TURN_SECONDS = 30;

// ================= TYPES =================
type Player = { userId: string; symbol: "X" | "O"; username?: string | null };

type RoomState = {
  code: string;
  status: "playing" | "finished";
  xIsNext: boolean;
  winner: "X" | "O" | "draw" | null;
  boardSize: number;
  players: Player[];
  turnStartedAt?: string | Date | null;
};

type Move = {
  x: number;
  y: number;
  symbol: "X" | "O";
  at: string;
  by?: string;
};

type WinningLine = Array<{ x: number; y: number }> | number[] | null;

function safeId(v: any) {
  return (v?._id ?? v?.id ?? v)?.toString?.() ?? String(v ?? "");
}

export default function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const socket = useMemo(() => getSocket(), []);

  const [room, setRoom] = useState<RoomState | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [winningLineIdx, setWinningLineIdx] = useState<number[] | null>(null);

  // UI-only
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [moveLogs, setMoveLogs] = useState<MoveLog[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);

  // ✅ per-turn timer display
  const [turnRemain, setTurnRemain] = useState({
    X: TURN_SECONDS,
    O: TURN_SECONDS,
  });

  // ✅ modal control (không che line ngay)
  const [showModal, setShowModal] = useState(false);
  const modalTimerRef = useRef<number | null>(null);

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
      return safeId(u._id || u.id || u.userId || null);
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

    if (Array.isArray(wl) && typeof wl[0] === "number") return wl as number[];

    if (Array.isArray(wl) && typeof wl[0] === "object") {
      return (wl as Array<{ x: number; y: number }>).map(
        (p) => p.y * boardSize + p.x
      );
    }
    return null;
  };

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
      {
        id: Date.now().toString(),
        sender: "System",
        text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // ================= SOCKET (GIỮ NGUYÊN LOGIC) =================
  useEffect(() => {
    if (!roomCode) return;

    socket.emit("room:sync", { roomCode });
    socket.emit("game:moves", { roomCode });

    const onRoomUpdated = ({ room }: any) => {
      setRoom(room);

      // nếu vào lại playing => ẩn modal (nếu có)
      if (room?.status === "playing") {
        setShowModal(false);
        if (modalTimerRef.current) {
          window.clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
      }

      if (room?.status === "finished") {
        // Không tự redirect vội nếu bạn muốn xem line lâu hơn
        // Giữ như bạn đang làm, nhưng có thể tăng 1500 -> 2500 tuỳ UX
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

      // set line trước
      const line = normalizeWinningLine(winningLine ?? null);
      setWinningLineIdx(line);

      // ✅ add last move để vẽ đủ quân thắng
      if (lastMove) {
        setMoves((prev) => {
          const existed = prev.some(
            (m) => m.x === lastMove.x && m.y === lastMove.y
          );
          return existed ? prev : [...prev, lastMove];
        });
        setLastMoveIndex(lastMove.y * boardSize + lastMove.x);

        setMoveLogs((prev) => {
          const step = prev.length + 1;
          const existed = prev.some(
            (l) =>
              l.row === lastMove.y + 1 &&
              l.col === lastMove.x + 1 &&
              l.player === lastMove.symbol
          );
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

      // UI score
      if (winner === "X" || winner === "O") {
        setScores((prev) => ({ ...prev, [winner]: prev[winner] + 1 }));
      }

      // ✅ delay mở modal để người chơi kịp thấy line
      setShowModal(false);
      if (modalTimerRef.current) window.clearTimeout(modalTimerRef.current);
      modalTimerRef.current = window.setTimeout(() => {
        setShowModal(true);
      }, 900);
    };

    // ---- CHAT: add here ----
    socket.emit("chat:history", { roomCode, limit: 50 });

    const onChatHistory = ({ roomCode: rc, messages }: any) => {
      if (String(rc) !== String(roomCode)) return;

      const normalized = (messages || []).map((m: any) => ({
        id: String(m.id || m._id || Date.now()),
        sender: (m.sender || m.from?.symbol || m.fromSymbol || m.symbol) as
          | "X"
          | "O"
          | "System",
        text: m.text,
        timestamp: new Date(m.at || m.createdAt || Date.now()),
      }));

      setMessages(normalized);
    };

    const onChatMessage = (m: any) => {
      const msg = {
        id: String(m.id || m._id || Date.now()),
        sender: (m.sender || m.from?.symbol || m.fromSymbol || m.symbol) as
          | "X"
          | "O"
          | "System",
        text: m.text,
        timestamp: new Date(m.at || m.createdAt || Date.now()),
      };

      setMessages((prev) => [...prev, msg]);
    };

    socket.on("room:updated", onRoomUpdated);
    socket.on("game:moves", onGameMoves);
    socket.on("game:moved", onGameMoved);
    socket.on("game:ended", onGameEnded);
    socket.on("chat:history", onChatHistory);
    socket.on("chat:message", onChatMessage);

    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("game:moves", onGameMoves);
      socket.off("game:moved", onGameMoved);
      socket.off("game:ended", onGameEnded);
      socket.off("chat:history", onChatHistory);
      socket.off("chat:message", onChatMessage);

      if (modalTimerRef.current) {
        window.clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, socket, router, boardSize]);

  // ================= TIMER (30s/turn, bám turnStartedAt) =================
  useEffect(() => {
    if (!room || room.status !== "playing") {
      // reset hiển thị cho đẹp
      setTurnRemain({ X: TURN_SECONDS, O: TURN_SECONDS });
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const active: "X" | "O" = room.xIsNext ? "X" : "O";

      const startedAt = room.turnStartedAt
        ? new Date(room.turnStartedAt).getTime()
        : null;
      const now = Date.now();

      let remain = TURN_SECONDS;
      if (startedAt) {
        const elapsed = Math.floor((now - startedAt) / 1000);
        remain = Math.max(0, TURN_SECONDS - elapsed);
      }

      setTurnRemain((prev) => ({
        ...prev,
        [active]: remain,
        // người không tới lượt: hiển thị full 30s (tuỳ UX)
        [active === "X" ? "O" : "X"]: TURN_SECONDS,
      }));
    };

    tick();
    timerRef.current = setInterval(tick, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.status, room?.xIsNext, room?.turnStartedAt]);

  // ===== Center board on load (UI only) =====
  useEffect(() => {
    if (!boardRef.current) return;
    const cell = 32;
    const centerOffset =
      (boardSize * cell) / 2 - boardRef.current.clientWidth / 2;
    boardRef.current.scrollTo({
      top: centerOffset,
      left: centerOffset,
      behavior: "auto",
    });
  }, [boardSize]);

  // ================= CHAT =================
  const handleSendMessage = (text: string) => {
    const t = (text || "").trim();
    if (!t || !roomCode) return;
    socket.emit("chat:send", { roomCode, text: t });
  };

  // ================= MOVE =================
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

  // ===== Player display (username thật) =====
  const pX = room?.players?.find((p) => p.symbol === "X");
  const pO = room?.players?.find((p) => p.symbol === "O");

  const nameX = pX?.username || (pX?.userId ? "Player X" : "Waiting...");
  const nameO = pO?.username || (pO?.userId ? "Player O" : "Waiting...");

  const currentPlayer: "X" | "O" = room?.xIsNext ? "X" : "O";

  const mySymbol = useMemo<"X" | "O" | null>(() => {
    if (!room || !userId) return null;
    const me = room.players?.find((p) => String(p.userId) === String(userId));
    return (me?.symbol as any) ?? null;
  }, [room, userId]);

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
            isActive={
              currentPlayer === "X" &&
              room?.status === "playing" &&
              !room?.winner
            }
            score={scores.X}
            winner={room?.winner === "draw" ? "Draw" : (room?.winner as any)}
            timeRemaining={turnRemain.X}
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
            isActive={
              currentPlayer === "O" &&
              room?.status === "playing" &&
              !room?.winner
            }
            score={scores.O}
            winner={room?.winner === "draw" ? "Draw" : (room?.winner as any)}
            timeRemaining={turnRemain.O}
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
                status: {room?.status ?? "—"} • turn: {currentPlayer} • remain:{" "}
                {currentPlayer === "X" ? turnRemain.X : turnRemain.O}s
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
              backgroundImage:
                "radial-gradient(circle at center, #1e293b 1px, transparent 1px)",
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
                  style={{
                    gridTemplateColumns: `repeat(${boardSize}, min-content)`,
                  }}
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
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative
                ${
                  activeTab === "chat"
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
            >
              Chat
              {activeTab === "chat" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative
                ${
                  activeTab === "history"
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
            >
              History
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>
              )}
            </button>
          </div>

          <div className="flex-grow overflow-hidden relative">
            {activeTab === "chat" ? (
              <Chat
                messages={messages}
                onSendMessage={handleSendMessage}
                mySymbol={mySymbol}
              />
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
                        <td
                          colSpan={4}
                          className="p-8 text-center text-slate-600 text-xs italic"
                        >
                          No moves yet
                        </td>
                      </tr>
                    ) : (
                      moveLogs.map((log) => (
                        <tr
                          key={log.step}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="p-3 text-slate-500 font-mono">
                            {log.step}
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-bold ${
                                log.player === "X"
                                  ? "text-cyan-400"
                                  : "text-rose-400"
                              }`}
                            >
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

      {/* Modal Overlay (✅ chỉ show sau delay) */}
      {showModal && (
        <Modal
          winner={
            room?.winner === "draw" ? ("Draw" as any) : (room?.winner as any)
          }
          onRestart={() => router.replace(`/room/${roomCode}`)}
        />
      )}
    </div>
  );
}
