import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'social';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export type AuthMode = 'login' | 'register';

export type Player = 'X' | 'O';
export type SquareValue = Player | null;

export interface GameState {
  history: SquareValue[][];
  stepNumber: number;
  xIsNext: boolean;
  winner: Player | 'Draw' | null;
  winningLine: number[] | null;
  lastMoveIndex: number | null;
}

export interface ChatMessage {
  id: string;
  sender: Player | 'System';
  text: string;
  timestamp: Date;
}

export interface MoveLog {
  step: number;
  player: Player;
  row: number;
  col: number;
  timestamp: string;
}

export const BOARD_SIZE = 30; // Updated to 30x30
export const WIN_LENGTH = 5;
