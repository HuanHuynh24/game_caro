export type PlayerSymbol = "X" | "O";

export type RoomStatus = "waiting" | "ready" | "playing" | "finished";

export type RoomPlayer = {
  userId: string;
  symbol: PlayerSymbol;
  isReady: boolean;
};

export type RoomState = {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  boardSize: number;
  winLength: number;
  xIsNext: boolean;
  winner: "X" | "O" | "draw" | null;
  players: RoomPlayer[];
  turnStartedAt?: string | null;
};

export type Move = {
  _id?: string;
  x: number;
  y: number;
  symbol: PlayerSymbol;
  by: string;
  at: string | number;
};

export type ChatMessage = {
  id?: string;
  from: string;
  text: string;
  at: number;
};
