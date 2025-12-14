import React from 'react';
import { Player } from '@/interface/type';
import { IconTrophy, IconRefresh } from './Icons';

interface ModalProps {
  winner: Player | 'Draw' | null;
  onRestart: () => void;
}

export const Modal: React.FC<ModalProps> = ({ winner, onRestart }) => {
  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform animate-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-900/50 rounded-full border border-slate-600">
            {winner === 'Draw' ? (
               <span className="text-4xl">🤝</span>
            ) : (
              <IconTrophy className="w-12 h-12 text-amber-400" />
            )}
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">
          {winner === 'Draw' ? 'Game Draw!' : `Player ${winner} Wins!`}
        </h2>
        
        <p className="text-slate-400 mb-8">
          {winner === 'Draw' 
            ? "It's a tie. Well played both sides." 
            : "Congratulations on a magnificent victory!"}
        </p>
        
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-900/20 active:scale-95"
        >
          <IconRefresh className="w-5 h-5" />
          Play Again
        </button>
      </div>
    </div>
  );
};