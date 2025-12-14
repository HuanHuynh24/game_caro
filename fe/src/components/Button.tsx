import React from 'react';
import { Loader2 } from 'lucide-react';
import { ButtonProps } from '@/interface/type';

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  icon,
  disabled,
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 font-display font-bold tracking-wider transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 clip-path-polygon";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-transparent hover:border-purple-400/50",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 hover:border-slate-500",
    ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white",
    social: "bg-slate-900/50 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 w-full justify-center"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${isLoading ? 'cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
