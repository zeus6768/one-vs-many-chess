import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../useSocket';
import type { Player, RoomInfo, GameState, VoteTally } from '../../types/game';

// ── Mock WebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(_url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {}

  simulateOpen() {
    this.onopen?.();
  }

  simulateMessage(event: string, data: unknown) {
    this.onmessage?.({ data: JSON.stringify({ event, data }) });
  }

  simulateClose() {
    this.onclose?.();
  }
}

// ── Test data ─────────────────────────────────────────────────────────────────

const roomInfo: RoomInfo = {
  id: 'room-1',
  name: 'Test Room',
  hostName: 'Alice',
  challengerCount: 1,
  status: 'waiting',
  hostColor: 'black',
};

const hostPlayer: Player = { id: 'sess-host', name: 'Alice', isHost: true };
const challPlayer: Player = { id: 'sess-c1', name: 'Bob', isHost: false };

const gameState: GameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  isHostTurn: false,
  winner: '',
  winReason: '',
  lastMove: null,
  lastMoveSan: '',
  hostColor: 'black',
  moveHistory: [],
  capturedPieces: { byHost: [], byChallengers: [] },
  isCheck: false,
  legalMoves: [],
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setupHook() {
  const result = renderHook(() => useSocket());

  // The hook creates a ReconnectingWS which immediately calls connect(),
  // creating a MockWebSocket. Simulate the connection opening.
  act(() => {
    MockWebSocket.instances[0].simulateOpen();
  });

  return result;
}

function simulate(event: string, data: unknown) {
  act(() => {
    MockWebSocket.instances[0].simulateMessage(event, data);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSocket — room join flow', () => {
  it('roomJoined sets challengers from payload', () => {
    const { result } = setupHook();

    simulate('roomJoined', {
      room: roomInfo,
      player: challPlayer,
      challengers: [challPlayer],
    });

    expect(result.current.challengers).toHaveLength(1);
    expect(result.current.challengers[0].name).toBe('Bob');
  });

  it('roomJoined without challengers field defaults to empty array', () => {
    const { result } = setupHook();

    simulate('roomJoined', {
      room: roomInfo,
      player: challPlayer,
      // challengers field omitted
    });

    expect(result.current.challengers).toEqual([]);
  });

  it('roomJoined sets currentRoom and player', () => {
    const { result } = setupHook();

    simulate('roomJoined', {
      room: roomInfo,
      player: challPlayer,
      challengers: [challPlayer],
    });

    expect(result.current.currentRoom?.id).toBe('room-1');
    expect(result.current.player?.name).toBe('Bob');
  });
});

describe('useSocket — room lifecycle', () => {
  it('roomCreated sets room and player', () => {
    const { result } = setupHook();

    simulate('roomCreated', { room: roomInfo, player: hostPlayer });

    expect(result.current.currentRoom?.id).toBe('room-1');
    expect(result.current.player?.name).toBe('Alice');
  });

  it('playerJoined appends challenger to list', () => {
    const { result } = setupHook();

    simulate('roomJoined', { room: roomInfo, player: hostPlayer, challengers: [] });
    simulate('playerJoined', challPlayer);

    expect(result.current.challengers).toHaveLength(1);
    expect(result.current.challengers[0].name).toBe('Bob');
  });

  it('playerJoined deduplicates on same id', () => {
    const { result } = setupHook();

    simulate('roomJoined', { room: roomInfo, player: hostPlayer, challengers: [] });
    simulate('playerJoined', challPlayer);
    simulate('playerJoined', challPlayer);

    expect(result.current.challengers).toHaveLength(1);
  });

  it('playerLeft removes challenger from list', () => {
    const { result } = setupHook();

    simulate('roomJoined', { room: roomInfo, player: hostPlayer, challengers: [challPlayer] });
    simulate('playerLeft', challPlayer.id);

    expect(result.current.challengers).toHaveLength(0);
  });

  it('playerLeft decrements challengerCount', () => {
    const { result } = setupHook();

    simulate('roomJoined', { room: roomInfo, player: hostPlayer, challengers: [challPlayer] });
    simulate('playerLeft', challPlayer.id);

    expect(result.current.currentRoom?.challengerCount).toBe(0);
  });
});

describe('useSocket — reconnection flow', () => {
  it('reconnected restores room, player, and challengers', () => {
    const { result } = setupHook();

    simulate('reconnected', {
      room: roomInfo,
      player: challPlayer,
      challengers: [challPlayer],
      gameState: null,
      voteTally: null,
    });

    expect(result.current.currentRoom?.id).toBe('room-1');
    expect(result.current.player?.name).toBe('Bob');
    expect(result.current.challengers).toHaveLength(1);
  });

  it('reconnected restores gameState and sets isGameStarted', () => {
    const { result } = setupHook();

    simulate('reconnected', {
      room: { ...roomInfo, status: 'playing' },
      player: challPlayer,
      challengers: [challPlayer],
      gameState,
      voteTally: null,
    });

    expect(result.current.isGameStarted).toBe(true);
    expect(result.current.gameState?.fen).toBe(gameState.fen);
  });

  it('reconnected restores myVote from voteTally when vote exists', () => {
    const { result } = setupHook();

    const tally: VoteTally = {
      votes: { 'sess-c1': { from: 'e2', to: 'e4' } },
      timeLeftMs: 15000,
      totalVoters: 1,
    };

    simulate('reconnected', {
      room: { ...roomInfo, status: 'playing' },
      player: challPlayer,
      challengers: [challPlayer],
      gameState,
      voteTally: tally,
    });

    expect(result.current.myVote).toEqual({ from: 'e2', to: 'e4' });
  });
});

describe('useSocket — game flow', () => {
  it('gameStarted sets isGameStarted and clears vote state', () => {
    const { result } = setupHook();

    // Put some vote state in place first.
    simulate('roomJoined', { room: roomInfo, player: challPlayer, challengers: [challPlayer] });
    simulate('voteUpdate', { votes: {}, timeLeftMs: 20000, totalVoters: 0 });

    simulate('gameStarted', null);

    expect(result.current.isGameStarted).toBe(true);
    expect(result.current.voteTally).toBeNull();
    expect(result.current.myVote).toBeNull();
  });

  it('voteUpdate sets voteTally', () => {
    const { result } = setupHook();

    const tally: VoteTally = { votes: { 'p1': { from: 'e2', to: 'e4' } }, timeLeftMs: 20000, totalVoters: 1 };
    simulate('voteUpdate', tally);

    expect(result.current.voteTally?.votes['p1']).toEqual({ from: 'e2', to: 'e4' });
  });

  it('voteResolved clears myVote and voteTally', () => {
    const { result } = setupHook();

    simulate('voteUpdate', { votes: {}, timeLeftMs: 20000, totalVoters: 0 });
    simulate('voteResolved', { move: { from: 'e2', to: 'e4' }, method: 'plurality' });

    expect(result.current.myVote).toBeNull();
    expect(result.current.voteTally).toBeNull();
  });

  it('gameState clears voteTally when winner is set', () => {
    const { result } = setupHook();

    simulate('voteUpdate', { votes: {}, timeLeftMs: 20000, totalVoters: 0 });
    simulate('gameState', { ...gameState, winner: 'challengers' });

    expect(result.current.voteTally).toBeNull();
  });
});

describe('useSocket — error / edge cases', () => {
  it('host disconnect error (호스트가 방을) resets to lobby', () => {
    const { result } = setupHook();

    simulate('roomJoined', { room: roomInfo, player: challPlayer, challengers: [challPlayer] });
    simulate('error', '호스트가 방을 나갔습니다.');

    expect(result.current.currentRoom).toBeNull();
    expect(result.current.player).toBeNull();
    expect(result.current.challengers).toEqual([]);
    expect(result.current.isGameStarted).toBe(false);
  });

  it('roomList with null defaults to empty array', () => {
    const { result } = setupHook();

    simulate('roomList', null);

    expect(result.current.rooms).toEqual([]);
  });
});
