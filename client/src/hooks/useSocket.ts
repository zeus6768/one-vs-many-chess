import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Player, RoomInfo, GameState, VoteTally, ChessMove, HostColorPreference,
} from '../types/game';

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'ws://localhost:3001';
const SESSION_KEY = 'chess_session_id';

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ── Reconnecting WebSocket wrapper ────────────────────────────────────────────

class ReconnectingWS {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Array<(data: unknown) => void>>();
  private reconnectDelay = 1000;
  private maxDelay = 5000;
  private closed = false;
  public onOpen?: () => void;
  public onClose?: () => void;

  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.closed) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.onOpen?.();
    };

    this.ws.onclose = () => {
      this.onClose?.();
      if (!this.closed) {
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxDelay);
      }
    };

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data as string) as { event: string; data: unknown };
        const fns = this.handlers.get(event);
        if (fns) fns.forEach(fn => fn(data));
      } catch {
        // ignore malformed messages
      }
    };
  }

  on<T>(event: string, handler: (data: T) => void) {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler as (data: unknown) => void]);
  }

  off(event: string) {
    this.handlers.delete(event);
  }

  emit(event: string, data?: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  destroy() {
    this.closed = true;
    this.ws?.close();
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSocket() {
  const ws = useRef<ReconnectingWS | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [challengers, setChallengers] = useState<Player[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [voteTally, setVoteTally] = useState<VoteTally | null>(null);
  const [myVote, setMyVote] = useState<ChessMove | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostColorPreference, setHostColorPreference] = useState<HostColorPreference>('random');

  useEffect(() => {
    const wsUrl = SERVER_URL.replace(/^http/, 'ws') + '/ws';
    const socket = new ReconnectingWS(wsUrl);
    ws.current = socket;

    socket.onOpen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      socket.emit('register', getOrCreateSessionId());
    };

    socket.onClose = () => {
      setIsConnected(false);
      if (currentRoom) {
        setIsReconnecting(true);
      }
    };

    // ── Server → Client events ─────────────────────────────────────────────

    socket.on<string>('sessionRegistered', () => {
      socket.emit('getRooms');
    });

    socket.on<{
      room: RoomInfo;
      player: Player;
      gameState: GameState | null;
      challengers: Player[];
      voteTally: VoteTally | null;
    }>('reconnected', (data) => {
      setCurrentRoom(data.room);
      setPlayer(data.player);
      setChallengers(data.challengers ?? []);
      setHostColorPreference(data.room.hostColor);
      if (data.gameState) {
        setGameState(data.gameState);
        setIsGameStarted(true);
      }
      if (data.voteTally) {
        setVoteTally(data.voteTally);
        const myId = data.player.id;
        const myVoteMove = data.voteTally.votes[myId];
        setMyVote(myVoteMove ?? null);
      }
      setIsReconnecting(false);
    });

    socket.on<RoomInfo[] | null>('roomList', (data) => setRooms(data ?? []));

    socket.on<{ room: RoomInfo; player: Player }>('roomCreated', (data) => {
      setCurrentRoom(data.room);
      setPlayer(data.player);
      setHostColorPreference(data.room.hostColor);
    });

    socket.on<{ room: RoomInfo; player: Player; challengers: Player[] }>('roomJoined', (data) => {
      setCurrentRoom(data.room);
      setPlayer(data.player);
      setHostColorPreference(data.room.hostColor);
      setChallengers(data.challengers ?? []);
    });

    socket.on<RoomInfo>('roomUpdated', setCurrentRoom);

    socket.on<Player>('playerJoined', (p) => {
      setChallengers(prev => {
        if (prev.find(c => c.id === p.id)) return prev;
        return [...prev, p];
      });
      setCurrentRoom(prev => prev ? { ...prev, challengerCount: prev.challengerCount + 1 } : prev);
    });

    socket.on<string>('playerLeft', (playerId) => {
      setChallengers(prev => prev.filter(c => c.id !== playerId));
      setCurrentRoom(prev => prev ? { ...prev, challengerCount: Math.max(0, prev.challengerCount - 1) } : prev);
    });

    socket.on<string>('playerReconnected', () => {
      // No UI action needed; player list is managed via playerJoined/playerLeft.
    });

    socket.on<null>('gameStarted', () => {
      setIsGameStarted(true);
      setVoteTally(null);
      setMyVote(null);
    });

    socket.on<GameState>('gameState', (state) => {
      setGameState(state);
      if (state.winner) {
        setVoteTally(null);
      }
    });

    socket.on<ChessMove>('hostMoved', () => {
      // gameState event follows — no extra action needed.
    });

    socket.on<VoteTally>('voteUpdate', (tally) => {
      setVoteTally(tally);
    });

    socket.on<{ move: ChessMove; method: string }>('voteResolved', () => {
      setMyVote(null);
      setVoteTally(null);
    });

    socket.on<{ winner: string; reason: string }>('gameOver', (data) => {
      setGameState(prev => prev ? { ...prev, winner: data.winner as GameState['winner'], winReason: data.reason as GameState['winReason'] } : prev);
    });

    socket.on<HostColorPreference>('hostColorChanged', (color) => {
      setHostColorPreference(color);
      setCurrentRoom(prev => prev ? { ...prev, hostColor: color } : prev);
    });

    socket.on<string>('error', (msg) => {
      // If told host left, reset to lobby.
      if (msg.includes('호스트가 방을') || msg.includes('호스트가 연결')) {
        setCurrentRoom(null);
        setPlayer(null);
        setGameState(null);
        setChallengers([]);
        setIsGameStarted(false);
        setVoteTally(null);
        setMyVote(null);
        socket.emit('getRooms');
      }
      setError(msg);
    });

    socket.connect();

    return () => {
      socket.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createRoom = useCallback((roomName: string, playerName: string) => {
    ws.current?.emit('createRoom', { roomName, playerName });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    ws.current?.emit('joinRoom', { roomId, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    ws.current?.emit('leaveRoom');
    setCurrentRoom(null);
    setPlayer(null);
    setGameState(null);
    setChallengers([]);
    setIsGameStarted(false);
    setVoteTally(null);
    setMyVote(null);
    ws.current?.emit('getRooms');
  }, []);

  const startGame = useCallback(() => {
    ws.current?.emit('startGame');
  }, []);

  const makeMove = useCallback((move: ChessMove) => {
    ws.current?.emit('makeMove', move);
  }, []);

  const castVote = useCallback((move: ChessMove) => {
    setMyVote(move);
    ws.current?.emit('makeMove', move);
  }, []);

  const refreshRooms = useCallback(() => {
    ws.current?.emit('getRooms');
  }, []);

  const setHostColor = useCallback((color: HostColorPreference) => {
    ws.current?.emit('setHostColor', color);
    setHostColorPreference(color);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return {
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
    error,
    hostColorPreference,
    // actions
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    makeMove,
    castVote,
    refreshRooms,
    setHostColor,
    dismissError,
  };
}
