import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameRoom } from '../GameRoom';
import type { Player, RoomInfo, GameState } from '../../types/game';

const t = (key: string) => key;

const hostPlayer: Player = { id: 'host-1', name: 'Alice', isHost: true };
const challengerPlayer: Player = { id: 'chal-1', name: 'Bob', isHost: false };

const room: RoomInfo = {
  id: 'room-1',
  name: 'Test Room',
  hostName: 'Alice',
  challengerCount: 1,
  status: 'waiting',
  hostColor: 'white',
};

const gameState: GameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  isHostTurn: true,
  winner: '',
  winReason: '',
  lastMove: null,
  lastMoveSan: '',
  hostColor: 'white',
  moveHistory: [],
  capturedPieces: { byHost: [], byChallengers: [] },
  isCheck: false,
  legalMoves: [],
};

const noOp = vi.fn();

function renderPreGame(player: Player, challengers: Player[] = []) {
  return render(
    <GameRoom
      room={room}
      player={player}
      gameState={null}
      challengers={challengers}
      isGameStarted={false}
      voteTally={null}
      myVote={null}
      hostTimeLeft={null}
      hostColorPreference="white"
      onLeave={noOp}
      onStartGame={noOp}
      onMakeMove={noOp}
      onCastVote={noOp}
      onSetHostColor={noOp}
      t={t as never}
    />
  );
}

describe('GameRoom — pre-game', () => {
  it('host sees color selection buttons', () => {
    renderPreGame(hostPlayer);
    expect(screen.getByText('color_white')).toBeInTheDocument();
    expect(screen.getByText('color_black')).toBeInTheDocument();
    expect(screen.getByText('color_random')).toBeInTheDocument();
  });

  it('challenger sees waiting_for_host message', () => {
    renderPreGame(challengerPlayer, [challengerPlayer]);
    expect(screen.getByText('waiting_for_host')).toBeInTheDocument();
  });

  it('start_game button is disabled when no challengers', () => {
    renderPreGame(hostPlayer, []);
    expect(screen.getByText('start_game')).toBeDisabled();
  });

  it('start_game button is enabled when there are challengers', () => {
    renderPreGame(hostPlayer, [challengerPlayer]);
    expect(screen.getByText('start_game')).not.toBeDisabled();
  });

  it('clicking start game calls onStartGame', async () => {
    const user = userEvent.setup();
    const onStartGame = vi.fn();
    render(
      <GameRoom
        room={room}
        player={hostPlayer}
        gameState={null}
        challengers={[challengerPlayer]}
        isGameStarted={false}
        voteTally={null}
        myVote={null}
        hostTimeLeft={null}
        hostColorPreference="white"
        onLeave={noOp}
        onStartGame={onStartGame}
        onMakeMove={noOp}
        onCastVote={noOp}
        onSetHostColor={noOp}
        t={t as never}
      />
    );
    await user.click(screen.getByText('start_game'));
    expect(onStartGame).toHaveBeenCalled();
  });

  it('shows hint when no challengers have joined', () => {
    renderPreGame(hostPlayer, []);
    expect(screen.getByText('start_game_hint')).toBeInTheDocument();
  });

  it('leave_room button calls onLeave', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    render(
      <GameRoom
        room={room}
        player={hostPlayer}
        gameState={null}
        challengers={[]}
        isGameStarted={false}
        voteTally={null}
        myVote={null}
        hostColorPreference="white"
        onLeave={onLeave}
        onStartGame={noOp}
        onMakeMove={noOp}
        onCastVote={noOp}
        onSetHostColor={noOp}
        t={t as never}
      />
    );
    await user.click(screen.getByText('leave_room'));
    expect(onLeave).toHaveBeenCalled();
  });
});

describe('GameRoom — pre-game participant list', () => {
  it('challenger sees host name in waiting room', () => {
    renderPreGame(challengerPlayer, [challengerPlayer]);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('challenger sees their own name in challenger list', () => {
    renderPreGame(challengerPlayer, [challengerPlayer]);
    // 'Bob' appears in both the header and the player list
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
  });

  it('host sees challenger name in participant list', () => {
    renderPreGame(hostPlayer, [challengerPlayer]);
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows correct challenger count when multiple challengers present', () => {
    const c2: Player = { id: 'chal-2', name: 'Carol', isHost: false };
    const c3: Player = { id: 'chal-3', name: 'Dave', isHost: false };
    renderPreGame(hostPlayer, [challengerPlayer, c2, c3]);
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
  });
});

describe('GameRoom — in-game', () => {
  function renderInGame(player: Player, stateOverrides: Partial<GameState> = {}) {
    return render(
      <GameRoom
        room={room}
        player={player}
        gameState={{ ...gameState, ...stateOverrides }}
        challengers={[challengerPlayer]}
        isGameStarted
        voteTally={null}
        myVote={null}
        hostTimeLeft={null}
        hostColorPreference="white"
        onLeave={noOp}
        onStartGame={noOp}
        onMakeMove={noOp}
        onCastVote={noOp}
        onSetHostColor={noOp}
        t={t as never}
      />
    );
  }

  it('renders null when isGameStarted=true but gameState is null', () => {
    const { container } = render(
      <GameRoom
        room={room}
        player={hostPlayer}
        gameState={null}
        challengers={[]}
        isGameStarted
        voteTally={null}
        myVote={null}
        hostTimeLeft={null}
        hostColorPreference="white"
        onLeave={noOp}
        onStartGame={noOp}
        onMakeMove={noOp}
        onCastVote={noOp}
        onSetHostColor={noOp}
        t={t as never}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows host_turn status when it is the host turn', () => {
    renderInGame(hostPlayer, { isHostTurn: true });
    expect(screen.getByText('host_turn')).toBeInTheDocument();
  });

  it('shows check_warning when isCheck is true', () => {
    renderInGame(hostPlayer, { isCheck: true });
    expect(screen.getByText('check_warning')).toBeInTheDocument();
  });

  it('shows GameOverBanner when winner is set', () => {
    renderInGame(hostPlayer, { winner: 'host', winReason: 'checkmate' });
    expect(screen.getByText('you_win')).toBeInTheDocument();
    expect(screen.getByText('host_wins')).toBeInTheDocument();
  });

  it('challenger sees you_lose when host wins', () => {
    renderInGame(challengerPlayer, { winner: 'host', winReason: 'checkmate' });
    expect(screen.getByText('you_lose')).toBeInTheDocument();
  });

  it('shows draw when winner is draw', () => {
    renderInGame(hostPlayer, { winner: 'draw', winReason: 'stalemate' });
    expect(screen.getAllByText('draw').length).toBeGreaterThan(0);
  });
});
