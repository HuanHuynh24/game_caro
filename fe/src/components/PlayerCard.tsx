import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { IconX, IconO, IconUser, IconClock } from './Icons';

interface PlayerCardProps {
  player: Player;
  name: string;
  elo: number;
  isActive: boolean;
  score: number;
  winner: Player | 'Draw' | null;
  timeRemaining: number; // in seconds
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  name,
  elo,
  isActive, 
  score, 
  winner,
  timeRemaining
}) => {
  const isWinner = winner === player;
  
  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`
        relative flex flex-row xl:flex-col items-center gap-4 p-4 rounded-xl border w-full transition-all duration-300 overflow-hidden
        ${isActive && !winner 
          ? `bg-slate-800/90 border-${player === 'X' ? 'cyan' : 'rose'}-500/50 shadow-[0_0_20px_rgba(var(--shadow-color),0.15)] ring-1 ring-${player === 'X' ? 'cyan' : 'rose'}-500/30` 
          : 'bg-slate-900/50 border-slate-800 opacity-90'
        }
        ${isWinner ? 'bg-gradient-to-br from-amber-900/20 to-slate-900 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : ''}
      `}
      style={{
        '--shadow-color': player === 'X' ? '6,182,212' : '244,63,94'
      } as React.CSSProperties}
    >
      {/* Background decoration */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${player === 'X' ? 'cyan' : 'rose'}-500/10 blur-3xl rounded-full pointer-events-none`}></div>

      {/* Avatar Section */}
      <div className="relative">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-lg
          ${player === 'X' ? 'bg-cyan-950/50 border-cyan-500/30' : 'bg-rose-950/50 border-rose-500/30'}
        `}>
          {player === 'X' ? (
            <IconX className="w-8 h-8 text-cyan-400" />
          ) : (
            <IconO className="w-8 h-8 text-rose-400" />
          )}
        </div>
        
        {/* Active Dot indicator */}
        {isActive && !winner && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-slate-900"></span>
          </span>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-grow text-left xl:text-center xl:w-full">
        <div className="flex flex-col xl:items-center">
          <h3 className="text-slate-100 font-bold text-lg tracking-tight truncate max-w-[150px]">
            {name}
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ELO {elo}</span>
            <span className="text-slate-500">•</span>
            <span>Wins: {score}</span>
          </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-lg font-bold border
        ${isActive && !winner
          ? player === 'X' ? 'bg-cyan-950/30 text-cyan-400 border-cyan-500/30' : 'bg-rose-950/30 text-rose-400 border-rose-500/30'
          : 'bg-slate-950/30 text-slate-500 border-slate-800'
        }
        ${timeRemaining < 30 && isActive ? 'animate-pulse text-red-500 border-red-900/50' : ''}
      `}>
        <IconClock className="w-4 h-4" />
        <span>{formatTime(timeRemaining)}</span>
      </div>

      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute top-2 right-2 xl:top-auto xl:bottom-2 xl:right-auto bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-amber-500/20">
          Victory
        </div>
      )}
    </div>
  );
};
