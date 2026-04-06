import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useI18n } from './i18n';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { THEME } from './theme';

export default function App() {
  const {
    isConnected,
    isReconnecting,
    rooms,
    currentRoom,
    player,
    gameState,
    challengers,
    isGameStarted,
    voteTally,
    myVote,
    hostTimeLeft,
    error,
    hostColorPreference,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    makeMove,
    castVote,
    refreshRooms,
    setHostColor,
    dismissError,
  } = useSocket();

  const { t } = useI18n();

  // Auto-dismiss errors after 3.5s.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(dismissError, 3500);
    return () => clearTimeout(timer);
  }, [error, dismissError]);

  if (!isConnected && !isReconnecting) {
    return (
      <div style={{
        minHeight: '100vh',
        background: THEME.colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: THEME.colors.textSecondary,
        fontSize: 15,
      }}>
        {t('connecting')}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Reconnecting overlay */}
      {isReconnecting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '10px 0',
          background: 'rgba(39,37,34,0.95)',
          color: THEME.colors.ownVote,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          zIndex: THEME.zIndex.reconnecting,
        }}>
          {t('reconnecting')}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div
          onClick={dismissError}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: THEME.colors.error,
            color: THEME.colors.textPrimary,
            padding: '10px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            zIndex: THEME.zIndex.modal,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Main content */}
      {!currentRoom || !player ? (
        <Lobby
          rooms={rooms}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onRefresh={refreshRooms}
          t={t}
        />
      ) : (
        <GameRoom
          room={currentRoom}
          player={player}
          gameState={gameState}
          challengers={challengers}
          isGameStarted={isGameStarted}
          voteTally={voteTally}
          myVote={myVote}
          hostTimeLeft={hostTimeLeft}
          hostColorPreference={hostColorPreference}
          onLeave={leaveRoom}
          onStartGame={startGame}
          onMakeMove={makeMove}
          onCastVote={castVote}
          onSetHostColor={setHostColor}
          t={t}
        />
      )}
    </div>
  );
}
