export type HostColorPreference = 'white' | 'black' | 'random';

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string; // 'q' | 'r' | 'b' | 'n'
}

export interface CapturedPieces {
  byHost: string[];
  byChallengers: string[];
}

export interface GameState {
  fen: string;
  isHostTurn: boolean;
  winner: 'host' | 'challengers' | 'draw' | '';
  winReason: 'checkmate' | 'stalemate' | 'fifty_move' | 'threefold' | 'insufficient' | 'disconnect' | '';
  lastMove: ChessMove | null;
  lastMoveSan: string;
  hostColor: 'white' | 'black';
  moveHistory: string[];
  capturedPieces: CapturedPieces;
  isCheck: boolean;
  legalMoves: ChessMove[];
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  challengerCount: number;
  status: 'waiting' | 'playing' | 'finished';
  hostColor: HostColorPreference;
}

export type VoteMap = Record<string, ChessMove>;

export interface VoteTally {
  votes: VoteMap;
  timeLeftMs: number;
  totalVoters: number;
}

// Piece chars: uppercase = white, lowercase = black
// K/k = king, Q/q = queen, R/r = rook, B/b = bishop, N/n = knight, P/p = pawn
export type PieceChar = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

export const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

export function materialAdvantage(captured: CapturedPieces): number {
  const sum = (pieces: string[]) =>
    pieces.reduce((acc, p) => acc + (PIECE_VALUES[p.toLowerCase()] ?? 0), 0);
  return sum(captured.byHost ?? []) - sum(captured.byChallengers ?? []);
}
