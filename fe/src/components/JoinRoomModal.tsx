"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, ArrowRight, Hash, ShieldAlert } from "lucide-react";
import { Button } from "./Button";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitRoomCode: (roomCode: string) => void;
  error?: string | null;
  loading?: boolean;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onSubmitRoomCode,
  error,
  loading = false,
}) => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } else {
      const t = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roomCode = code.join("");
    if (roomCode.length === 6) onSubmitRoomCode(roomCode);
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90" onClick={onClose} />

      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl p-8">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>

        <h2 className="text-center text-white text-2xl mb-4">
          NHẬP MÃ PHÒNG
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-4">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                maxLength={1}
                value={d}
                inputMode="numeric"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  const c = [...code];
                  c[i] = v;
                  setCode(c);
                  if (v && i < 5) inputsRef.current[i + 1]?.focus();
                }}
                className="w-12 h-14 text-center text-xl bg-black text-white"
              />
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <Button type="submit" disabled={loading}>
            VÀO PHÒNG <ArrowRight />
          </Button>
        </form>

        <div className="mt-4 text-xs text-yellow-400 flex gap-2">
          <ShieldAlert size={14} />
          Phòng bạn bè không thuộc xếp hạng
        </div>
      </div>
    </div>
  );
};
