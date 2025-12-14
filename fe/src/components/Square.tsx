import React from 'react';
import { SquareValue } from '@/interface/type';
import { IconX, IconO } from '@/components/Icons';

interface SquareProps {
  value: SquareValue;
  onClick: () => void;
  isWinningSquare: boolean;
  isLastMove: boolean;
  disabled: boolean;
}

export const Square: React.FC<SquareProps> = ({ value, onClick, isWinningSquare, isLastMove, disabled }) => {
  return (
    <button
      className={`
        relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 border-[0.5px] border-slate-700/50 
        transition-all duration-100
        ${!value && !disabled ? 'hover:bg-slate-800 cursor-pointer hover:shadow-inner' : ''}
        ${isWinningSquare ? 'bg-amber-500/20 ring-1 ring-amber-500/50 z-10' : 'bg-slate-900/40'}
      `}
      onClick={onClick}
      disabled={disabled || value !== null}
    >
      {/* Last move indicator (highlight border & glow) */}
      {isLastMove && !isWinningSquare && (
        <>
          <span className="absolute inset-0 border-2 border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)] z-10 pointer-events-none"></span>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg z-20"></span>
        </>
      )}

      <div className={`transition-all duration-200 transform ${value ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        {value === 'X' && (
          <IconX className={`w-5 h-5 sm:w-6 sm:h-6 ${isWinningSquare ? 'text-amber-400' : 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]'}`} />
        )}
        {value === 'O' && (
          <IconO className={`w-4 h-4 sm:w-5 sm:h-5 ${isWinningSquare ? 'text-amber-400' : 'text-rose-400 drop-shadow-[0_0_3px_rgba(251,113,133,0.5)]'}`} />
        )}
      </div>
    </button>
  );
};
