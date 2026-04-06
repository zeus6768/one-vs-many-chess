import type { PieceChar } from '../types/game';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

// Parse FEN piece placement into a 64-element array (index 0 = a8, 63 = h8).
export function parseFEN(fen: string): (PieceChar | null)[] {
  const placement = fen.split(' ')[0];
  const board: (PieceChar | null)[] = new Array(64).fill(null);
  let sq = 0;
  for (const ch of placement) {
    if (ch === '/') continue;
    const n = parseInt(ch, 10);
    if (!isNaN(n)) {
      sq += n;
    } else {
      board[sq] = ch as PieceChar;
      sq++;
    }
  }
  return board;
}

// Convert square name (e.g. "e4") to index 0-63 (a8=0, h8=7, a7=8, ..., h1=63).
export function squareToIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1], 10) - 1;
  return (7 - rank) * 8 + file;
}

// Convert index to square name.
export function indexToSquare(idx: number): string {
  const file = FILES[idx % 8];
  const rank = RANKS[Math.floor(idx / 8)];
  return file + rank;
}

// Square colors: index from a8=0 perspective.
export function isLightSquare(idx: number): boolean {
  const row = Math.floor(idx / 8);
  const col = idx % 8;
  return (row + col) % 2 === 0;
}

export function isPromotionSquare(from: string, to: string, board: (PieceChar | null)[]): boolean {
  const fromIdx = squareToIndex(from);
  const piece = board[fromIdx];
  if (!piece) return false;
  const toRank = to[1];
  if (piece === 'P' && toRank === '8') return true;
  if (piece === 'p' && toRank === '1') return true;
  return false;
}

export function isOwnPiece(piece: PieceChar, isHost: boolean, hostColor: string): boolean {
  const isWhitePiece = piece === piece.toUpperCase();
  if (isHost) {
    return hostColor === 'white' ? isWhitePiece : !isWhitePiece;
  } else {
    return hostColor === 'white' ? !isWhitePiece : isWhitePiece;
  }
}
