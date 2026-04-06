import { useEffect, useRef } from 'react';
import type { I18nKey } from '../i18n/ko';
import { THEME } from '../theme';

interface MoveHistoryProps {
  moves: string[];
  t: (key: I18nKey) => string;
}

export function MoveHistory({ moves, t }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves.length]);

  // Group moves into pairs: [[white, black], ...]
  const pairs: Array<[string, string | null]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null]);
  }

  return (
    <div style={{
      background: THEME.colors.card,
      border: THEME.borders.standard,
      borderRadius: 8,
      overflow: 'hidden',
      minWidth: 160,
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: THEME.borders.standard,
        color: THEME.colors.textSecondary,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {t('move_history')}
      </div>
      <div style={{
        maxHeight: 240,
        overflowY: 'auto',
        padding: '4px 0',
      }}>
        {pairs.length === 0 && (
          <div style={{ color: THEME.colors.textMuted, fontSize: 12, padding: '8px 12px' }}>—</div>
        )}
        {pairs.map(([white, black], i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            fontSize: 13,
            fontFamily: 'monospace',
          }}>
            <span style={{ color: THEME.colors.textMuted, width: 24, flexShrink: 0, fontSize: 11 }}>
              {i + 1}.
            </span>
            <span style={{
              flex: 1,
              color: THEME.colors.lightSquare,
              background: i * 2 === moves.length - 1 ? THEME.colors.accentGreenAlpha20 : 'transparent',
              borderRadius: 3,
              padding: '1px 4px',
            }}>
              {white}
            </span>
            <span style={{
              flex: 1,
              color: THEME.colors.textSecondary,
              background: black && i * 2 + 1 === moves.length - 1 ? THEME.colors.accentGreenAlpha20 : 'transparent',
              borderRadius: 3,
              padding: '1px 4px',
            }}>
              {black ?? ''}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
