"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { ChatMessage, Move, RoomState } from "@/interface/game";

type GameState = {
  room: RoomState | null;
  moves: Move[];
  winner: "X" | "O" | "draw" | null;
  ended: boolean;
  loadingMoves: boolean;
  error: string | null;
  chat: ChatMessage[];
};

export function useGameFlow(roomCode: string) {
  const socket = useMemo(() => getSocket(), []);
  const [state, setState] = useState<GameState>({
    room: null,
    moves: [],
    winner: null,
    ended: false,
    loadingMoves: false,
    error: null,
    chat: [],
  });

  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // --- listeners ---
  useEffect(() => {
    const onRoomUpdated = ({ room }: any) => {
      setState((s) => ({ ...s, room }));
    };

    const onGameStarted = ({ room }: any) => {
      setState((s) => ({
        ...s,
        room,
        ended: false,
        winner: null,
        moves: [], // ván mới reset
        error: null,
      }));
      // load moves để chắc chắn đồng bộ
      socket.emit("game:moves", { roomCode: roomCodeRef.current });
    };

    const onGameMoved = ({ room, lastMove }: any) => {
      setState((s) => ({
        ...s,
        room,
        moves: [...s.moves, lastMove],
        error: null,
      }));
    };

    const onGameEnded = ({ room, winner, lastMove }: any) => {
      setState((s) => ({
        ...s,
        room,
        winner,
        ended: true,
        moves: lastMove ? [...s.moves, lastMove] : s.moves,
      }));
    };

    const onGameMoves = ({ moves }: any) => {
      setState((s) => ({ ...s, moves: moves || [], loadingMoves: false }));
    };

    const onChatMessage = ({ message }: any) => {
      const msg = message as ChatMessage;
      setState((s) => ({ ...s, chat: [...s.chat, msg] }));
    };

    const onRoomError = ({ message }: any) => {
      setState((s) => ({ ...s, error: message || "Game error" }));
    };

    socket.on("room:updated", onRoomUpdated);
    socket.on("game:started", onGameStarted);
    socket.on("game:moved", onGameMoved);
    socket.on("game:ended", onGameEnded);
    socket.on("game:moves", onGameMoves);

    socket.on("chat:message", onChatMessage);

    socket.on("room:error", onRoomError);

    return () => {
      socket.off("room:updated", onRoomUpdated);
      socket.off("game:started", onGameStarted);
      socket.off("game:moved", onGameMoved);
      socket.off("game:ended", onGameEnded);
      socket.off("game:moves", onGameMoves);

      socket.off("chat:message", onChatMessage);

      socket.off("room:error", onRoomError);
    };
  }, [socket]);

  // --- init sync ---
  useEffect(() => {
    if (!roomCode) return;
    socket.emit("room:sync", { roomCode });
    setState((s) => ({ ...s, loadingMoves: true }));
    socket.emit("game:moves", { roomCode });
  }, [socket, roomCode]);

  // --- actions ---
  const sendMove = useCallback((x: number, y: number) => {
    if (!roomCodeRef.current) return;
    socket.emit("game:move", { roomCode: roomCodeRef.current, x, y });
  }, [socket]);

  const sendChat = useCallback((text: string) => {
    const t = (text || "").trim();
    if (!t) return;
    socket.emit("chat:send", { roomCode: roomCodeRef.current, text: t });
  }, [socket]);

  const resetLocal = useCallback(() => {
    setState((s) => ({ ...s, moves: [], chat: [], error: null, ended: false, winner: null }));
  }, []);

  return {
    ...state,
    sendMove,
    sendChat,
    resetLocal,
    socket,
  };
}
