"use client";

import { useCallback, useMemo, useState } from "react";

type ApiOk<T> = T & { success?: true; message?: string };
type ApiErr = { success?: false; message?: string; error?: any };

type Room = {
  _id: string;
  roomCode?: string;
  status?: "waiting" | "playing" | "finished";
};

type Match = {
  _id: string;
  roomId: string;
  status?: "waiting" | "playing" | "finished";
};

type CreateFriendRoomInput = { userId: string };
type JoinFriendRoomInput = { userId: string; roomCode: string };
type DecisionInput = { userId: string; roomId: string; action: "rematch" | "leave" };
type MoveInput = { matchId: string; userId: string; x: number; y: number; timeTakenMs: number };

type UseCaroFriendRoomApiOptions = {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  withCredentials?: boolean; // nếu bạn dùng cookie auth
};

function joinUrl(baseUrl: string, path: string) {
  if (!baseUrl) return path; // same-origin
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

export function useCaroFriendRoomApi(opts: UseCaroFriendRoomApiOptions = {}) {
  const baseUrl = opts.baseUrl ?? (process.env.NEXT_PUBLIC_API_BASE_URL || "");
  const withCredentials = opts.withCredentials ?? false;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(opts.defaultHeaders ?? {}),
    }),
    [opts.defaultHeaders]
  );

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(joinUrl(baseUrl, path), {
          ...init,
          headers: {
            ...headers,
            ...(init?.headers ?? {}),
          },
          credentials: withCredentials ? "include" : "same-origin",
        });

        const data = await readJsonSafe(res);

        if (!res.ok) {
          const msg = data?.message || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        // nếu BE trả {success:false,message:"..."} thì cũng bắt lỗi
        if (data && typeof data === "object" && data.success === false) {
          throw new Error(data.message || "Request failed");
        }

        return data as T;
      } catch (e: any) {
        setError(e?.message || "Unknown error");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, headers, withCredentials]
  );

  // 2) Tạo phòng bạn bè
  const createFriendRoom = useCallback(
    (input: CreateFriendRoomInput) =>
    //   request<ApiOk<{ roomId: string; roomCode: string; room?: Room }>>("/api/rooms/friend", {
      request<ApiOk<{ data : any }>>("/api/rooms/friend", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    [request]
  );

  // 3) Vào phòng bằng mã
  const joinFriendRoom = useCallback(
    (input: JoinFriendRoomInput) =>
      request<ApiOk<{ data : any }>>("/api/rooms/friend/join", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    [request]
  );

  // 4) Rematch / Leave
  const decision = useCallback(
    (input: DecisionInput) =>
      request<ApiOk<{ roomId: string; matchId?: string; room?: Room; match?: Match }>>(
        "/api/rooms/decision",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      ),
    [request]
  );

  // 5) Đánh nước đi
  const move = useCallback(
    (input: MoveInput) =>
      request<
        ApiOk<{
          matchId: string;
          status?: "playing" | "finished";
          winnerUserId?: string | null;
          isDraw?: boolean;
          reason?: "win" | "timeout" | "draw";
          winningLine?: Array<{ x: number; y: number }>;
          eloChange?: Record<string, number>;
        }>
      >("/matches/move", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    [request]
  );

  return {
    loading,
    error,
    // api funcs
    createFriendRoom,
    joinFriendRoom,
    decision,
    move,
    // helper
    clearError: () => setError(null),
  };
}
