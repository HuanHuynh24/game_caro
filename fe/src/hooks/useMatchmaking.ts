"use client";

import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

type Status = "idle" | "waiting" | "matched" | "canceled" | "error";

export function useMatchmaking(socket: Socket | null, onMatched: (roomCode: string) => void) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const find = useCallback(() => {
    if (!socket) return;
    setError(null);
    setStatus("waiting");
    socket.emit("matchmaking:find"); // ✅ emit thật sự
  }, [socket]);

  const cancel = useCallback(() => {
    if (!socket) return;
    socket.emit("matchmaking:cancel");
    setStatus("canceled");
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => setStatus("waiting");

    const onMatchedEvt = (payload: any) => {
      const roomCode = payload?.roomCode;
      if (!roomCode) {
        setStatus("error");
        setError("Matched nhưng thiếu roomCode");
        return;
      }
      setStatus("matched");
      onMatched(roomCode); // ✅ redirect bên ngoài
    };

    const onCanceled = () => setStatus("canceled");

    const onErr = (payload: any) => {
      setStatus("error");
      setError(payload?.message || "Matchmaking error");
    };

    socket.on("matchmaking:waiting", onWaiting);
    socket.on("matchmaking:matched", onMatchedEvt);
    socket.on("matchmaking:canceled", onCanceled);
    socket.on("matchmaking:error", onErr);

    return () => {
      socket.off("matchmaking:waiting", onWaiting);
      socket.off("matchmaking:matched", onMatchedEvt);
      socket.off("matchmaking:canceled", onCanceled);
      socket.off("matchmaking:error", onErr);
    };
  }, [socket, onMatched]);

  return { status, error, find, cancel };
}
