import { describe, it, expect } from 'vitest';
import {
  parseFEN, squareToIndex, indexToSquare, isLightSquare,
  isPromotionSquare, isOwnPiece,
} from '../chess';

// ── parseFEN ──────────────────────────────────────────────────────────────────

describe('parseFEN', () => {
  it('parses the starting position correctly', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = parseFEN(fen);
    expect(board).toHaveLength(64);
    // a8 = index 0
    expect(board[0]).toBe('r');
    // h8 = index 7
    expect(board[7]).toBe('r');
    // e8 = index 4 (king)
    expect(board[4]).toBe('k');
    // e1 = index 60 (white king)
    expect(board[60]).toBe('K');
    // a1 = index 56
    expect(board[56]).toBe('R');
    // h1 = index 63
    expect(board[63]).toBe('R');
    // e4 is empty after 1. e4 e5 hasn't been played
    expect(board[squareToIndex('e4')]).toBeNull();
  });

  it('parses an empty board', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(board).toHaveLength(64);
    expect(board.every(sq => sq === null)).toBe(true);
  });

  it('only considers piece placement (ignores rest of FEN string)', () => {
    const board1 = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    const board2 = parseFEN('8/8/8/8/8/8/8/8 b KQkq e6 50 100');
    expect(board1).toEqual(board2);
  });

  it('parses a mid-game FEN correctly', () => {
    // After 1. e4 e5: white pawn on e4, black pawn on e5, rest mostly the same
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const board = parseFEN(fen);
    expect(board[squareToIndex('e4')]).toBe('P');
    expect(board[squareToIndex('e5')]).toBe('p');
    expect(board[squareToIndex('e2')]).toBeNull();
    expect(board[squareToIndex('e7')]).toBeNull();
  });
});

// ── squareToIndex / indexToSquare ─────────────────────────────────────────────

describe('squareToIndex', () => {
  it('a8 = 0, h8 = 7', () => {
    expect(squareToIndex('a8')).toBe(0);
    expect(squareToIndex('h8')).toBe(7);
  });

  it('a1 = 56, h1 = 63', () => {
    expect(squareToIndex('a1')).toBe(56);
    expect(squareToIndex('h1')).toBe(63);
  });

  it('e4 = correct index', () => {
    // e4: file e = index 4, rank = 4-1 = 3 (0-based), row = 7-3 = 4 → 4*8 + 4 = 36
    expect(squareToIndex('e4')).toBe(36);
  });
});

describe('indexToSquare', () => {
  it('0 = a8, 7 = h8', () => {
    expect(indexToSquare(0)).toBe('a8');
    expect(indexToSquare(7)).toBe('h8');
  });

  it('56 = a1, 63 = h1', () => {
    expect(indexToSquare(56)).toBe('a1');
    expect(indexToSquare(63)).toBe('h1');
  });
});

describe('squareToIndex / indexToSquare round-trip', () => {
  it('round-trips all 64 squares', () => {
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['1','2','3','4','5','6','7','8'];
    for (const f of files) {
      for (const r of ranks) {
        const sq = f + r;
        expect(indexToSquare(squareToIndex(sq))).toBe(sq);
      }
    }
  });
});

// ── isLightSquare ─────────────────────────────────────────────────────────────

describe('isLightSquare', () => {
  it('a8 (index 0) is light', () => {
    expect(isLightSquare(0)).toBe(true);
  });

  it('b8 (index 1) is dark', () => {
    expect(isLightSquare(1)).toBe(false);
  });

  it('alternates within a row', () => {
    // Row 0 (rank 8): light, dark, light, dark...
    for (let i = 0; i < 8; i++) {
      expect(isLightSquare(i)).toBe(i % 2 === 0);
    }
  });

  it('alternates between rows (row start flips)', () => {
    // Row 1 (rank 7) starts dark (index 8)
    expect(isLightSquare(8)).toBe(false);
    expect(isLightSquare(9)).toBe(true);
  });

  it('h1 (index 63) is light', () => {
    // h1: row 7, col 7 → (7+7)%2 = 0 → light (h1 is a light square in chess)
    expect(isLightSquare(63)).toBe(true);
  });

  it('a1 (index 56) is dark', () => {
    // a1: row 7, col 0 → (7+0)%2 = 1 → dark (a1 is a dark square in chess)
    expect(isLightSquare(56)).toBe(false);
  });
});

// ── isPromotionSquare ─────────────────────────────────────────────────────────

describe('isPromotionSquare', () => {
  const startingBoard = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  it('white pawn moving to rank 8 returns true', () => {
    // Place a white pawn on e7 for this test
    const board = [...startingBoard];
    board[squareToIndex('e7')] = 'P';
    expect(isPromotionSquare('e7', 'e8', board)).toBe(true);
  });

  it('black pawn moving to rank 1 returns true', () => {
    const board = [...startingBoard];
    board[squareToIndex('e2')] = 'p';
    expect(isPromotionSquare('e2', 'e1', board)).toBe(true);
  });

  it('white pawn on rank 6 moving to rank 7 returns false', () => {
    const board = [...startingBoard];
    board[squareToIndex('e6')] = 'P';
    expect(isPromotionSquare('e6', 'e7', board)).toBe(false);
  });

  it('non-pawn piece moving to rank 8 returns false', () => {
    const board = [...startingBoard];
    board[squareToIndex('e7')] = 'R';
    expect(isPromotionSquare('e7', 'e8', board)).toBe(false);
  });

  it('empty source square returns false', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(isPromotionSquare('e7', 'e8', board)).toBe(false);
  });

  it('black pawn moving to rank 8 (wrong direction) returns false', () => {
    const board = [...startingBoard];
    board[squareToIndex('e7')] = 'p';
    expect(isPromotionSquare('e7', 'e8', board)).toBe(false);
  });
});

// ── isOwnPiece ────────────────────────────────────────────────────────────────

describe('isOwnPiece', () => {
  describe('host playing white', () => {
    it('uppercase (white) piece is own', () => {
      expect(isOwnPiece('P', true, 'white')).toBe(true);
      expect(isOwnPiece('Q', true, 'white')).toBe(true);
      expect(isOwnPiece('K', true, 'white')).toBe(true);
    });

    it('lowercase (black) piece is not own', () => {
      expect(isOwnPiece('p', true, 'white')).toBe(false);
      expect(isOwnPiece('q', true, 'white')).toBe(false);
    });
  });

  describe('host playing black', () => {
    it('lowercase (black) piece is own', () => {
      expect(isOwnPiece('p', true, 'black')).toBe(true);
      expect(isOwnPiece('k', true, 'black')).toBe(true);
    });

    it('uppercase (white) piece is not own', () => {
      expect(isOwnPiece('P', true, 'black')).toBe(false);
    });
  });

  describe('challenger (not host) when host plays white', () => {
    it('lowercase (black) piece is own (challenger plays black)', () => {
      expect(isOwnPiece('p', false, 'white')).toBe(true);
      expect(isOwnPiece('q', false, 'white')).toBe(true);
    });

    it('uppercase (white) piece is not own', () => {
      expect(isOwnPiece('P', false, 'white')).toBe(false);
    });
  });

  describe('challenger (not host) when host plays black', () => {
    it('uppercase (white) piece is own (challenger plays white)', () => {
      expect(isOwnPiece('P', false, 'black')).toBe(true);
      expect(isOwnPiece('Q', false, 'black')).toBe(true);
    });

    it('lowercase (black) piece is not own', () => {
      expect(isOwnPiece('p', false, 'black')).toBe(false);
    });
  });
});
