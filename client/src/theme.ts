export const THEME = {
  colors: {
    // Surfaces
    background: '#312e2b',
    card: '#272522',
    border: '#3d3a38',

    // Text
    textPrimary: '#fff',
    textSecondary: '#bababa',
    textMuted: '#555',
    textMutedAlt: '#666',
    textVeryMuted: '#444',

    // Accent
    accentGreen: '#81b64c',
    accentGreenAlpha15: 'rgba(129,182,76,0.15)',
    accentGreenAlpha20: 'rgba(129,182,76,0.2)',

    // Board
    lightSquare: '#eeeed2',
    darkSquare: '#769656',
    boardBorder: '#1a1a1a',
    lastMoveLight: '#cdd16a',
    lastMoveDark: '#aaa23a',
    selectionLight: '#f7f769',
    selectionDark: '#d4c846',

    // Semantic
    error: '#e74c3c',
    voteBadge: '#3b82f6',
    ownVote: '#f59e0b',
    hoverBg: '#4a4745',
  },

  borders: {
    standard: '1px solid #3d3a38',
    input: '1.5px solid #3d3a38',
  },

  zIndex: {
    badge: 10,
    overlay: 500,
    reconnecting: 999,
    modal: 1000,
  },
} as const;
