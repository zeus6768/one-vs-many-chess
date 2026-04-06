import type { CapturedPieces as CapturedPiecesType } from '../types/game';
import { materialAdvantage, PIECE_VALUES } from '../types/game';
import { Piece } from './Piece';
import type { PieceChar } from '../types/game';
import type { I18nKey } from '../i18n/ko';
import { THEME } from '../theme';

interface CapturedPiecesProps {
  captured: CapturedPiecesType;
  hostColor: 'white' | 'black';
  isHost: boolean;
  t: (key: I18nKey) => string;
}

function PieceRow({ pieces }: { pieces: string[] }) {
  if (pieces.length === 0) return null;
  // Sort by value descending for display.
  const sorted = [...pieces].sort((a, b) =>
    (PIECE_VALUES[b.toLowerCase()] ?? 0) - (PIECE_VALUES[a.toLowerCase()] ?? 0)
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {sorted.map((p, i) => (
        <Piece key={i} piece={p as PieceChar} size={20} />
      ))}
    </div>
  );
}

export function CapturedPieces({ captured, isHost, t }: CapturedPiecesProps) {
  const adv = materialAdvantage(captured);
  return (
    <div style={{
      background: THEME.colors.card,
      border: THEME.borders.standard,
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 140,
    }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ color: THEME.colors.textMuted, fontSize: 11, marginBottom: 2 }}>
          {t('captured_by_host')}
        </div>
        <PieceRow pieces={captured.byHost} />
        {captured.byHost.length === 0 && <div style={{ color: THEME.colors.textVeryMuted, fontSize: 12 }}>—</div>}
      </div>
      <div>
        <div style={{ color: THEME.colors.textMuted, fontSize: 11, marginBottom: 2 }}>
          {t('captured_by_challengers')}
        </div>
        <PieceRow pieces={captured.byChallengers} />
        {captured.byChallengers.length === 0 && <div style={{ color: THEME.colors.textVeryMuted, fontSize: 12 }}>—</div>}
      </div>
      {adv !== 0 && (
        <div style={{
          marginTop: 6,
          color: adv > 0 ? THEME.colors.accentGreen : THEME.colors.error,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {t('material_advantage')}: {adv > 0 ? '+' : ''}{isHost ? adv : -adv}
        </div>
      )}
    </div>
  );
}
