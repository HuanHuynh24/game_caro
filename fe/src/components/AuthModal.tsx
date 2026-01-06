"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./input";
import { AuthMode } from "@/interface/type";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onAuthSuccess?: (payload: { user: any; token: string }) => void; //  trả {user, token}
}

//  dùng env cho đúng chuẩn Next.js
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      if (initialMode) setMode(initialMode);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen) {
      setForm({ username: "", email: "", password: "" });
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, mode]);

  if (!shouldRender) return null;

  const handleChange =
    (field: "username" | "email" | "password") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!form.username || !form.password) {
        throw new Error("Vui lòng nhập đủ Username và Password");
      }

      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Đăng nhập/đăng ký thất bại");
      }
      
      console.log(data)

      //  BE trả { token, user }
      const token = data.token;
      const user = data.user;

      if (!token || !user) {
        throw new Error("Thiếu token hoặc user từ server");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        // optional: nếu bạn vẫn cần userId
        if (user?.id) localStorage.setItem("userId", user.id);
        if (user?._id) localStorage.setItem("userId", user._id);
      }

      onAuthSuccess?.({ user, token });
      onClose();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop with Blur */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`
        relative w-full max-w-md bg-slate-900 border border-slate-700/50 
        shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] 
        rounded-2xl overflow-hidden
        transform transition-all duration-300
        ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
      `}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10 p-1 hover:bg-white/10 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="p-8 pt-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-wide">
              {mode === "login" ? "CHÀO MỪNG TRỞ LẠI" : "TẠO TÀI KHOẢN NGAY"}
            </h2>
            <p className="text-slate-400 text-sm">
              {mode === "login"
                ? "Nhập thông tin của đạo hữu"
                : "Xin bằng hữu để lại thông tin"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <Input
              label="Username"
              placeholder="CyberNinja2077"
              icon={<User size={18} />}
              required
              value={form.username}
              onChange={handleChange("username")}
            />

            {/* Email: chỉ hiển thị khi register (BE hiện chưa dùng) */}
            {mode === "register" && (
              <Input
                label="Email Address"
                type="email"
                placeholder="agent@neon.nexus"
                icon={<Mail size={18} />}
                value={form.email}
                onChange={handleChange("email")}
              />
            )}

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                required
                value={form.password}
                onChange={handleChange("password")}
              />
              {mode === "login" && (
                <div className="flex justify-end">
                  <a
                    href="#"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              isLoading={isLoading}
              icon={!isLoading && <ArrowRight size={18} />}
            >
              {mode === "login" ? "VÀO GAME" : "TẠO TÀI KHOẢN"}
            </Button>
          </form>

          {/* Footer Switcher */}
          <div className="mt-6 text-center text-sm text-slate-400">
            {mode === "login"
              ? "Bạn chưa có tài khoản? "
              : "Bạn đã có tài khoản "}
            <button
              onClick={toggleMode}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none underline decoration-indigo-400/30 hover:decoration-indigo-400"
            >
              {mode === "login" ? "Đăng ký" : "Đăng nhập"}
            </button>
          </div>
        </div>

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      </div>
    </div>
  );
};
