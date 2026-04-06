import React from 'react';
import type { PieceChar } from '../types/game';

interface PieceProps {
  piece: PieceChar;
  size?: number;
}

// Cburnett-style SVG chess pieces (public domain / CC-BY-SA 3.0).
// Inline SVG paths for 12 pieces — optimised for readability.

const WHITE_PIECES: Record<string, React.ReactElement> = {
  K: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-4-5-5.5c-.5 1 .5 4.5 0 5.5-3 2.5-3 3-3 7 0 2.5 2 5 2 5" fill="#fff" />
        <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" />
      </g>
    </svg>
  ),
  Q: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c4-1.5 17-1.5 21 0" fillRule="nonzero" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="14" cy="9" r="2" />
        <circle cx="22.5" cy="8" r="2" />
        <circle cx="31" cy="9" r="2" />
        <circle cx="39" cy="12" r="2" />
      </g>
    </svg>
  ),
  R: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" fill="#fff" strokeLinecap="butt" />
        <path d="M34 14l-3 3H14l-3-3" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M31 17v12.5H14V17" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M11 14h23" fill="none" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  B: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#fff" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  N: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff" />
        <path d="M24 18c.38 5.12-5.5 7.5-8 12.5 3-.5 3-3 4.5-6.5" fill="#fff" />
        <path d="M9.5 25.5a6.5 6.5 0 1 0 13 0 6.5 6.5 0 1 0-13 0z" fill="#fff" />
        <path d="M17.5 25.5a1 1 0 1 0 2 0 1 1 0 1 0-2 0z" />
        <path d="M14 25.5c0-2.5 2.5-4 4.5-4 3 0 4 2 4 4s-2 4-4 4" />
      </g>
    </svg>
  ),
  P: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const BLACK_PIECES: Record<string, React.ReactElement> = {
  k: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6" strokeLinejoin="miter" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-4-5-5.5c-.5 1 .5 4.5 0 5.5-3 2.5-3 3-3 7 0 2.5 2 5 2 5" fill="#000" />
        <path d="M20 8h5" strokeLinejoin="miter" />
        <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" stroke="#fff" />
      </g>
    </svg>
  ),
  q: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c4-1.5 17-1.5 21 0" stroke="#fff" fillRule="nonzero" />
        <circle cx="6" cy="12" r="2" fill="#fff" stroke="#fff" />
        <circle cx="14" cy="9" r="2" fill="#fff" stroke="#fff" />
        <circle cx="22.5" cy="8" r="2" fill="#fff" stroke="#fff" />
        <circle cx="31" cy="9" r="2" fill="#fff" stroke="#fff" />
        <circle cx="39" cy="12" r="2" fill="#fff" stroke="#fff" />
      </g>
    </svg>
  ),
  r: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fillRule="evenodd" fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" strokeLinecap="butt" />
        <path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" strokeLinecap="butt" />
        <path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  b: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#000" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
        </g>
        <path d="M17.5 26h10M15 30h15" stroke="#fff" strokeLinejoin="miter" />
        <path d="M17.5 26h10M15 30h15" stroke="#fff" strokeLinejoin="miter" />
        <path d="M22.5 15.5v5M20 18h5" stroke="#fff" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  n: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000" />
        <path d="M24 18c.38 5.12-5.5 7.5-8 12.5 3-.5 3-3 4.5-6.5" fill="#000" />
        <path d="M9.5 25.5a6.5 6.5 0 1 0 13 0 6.5 6.5 0 1 0-13 0z" fill="#000" />
        <path d="M17.5 25.5a1 1 0 1 0 2 0 1 1 0 1 0-2 0z" fill="#fff" stroke="#fff" />
        <path d="M14 25.5c0-2.5 2.5-4 4.5-4 3 0 4 2 4 4s-2 4-4 4" stroke="#fff" />
        <path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 6.84 4.35.92 1.49 1.19 3.36.8 5.62-.87 4.9-4.29 8.22-6.87 10.35-.9.75-1.93 1.21-2.86 1.21-.66 0-1.33-.16-2-.56" stroke="#fff" strokeWidth="1" />
      </g>
    </svg>
  ),
  p: (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function Piece({ piece, size = 56 }: PieceProps) {
  const isWhite = piece === piece.toUpperCase();
  const map = isWhite ? WHITE_PIECES : BLACK_PIECES;
  const svg = map[piece];
  if (!svg) return null;
  return (
    <div style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      userSelect: 'none',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
    }}>
      <div style={{ width: size * 0.85, height: size * 0.85 }}>
        {svg}
      </div>
    </div>
  );
}
