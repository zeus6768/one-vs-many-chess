import type { Player } from '../types/game';
import type { I18nKey } from '../i18n/ko';
import { THEME } from '../theme';

interface PlayerListProps {
  host: Player | null;
  challengers: Player[];
  currentPlayer: Player | null;
  hostColor: string;
  t: (key: I18nKey) => string;
}

function ColorDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: color === 'white' ? THEME.colors.lightSquare : THEME.colors.boardBorder,
      border: color === 'white' ? '1.5px solid #769656' : '1.5px solid #aaa',
      marginRight: 6,
      flexShrink: 0,
    }} />
  );
}

export function PlayerList({ host, challengers, currentPlayer, hostColor, t }: PlayerListProps) {
  return (
    <div style={{ color: THEME.colors.textSecondary, fontSize: 13, minWidth: 140 }}>
      {/* Host */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          color: THEME.colors.accentGreen,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {t('host_label')}
        </div>
        {host && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: 6,
            background: host.id === currentPlayer?.id ? THEME.colors.accentGreenAlpha15 : 'transparent',
            fontWeight: host.id === currentPlayer?.id ? 700 : 400,
            color: host.id === currentPlayer?.id ? THEME.colors.textPrimary : THEME.colors.textSecondary,
          }}>
            <ColorDot color={hostColor} />
            {host.name}
            {host.id === currentPlayer?.id && (
              <span style={{ marginLeft: 4, color: THEME.colors.accentGreen, fontSize: 11 }}>
                {t('you')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Challengers */}
      <div>
        <div style={{
          color: THEME.colors.accentGreen,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {t('challengers_label')} ({challengers.length})
        </div>
        {challengers.map(c => (
          <div key={c.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: 6,
            background: c.id === currentPlayer?.id ? THEME.colors.accentGreenAlpha15 : 'transparent',
            fontWeight: c.id === currentPlayer?.id ? 700 : 400,
            color: c.id === currentPlayer?.id ? THEME.colors.textPrimary : THEME.colors.textSecondary,
          }}>
            <ColorDot color={hostColor === 'white' ? 'black' : 'white'} />
            {c.name}
            {c.id === currentPlayer?.id && (
              <span style={{ marginLeft: 4, color: THEME.colors.accentGreen, fontSize: 11 }}>
                {t('you')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
