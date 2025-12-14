"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { RoomState } from "@/interface/game";

type RoomFlowState = {
  room: RoomState | null;
  roomCode: string | null;
  loading: boolean;
  error: string | null;
  meId: string | null;
};

export function useRoomFlow() {
  const socket = useMemo(() => getSocket(), []);
  const [state, setState] = useState<RoomFlowState>({
    room: null,
    roomCode: null,
    loading: false,
    error: null,
    meId: null,
  });

  const roomCodeRef = useRef<string | null>(null);
  roomCodeRef.current = state.roomCode;

  // ---- listeners ----
  useEffect(() => {
    const onRoomCreated = ({ roomCode, room }: any) => {
      setState((s) => ({
        ...s,
        roomCode,
        room,
        loading: false,
        error: null,
      }));
    };

    const onRoomJoined = ({ roomCode, room, me }: any) => {
      setState((s) => ({
        ...s,
        roomCode,
        room,
        meId: me || s.meId,
        loading: false,
        error: null,
      }));
    };

    const onRoomUpdated = ({ room }: any) => {
      setState((s) => ({ ...s, room }));
    };

    const onRoomError = ({ message }: any) => {
      setState((s) => ({ ...s, loading: false, error: message || "Room error" }));
    };

    socket.on("room:created", onRoomCreated);
    socket.on("room:joined", onRoomJoined);
    socket.on("room:updated", onRoomUpdated);
    socket.on("room:error", onRoomError);

    return () => {
      socket.off("room:created", onRoomCreated);
      socket.off("room:joined", onRoomJoined);
      socket.off("room:updated", onRoomUpdated);
      socket.off("room:error", onRoomError);
    };
  }, [socket]);

  // ---- actions ----
  const createRoom = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    socket.emit("room:create");
  }, [socket]);

  const joinRoom = useCallback((roomCode: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    socket.emit("room:join", { roomCode });
  }, [socket]);

  const syncRoom = useCallback((roomCode?: string) => {
    const code = roomCode || roomCodeRef.current;
    if (!code) return;
    socket.emit("room:sync", { roomCode: code });
  }, [socket]);

  const setReady = useCallback((ready: boolean) => {
    const code = roomCodeRef.current;
    if (!code) return;
    socket.emit("room:ready", { roomCode: code, ready });
  }, [socket]);

  const startGame = useCallback(() => {
    const code = roomCodeRef.current;
    if (!code) return;
    socket.emit("room:start", { roomCode: code });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    const code = roomCodeRef.current;
    if (!code) return;
    socket.emit("room:leave", { roomCode: code });
    setState((s) => ({ ...s, room: null, roomCode: null }));
  }, [socket]);

  // derived helpers
  const playersCount = state.room?.players?.length ?? 0;
  const hasOpponent = playersCount === 2;
  const status = state.room?.status ?? null;

  return {
    ...state,
    status,
    hasOpponent,
    createRoom,
    joinRoom,
    syncRoom,
    setReady,
    startGame,
    leaveRoom,
    socket, // nếu bạn muốn dùng ở nơi khác
  };
}
