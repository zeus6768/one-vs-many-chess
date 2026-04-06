import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lobby } from '../Lobby';
import type { RoomInfo } from '../../types/game';

const t = (key: string) => key;

const waitingRoom: RoomInfo = {
  id: 'room-1',
  name: 'Test Room',
  hostName: 'Alice',
  challengerCount: 0,
  status: 'waiting',
  hostColor: 'white',
};

const playingRoom: RoomInfo = {
  ...waitingRoom,
  id: 'room-2',
  status: 'playing',
};

function renderLobby(rooms: RoomInfo[] = []) {
  const onCreateRoom = vi.fn();
  const onJoinRoom = vi.fn();
  const onRefresh = vi.fn();
  render(
    <Lobby
      rooms={rooms}
      onCreateRoom={onCreateRoom}
      onJoinRoom={onJoinRoom}
      onRefresh={onRefresh}
      t={t as never}
    />
  );
  return { onCreateRoom, onJoinRoom, onRefresh };
}

describe('Lobby', () => {
  it('shows no_rooms message when room list is empty', () => {
    renderLobby([]);
    expect(screen.getByText('no_rooms')).toBeInTheDocument();
  });

  it('create room button is disabled when name is empty', () => {
    renderLobby();
    expect(screen.getByText('create_room')).toBeDisabled();
  });

  it('create room button is enabled after typing a name', async () => {
    const user = userEvent.setup();
    renderLobby();
    await user.type(screen.getByPlaceholderText('your_name'), 'Alice');
    expect(screen.getByText('create_room')).not.toBeDisabled();
  });

  it('shows create room form after clicking create room', async () => {
    const user = userEvent.setup();
    renderLobby();
    await user.type(screen.getByPlaceholderText('your_name'), 'Alice');
    await user.click(screen.getByText('create_room'));
    expect(screen.getByPlaceholderText('create_room_placeholder')).toBeInTheDocument();
  });

  it('calls onCreateRoom with trimmed name and room name', async () => {
    const user = userEvent.setup();
    const { onCreateRoom } = renderLobby();
    await user.type(screen.getByPlaceholderText('your_name'), '  Alice  ');
    await user.click(screen.getByText('create_room'));
    await user.type(screen.getByPlaceholderText('create_room_placeholder'), '  My Room  ');
    await user.click(screen.getByText('create_room_submit'));
    expect(onCreateRoom).toHaveBeenCalledWith('My Room', 'Alice');
  });

  it('create_room_submit button is disabled when room name is empty', async () => {
    const user = userEvent.setup();
    renderLobby();
    await user.type(screen.getByPlaceholderText('your_name'), 'Alice');
    await user.click(screen.getByText('create_room'));
    expect(screen.getByText('create_room_submit')).toBeDisabled();
  });

  it('join button is disabled when name is empty', () => {
    renderLobby([waitingRoom]);
    expect(screen.getByText('join')).toBeDisabled();
  });

  it('join button shows status_playing and is disabled for in-progress rooms', async () => {
    const user = userEvent.setup();
    renderLobby([playingRoom]);
    await user.type(screen.getByPlaceholderText('your_name'), 'Bob');
    expect(screen.getByText('status_playing')).toBeDisabled();
  });

  it('join button is enabled for waiting rooms when name is filled', async () => {
    const user = userEvent.setup();
    renderLobby([waitingRoom]);
    await user.type(screen.getByPlaceholderText('your_name'), 'Bob');
    expect(screen.getByText('join')).not.toBeDisabled();
  });

  it('calls onJoinRoom with room id and trimmed player name', async () => {
    const user = userEvent.setup();
    const { onJoinRoom } = renderLobby([waitingRoom]);
    await user.type(screen.getByPlaceholderText('your_name'), '  Bob  ');
    await user.click(screen.getByText('join'));
    expect(onJoinRoom).toHaveBeenCalledWith('room-1', 'Bob');
  });

  it('renders room details (name, host, challenger count)', () => {
    renderLobby([waitingRoom]);
    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('cancel button hides create room form', async () => {
    const user = userEvent.setup();
    renderLobby();
    await user.type(screen.getByPlaceholderText('your_name'), 'Alice');
    await user.click(screen.getByText('create_room'));
    await user.click(screen.getByText('create_room_cancel'));
    expect(screen.queryByPlaceholderText('create_room_placeholder')).not.toBeInTheDocument();
  });
});
