import { describe, it, expect } from 'vitest';
import { materialAdvantage, PIECE_VALUES } from '../game';

describe('PIECE_VALUES', () => {
  it('has correct values', () => {
    expect(PIECE_VALUES['p']).toBe(1);
    expect(PIECE_VALUES['n']).toBe(3);
    expect(PIECE_VALUES['b']).toBe(3);
    expect(PIECE_VALUES['r']).toBe(5);
    expect(PIECE_VALUES['q']).toBe(9);
  });

  it('does not include king', () => {
    expect(PIECE_VALUES['k']).toBeUndefined();
    expect(PIECE_VALUES['K']).toBeUndefined();
  });
});

describe('materialAdvantage', () => {
  it('returns 0 for empty captures', () => {
    expect(materialAdvantage({ byHost: [], byChallengers: [] })).toBe(0);
  });

  it('returns 0 for symmetric captures', () => {
    expect(materialAdvantage({ byHost: ['q'], byChallengers: ['q'] })).toBe(0);
  });

  it('host capturing queen, challengers capturing two pawns → +7', () => {
    expect(materialAdvantage({ byHost: ['q'], byChallengers: ['p', 'p'] })).toBe(7);
  });

  it('negative when challengers have more material', () => {
    expect(materialAdvantage({ byHost: ['p'], byChallengers: ['r'] })).toBe(-4);
  });

  it('handles single-sided captures', () => {
    expect(materialAdvantage({ byHost: ['r', 'b'], byChallengers: [] })).toBe(8);
    expect(materialAdvantage({ byHost: [], byChallengers: ['n'] })).toBe(-3);
  });

  it('lowercases uppercase piece chars (regression: PIECE_VALUES has only lowercase keys)', () => {
    // Pieces may arrive as uppercase from FEN notation
    expect(materialAdvantage({ byHost: ['Q'], byChallengers: ['P'] })).toBe(8);
  });

  it('king contributes 0 (not in PIECE_VALUES)', () => {
    expect(materialAdvantage({ byHost: ['k', 'K'], byChallengers: [] })).toBe(0);
  });

  it('handles a complex mixed position', () => {
    // host captured: Q(9) + R(5) = 14, challengers: N(3) + B(3) + P(1) = 7 → +7
    expect(materialAdvantage({ byHost: ['q', 'r'], byChallengers: ['n', 'b', 'p'] })).toBe(7);
  });
});
