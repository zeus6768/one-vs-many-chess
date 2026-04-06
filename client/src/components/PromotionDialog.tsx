import { Piece } from './Piece';
import type { PieceChar } from '../types/game';
import { THEME } from '../theme';

interface PromotionDialogProps {
  color: 'white' | 'black';
  onSelect: (piece: string) => void;
  onCancel: () => void;
  label: string;
}

const PROMOTION_PIECES: Array<{ key: string; label: string }> = [
  { key: 'q', label: 'Queen' },
  { key: 'r', label: 'Rook' },
  { key: 'b', label: 'Bishop' },
  { key: 'n', label: 'Knight' },
];

export function PromotionDialog({ color, onSelect, onCancel, label }: PromotionDialogProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: THEME.zIndex.modal,
    }}>
      <div style={{
        background: THEME.colors.card,
        border: THEME.borders.standard,
        borderRadius: 12,
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        <p style={{ color: THEME.colors.textSecondary, margin: 0, fontSize: 15 }}>{label}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {PROMOTION_PIECES.map(({ key, label: pLabel }) => {
            const pieceChar = (color === 'white' ? key.toUpperCase() : key) as PieceChar;
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                title={pLabel}
                style={{
                  width: 72,
                  height: 72,
                  background: THEME.colors.border,
                  border: '2px solid transparent',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.colors.accentGreen;
                  (e.currentTarget as HTMLButtonElement).style.background = THEME.colors.hoverBg;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.background = THEME.colors.border;
                }}
              >
                <Piece piece={pieceChar} size={56} />
              </button>
            );
          })}
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: THEME.colors.textMutedAlt,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
