"use client";

import React from "react";

export function MatchmakingModal({
  open,
  status,
  error,
  onCancel,
}: {
  open: boolean;
  status: string;
  error?: string | null;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="w-[92%] max-w-md rounded-2xl bg-slate-950 border border-white/10 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold">Đang tìm đối thủ...</div>
            <div className="text-sm text-slate-400">
              {status === "waiting" && "Vui lòng chờ trong giây lát"}
              {status === "error" && (error || "Có lỗi xảy ra")}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm"
          >
            Hủy tìm
          </button>
        </div>
      </div>
    </div>
  );
}
