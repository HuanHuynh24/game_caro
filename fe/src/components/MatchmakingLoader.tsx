import React, { useEffect, useState } from 'react';
import { X, Shield, Users, Server, Wifi } from 'lucide-react';
import { Button } from './Button';

interface MatchmakingLoaderProps {
  isOpen: boolean;
  onCancel: () => void;
}

export const MatchmakingLoader: React.FC<MatchmakingLoaderProps> = ({ isOpen, onCancel }) => {
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState('CONNECTING TO REGION...');
  const [playersFound, setPlayersFound] = useState(1);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mounting animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimer(0);
      setPlayersFound(1);
      setStatus('ĐANG TẠO SÂN ĐẤU...');
    } else {
      const timeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Simulation Logic
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);

    const statusTimers = [
      setTimeout(() => setStatus('ĐANG TÌM ĐỐI THỦ ...'), 1500),
      setTimeout(() => { setPlayersFound(3); }, 2000),
      setTimeout(() => { setPlayersFound(7); }, 3500),
      setTimeout(() => { setPlayersFound(10); setStatus('ĐANG TÌM...'); }, 4500),
      setTimeout(() => { setStatus('ĐANG TÌM ĐỐI THỦ XỨNG TẦM...'); }, 6000),
    ];

    return () => {
      clearInterval(interval);
      statusTimers.forEach(clearTimeout);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Heavy Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" />

      {/* Main Content */}
      <div className="relative w-full max-w-lg p-4 flex flex-col items-center justify-center text-center space-y-8">
        
        {/* Radar/Loader Animation */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 border-2 border-slate-800 rounded-full"></div>
          
          {/* Spinning Gradient Ring */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin duration-[3s]"></div>
          <div className="absolute inset-4 rounded-full border-b-2 border-l-2 border-purple-500 animate-[spin_2s_linear_infinite_reverse]"></div>

          {/* Core Pulse */}
          <div className="absolute w-32 h-32 bg-indigo-500/10 rounded-full animate-pulse blur-xl"></div>
          
          {/* Center Info */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <span className="text-4xl font-display font-bold text-white tracking-widest tabular-nums">
              {formatTime(timer)}
            </span>
            <span className="text-xs text-indigo-400 font-bold tracking-widest mt-1">ESTIMATED: 00:45</span>
          </div>

          {/* Radar Scan Line */}
          <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
             <div className="w-full h-1/2 bg-gradient-to-b from-transparent to-indigo-500/50 animate-[scan_2s_linear_infinite] origin-bottom border-b border-indigo-400"></div>
          </div>
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 animate-pulse">
            {status}
          </h2>
          <div className="flex items-center justify-center gap-6 text-slate-500 text-sm font-medium">
             <div className="flex items-center gap-2">
               <Shield size={14} /> 
               <span>RANKED</span>
             </div>
             <div className="flex items-center gap-2">
               <Wifi size={14} className="text-green-500" /> 
               <span>34ms</span>
             </div>
          </div>
        </div>

        {/* Player Slots */}
        <div className="flex gap-2">
           {[...Array(10)].map((_, i) => (
             <div 
                key={i} 
                className={`w-3 h-8 -skew-x-12 transition-all duration-300 ${
                  i < playersFound 
                    ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
                    : 'bg-slate-800'
                }`}
             />
           ))}
        </div>
        
        {/* Footer Info */}
        <div className="text-xs text-slate-500 tracking-wider">
          <div className="flex items-center gap-2 mb-8">
            <Users size={14} />
            <span>số lượng người chơi: 14,205</span>
          </div>
          
          <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white border border-slate-700/50 hover:border-red-500/50 hover:bg-red-500/10">
            HUỶ TÌM TRẬN
          </Button>
        </div>
      </div>

      {/* Background Grid Decoration */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
    </div>
  );
};