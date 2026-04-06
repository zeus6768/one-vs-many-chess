import { useState } from 'react';
import type { RoomInfo, HostColorPreference } from '../types/game';
import type { I18nKey } from '../i18n/ko';
import { THEME } from '../theme';

interface LobbyProps {
  rooms: RoomInfo[];
  onCreateRoom: (roomName: string, playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  onRefresh: () => void;
  t: (key: I18nKey) => string;
}

const COLOR_LABELS: Record<HostColorPreference, string> = {
  white: '♔',
  black: '♚',
  random: '⚄',
};

export function Lobby({ rooms, onCreateRoom, onJoinRoom, onRefresh, t }: LobbyProps) {
  const [name, setName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !roomName.trim()) return;
    onCreateRoom(roomName.trim(), name.trim());
    setShowCreate(false);
    setRoomName('');
  };

  const handleJoin = (roomId: string) => {
    if (!name.trim()) return;
    onJoinRoom(roomId, name.trim());
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: THEME.colors.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          color: THEME.colors.textPrimary,
          fontSize: 36,
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          {t('lobby_title')}
        </h1>
        <p style={{ color: THEME.colors.textSecondary, margin: '8px 0 0', fontSize: 15 }}>
          {t('lobby_subtitle')}
        </p>
      </div>

      {/* Name input */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('your_name')}
          maxLength={20}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: THEME.colors.card,
            border: THEME.borders.input,
            borderRadius: 8,
            color: THEME.colors.textPrimary,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => e.key === 'Enter' && !showCreate && setShowCreate(true)}
        />
      </div>

      {/* Create room */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 32 }}>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            disabled={!name.trim()}
            style={{
              width: '100%',
              padding: '12px 0',
              background: THEME.colors.accentGreen,
              border: 'none',
              borderRadius: 8,
              color: THEME.colors.textPrimary,
              fontSize: 15,
              fontWeight: 700,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            {t('create_room')}
          </button>
        ) : (
          <div style={{
            background: THEME.colors.card,
            border: THEME.borders.standard,
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ color: THEME.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
              {t('create_room_title')}
            </div>
            <input
              type="text"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder={t('create_room_placeholder')}
              maxLength={30}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                background: THEME.colors.background,
                border: THEME.borders.input,
                borderRadius: 6,
                color: THEME.colors.textPrimary,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCreate}
                disabled={!roomName.trim()}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: THEME.colors.accentGreen,
                  border: 'none',
                  borderRadius: 6,
                  color: THEME.colors.textPrimary,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: roomName.trim() ? 'pointer' : 'not-allowed',
                  opacity: roomName.trim() ? 1 : 0.5,
                }}
              >
                {t('create_room_submit')}
              </button>
              <button
                onClick={() => { setShowCreate(false); setRoomName(''); }}
                style={{
                  padding: '10px 16px',
                  background: THEME.colors.border,
                  border: 'none',
                  borderRadius: 6,
                  color: THEME.colors.textSecondary,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {t('create_room_cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Room list */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <span style={{ color: THEME.colors.textSecondary, fontWeight: 700, fontSize: 14 }}>
            {t('available_rooms')}
          </span>
          <button
            onClick={onRefresh}
            style={{
              background: 'none',
              border: 'none',
              color: THEME.colors.accentGreen,
              cursor: 'pointer',
              fontSize: 13,
              padding: '4px 8px',
            }}
          >
            ↻ {t('refresh')}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div style={{
            background: THEME.colors.card,
            border: THEME.borders.standard,
            borderRadius: 8,
            padding: 20,
            color: THEME.colors.textMuted,
            textAlign: 'center',
            fontSize: 14,
          }}>
            {t('no_rooms')}
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} style={{
              background: THEME.colors.card,
              border: THEME.borders.standard,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ color: THEME.colors.textPrimary, fontWeight: 600, fontSize: 14 }}>
                  {room.name}
                </div>
                <div style={{ color: THEME.colors.textMutedAlt, fontSize: 12, marginTop: 2 }}>
                  {room.hostName} · {room.challengerCount} {t('challengers')} · {COLOR_LABELS[room.hostColor]}
                </div>
              </div>
              <button
                onClick={() => handleJoin(room.id)}
                disabled={!name.trim() || room.status !== 'waiting'}
                style={{
                  padding: '7px 16px',
                  background: !name.trim() || room.status !== 'waiting' ? THEME.colors.border : THEME.colors.accentGreen,
                  border: 'none',
                  borderRadius: 6,
                  color: !name.trim() || room.status !== 'waiting' ? THEME.colors.textMutedAlt : THEME.colors.textPrimary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !name.trim() || room.status !== 'waiting' ? 'not-allowed' : 'pointer',
                }}
              >
                {room.status === 'waiting' ? t('join') : t('status_playing')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
