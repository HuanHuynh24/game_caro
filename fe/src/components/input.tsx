import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { InputProps } from '@/interface/type';

export const Input: React.FC<InputProps> = ({ 
  label, 
  type = 'text', 
  error, 
  icon,
  className = '',
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-display font-bold text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg opacity-30 blur group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={inputType}
            className={`
              w-full bg-slate-900/90 text-white placeholder-slate-600 
              border border-slate-700 rounded-lg 
              py-3 ${icon ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'}
              focus:outline-none focus:border-indigo-500/50 focus:ring-0
              transition-all duration-300
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-slate-500 hover:text-white transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-red-400 text-xs ml-1 animate-pulse">{error}</p>
      )}
    </div>
  );
};
