import { useState, useEffect } from 'react';
import type {
  Player, RoomInfo, GameState, VoteTally, ChessMove, HostColorPreference,
} from '../types/game';
import { Board } from './Board';
import { PlayerList } from './PlayerList';
import { MoveHistory } from './MoveHistory';
import { CapturedPieces } from './CapturedPieces';
import type { I18nKey } from '../i18n/ko';
import { THEME } from '../theme';

interface GameRoomProps {
  room: RoomInfo;
  player: Player;
  gameState: GameState | null;
  challengers: Player[];
  isGameStarted: boolean;
  voteTally: VoteTally | null;
  myVote: ChessMove | null;
  hostTimeLeft: number | null;
  hostColorPreference: HostColorPreference;
  onLeave: () => void;
  onStartGame: () => void;
  onMakeMove: (move: ChessMove) => void;
  onCastVote: (move: ChessMove) => void;
  onSetHostColor: (color: HostColorPreference) => void;
  t: (key: I18nKey) => string;
}

function useCountdown(timeLeftMs: number | null): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (timeLeftMs === null) { setSecs(0); return; }
    setSecs(Math.ceil(timeLeftMs / 1000));
    const interval = setInterval(() => {
      setSecs(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftMs]);
  return secs;
}

export function GameRoom({
  room,
  player,
  gameState,
  challengers,
  isGameStarted,
  voteTally,
  myVote,
  hostTimeLeft,
  hostColorPreference,
  onLeave,
  onStartGame,
  onMakeMove,
  onCastVote,
  onSetHostColor,
  t,
}: GameRoomProps) {
  const isHost = player.isHost;
  const countdown = useCountdown(voteTally?.timeLeftMs ?? null);
  const hostCountdown = useCountdown(hostTimeLeft);

  const isMyTurn = gameState
    ? isHost ? gameState.isHostTurn : !gameState.isHostTurn
    : false;

  const hostObj: Player = { id: room.hostName, name: room.hostName, isHost: true };
  const host = challengers.find(c => c.isHost) ?? (isHost ? player : hostObj);

  const resolvedHostColor: 'white' | 'black' =
    gameState?.hostColor ?? (hostColorPreference === 'random' ? 'white' : hostColorPreference);

  // ── Pre-game UI ──────────────────────────────────────────────────────────

  if (!isGameStarted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: THEME.colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px',
      }}>
        <Header playerName={player.name} onLeave={onLeave} maxWidth={400} t={t} />

        <div style={{
          background: THEME.colors.card,
          border: THEME.borders.standard,
          borderRadius: 12,
          padding: 28,
          width: '100%',
          maxWidth: 400,
          marginTop: 24,
        }}>
          {isHost ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  color: THEME.colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 10,
                  fontWeight: 600,
                }}>
                  {t('host_color_select')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['white', 'black', 'random'] as HostColorPreference[]).map(c => (
                    <button
                      key={c}
                      onClick={() => onSetHostColor(c)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        background: hostColorPreference === c ? THEME.colors.accentGreen : THEME.colors.border,
                        border: 'none',
                        borderRadius: 6,
                        color: hostColorPreference === c ? THEME.colors.textPrimary : THEME.colors.textSecondary,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t(c === 'white' ? 'color_white' : c === 'black' ? 'color_black' : 'color_random')}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={onStartGame}
                disabled={challengers.length === 0}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  background: challengers.length > 0 ? THEME.colors.accentGreen : THEME.colors.border,
                  border: 'none',
                  borderRadius: 8,
                  color: challengers.length > 0 ? THEME.colors.textPrimary : THEME.colors.textMuted,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: challengers.length > 0 ? 'pointer' : 'not-allowed',
                  marginBottom: challengers.length === 0 ? 6 : 0,
                }}
              >
                {t('start_game')}
              </button>
              {challengers.length === 0 && (
                <div style={{ color: THEME.colors.textMutedAlt, fontSize: 12, textAlign: 'center' }}>
                  {t('start_game_hint')}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: THEME.colors.textSecondary, fontSize: 14 }}>
              {t('waiting_for_host')}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <PlayerList
              host={isHost ? player : hostObj}
              challengers={challengers.filter(c => !c.isHost)}
              currentPlayer={player}
              hostColor={hostColorPreference === 'random' ? 'white' : hostColorPreference}
              t={t}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── In-game UI ───────────────────────────────────────────────────────────

  if (!gameState) return null;

  const isVoting = !gameState.isHostTurn && !gameState.winner;
  const statusMsg = gameState.winner
    ? null
    : gameState.isCheck
      ? t('check_warning')
      : gameState.isHostTurn
        ? hostTimeLeft !== null
          ? `${t('host_turn')} — ${hostCountdown}${t('seconds')}`
          : t('host_turn')
        : `${t('challenger_voting')} — ${t('voting_ends_in')} ${countdown}${t('seconds')}`;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#312e2b',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
    }}>
      <Header playerName={player.name} onLeave={onLeave} t={t} />

      {/* Status bar */}
      {statusMsg && (
        <div style={{
          margin: '12px 0',
          padding: '8px 20px',
          background: gameState.isCheck ? 'rgba(231,76,60,0.25)' : THEME.colors.accentGreenAlpha15,
          border: `1px solid ${gameState.isCheck ? THEME.colors.error : THEME.colors.accentGreen}`,
          borderRadius: 20,
          color: gameState.isCheck ? THEME.colors.error : THEME.colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}>
          {statusMsg}
        </div>
      )}

      {/* Main layout */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 900,
      }}>
        {/* Left panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: '0 0 auto',
        }}>
          <PlayerList
            host={isHost ? player : host}
            challengers={challengers.filter(c => !c.isHost)}
            currentPlayer={player}
            hostColor={resolvedHostColor}
            t={t}
          />
          <CapturedPieces
            captured={gameState.capturedPieces}
            hostColor={resolvedHostColor}
            isHost={isHost}
            t={t}
          />
        </div>

        {/* Board */}
        <div style={{ flex: '0 0 auto' }}>
          <Board
            gameState={gameState}
            isHost={isHost}
            isMyTurn={isMyTurn && !gameState.winner}
            voteTally={isVoting ? voteTally : null}
            myVote={isVoting ? myVote : null}
            onMove={onMakeMove}
            onVote={onCastVote}
            promotionLabel={t('select_promotion')}
          />
        </div>

        {/* Right panel */}
        <div style={{ flex: '0 0 auto' }}>
          <MoveHistory moves={gameState.moveHistory ?? []} t={t} />
        </div>
      </div>

      {/* Game over overlay */}
      {gameState.winner && (
        <GameOverBanner
          winner={gameState.winner}
          winReason={gameState.winReason}
          isHost={isHost}
          onLeave={onLeave}
          t={t}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ playerName, onLeave, maxWidth = 900, t }: { playerName: string; onLeave: () => void; maxWidth?: number; t: (k: I18nKey) => string }) {
  return (
    <div style={{
      width: '100%',
      maxWidth,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    }}>
      <h2 style={{ color: THEME.colors.textPrimary, margin: 0, fontSize: 18, fontWeight: 700 }}>
        {playerName}
      </h2>
      <button
        onClick={onLeave}
        style={{
          padding: '7px 16px',
          background: THEME.colors.border,
          border: 'none',
          borderRadius: 6,
          color: THEME.colors.textSecondary,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {t('leave_room')}
      </button>
    </div>
  );
}

function GameOverBanner({
  winner,
  winReason,
  isHost,
  onLeave,
  t,
}: {
  winner: string;
  winReason: string;
  isHost: boolean;
  onLeave: () => void;
  t: (k: I18nKey) => string;
}) {
  const myResult = winner === 'draw'
    ? t('draw')
    : (winner === 'host' && isHost) || (winner === 'challengers' && !isHost)
      ? t('you_win')
      : t('you_lose');

  const globalResult = winner === 'draw'
    ? t('draw')
    : winner === 'host'
      ? t('host_wins')
      : t('challengers_win');

  const reasonKey = `reason_${winReason}` as I18nKey;

  const bgColor = winner === 'draw'
    ? 'rgba(100,100,100,0.9)'
    : (winner === 'host' && isHost) || (winner === 'challengers' && !isHost)
      ? 'rgba(129,182,76,0.95)'
      : 'rgba(231,76,60,0.95)';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: THEME.zIndex.overlay,
    }}>
      <div style={{
        background: bgColor,
        borderRadius: 16,
        padding: '32px 48px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ color: THEME.colors.textPrimary, fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
          {myResult}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 4 }}>
          {globalResult}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 28 }}>
          {t(reasonKey)}
        </div>
        <button
          onClick={onLeave}
          style={{
            padding: '11px 32px',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: 8,
            color: THEME.colors.textPrimary,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('leave_room')}
        </button>
      </div>
    </div>
  );
}
