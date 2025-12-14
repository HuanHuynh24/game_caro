"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { resetSocket } from "@/lib/socket";

type AuthUser = { id: string; username: string };

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
    loading: true,
    error: null,
  });

  const isAuthed = useMemo(() => !!state.token && !!state.user, [state.token, state.user]);

  const setToken = useCallback((token: string | null) => {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, []);

  const loadMe = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setState((s) => ({ ...s, token: null, user: null, loading: false }));
      return;
    }

    try {
      setState((s) => ({ ...s, loading: true, error: null, token }));
      const res = await api("/api/users/me");
      setState((s) => ({
        ...s,
        user: res.user,
        loading: false,
        error: null,
      }));
    } catch (e: any) {
      // token sai/hết hạn
      setToken(null);
      resetSocket();
      setState({ user: null, token: null, loading: false, error: e?.message || "Unauthorized" });
    }
  }, [setToken]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setToken(res.token);
      // Socket singleton đang dùng token cũ => reset để lần connect sau ăn token mới
      resetSocket();

      setState((s) => ({
        ...s,
        token: res.token,
        user: res.user,
        loading: false,
        error: null,
      }));

      return res;
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message || "Login failed" }));
      throw e;
    }
  }, [setToken]);

  const register = useCallback(async (username: string, password: string) => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const res = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setState((s) => ({ ...s, loading: false, error: null }));
      return res;
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message || "Register failed" }));
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    resetSocket();
    setState({ user: null, token: null, loading: false, error: null });
  }, [setToken]);

  return {
    ...state,
    isAuthed,
    loadMe,
    login,
    register,
    logout,
  };
}
