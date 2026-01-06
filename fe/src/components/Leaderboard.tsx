"use client";

import React, { useEffect, useState } from "react";
import { IconTrophy } from "@/components/Icons";

type User = {
  _id: string;
  username: string;
  elo: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/users/leaderboard?limit=10`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <IconTrophy className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold tracking-wide text-white">
          TOP RANKED PLAYERS
        </h3>
      </div>

      <div className="space-y-2">
        {users.map((u, i) => (
          <div
            key={u._id}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm
              ${
                i === 0
                  ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/40"
              }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 text-center font-mono font-bold ${
                  i === 0 ? "text-amber-400" : "text-slate-500"
                }`}
              >
                #{i + 1}
              </span>
              <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                {u.username}
              </span>
            </div>

            <div className="font-mono text-indigo-400 font-bold">{u.elo}</div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center text-xs text-slate-500 italic py-6">
            Chưa có dữ liệu xếp hạng
          </div>
        )}
      </div>
    </div>
  );
};
