# Requirements — One vs Many Chess

## Overview

A real-time multiplayer game where one host plays chess against a group of challengers on a **single shared board**. The host plays moves individually; challengers collectively decide each move through a voting system.

---

## Players & Roles

| Role | Description |
|---|---|
| **Host** | Creates the room. Selects piece color (white, black, or random) before game start. Plays the side chosen. |
| **Challenger** | Joins an existing room. Votes on which move to play each round. |

- Multiple challengers share one board — they are one team against the host.
- All challengers vote simultaneously; the plurality-vote move is chosen.

---

## Game Rules

- **Board**: Standard 8×8 chess board
- **Supported moves**: All standard chess moves including castling (kingside and queenside), en passant, and pawn promotion
- **Piece color**: Before starting, the host selects white, black, or random. White always moves first (standard chess rule). If "random" is chosen, the server resolves it at game start. Challengers see the host's selection update in real-time.
- **Win/draw conditions**:
  - Checkmate: opponent's king is in check with no legal moves
  - Stalemate: current player has no legal moves (draw)
  - 50-move rule: 50 moves without a capture or pawn move (draw)
  - Threefold repetition: same position reached 3 times (draw)
  - Insufficient material: neither side can force checkmate (draw)
  - Host disconnect: game ends, challengers win

---

## Promotion Voting

When a pawn can promote, each combination of destination square + promotion piece is treated as a **separate vote**. For example, `e7→e8=Q` and `e7→e8=N` are counted independently. The promotion choice with the most votes wins. The host selects promotion piece directly when they move.

---

## Turn Flow

1. The white side moves first. If the host plays white, the host moves first; if the host plays black, challengers vote first.
2. **Host turn**: The host clicks the source square, then the destination square. Legal moves are highlighted on the board.
3. **Challenger voting**: A 30-second timer starts. Each challenger clicks a source square then a destination square to cast a vote (can change vote during the window). For promotion moves, a dialog appears to select the promotion piece before the vote is submitted.
4. Live vote tallies are visible to everyone in real-time — vote counts appear as badges on destination squares.
5. When the timer expires (or all challengers have voted), the move with the most votes is played:
   - **Plurality**: most-voted move wins outright.
   - **Tie-break**: random pick among tied moves.
   - **No votes**: a random legal move is chosen automatically.
6. The move is played. If the game has not ended, it is the opponent's turn.

A challenger who disconnects is removed from the voter pool; voting resolves early if all remaining challengers have voted.

---

## Real-time Communication

All game state lives on the server. The client drives state changes through raw WebSocket events.

**Message envelope**: `{"event": "eventName", "data": {...}}`

### Client → Server

| Event | Description |
|---|---|
| `register` | First event sent; establishes session identity via `sessionId` |
| `createRoom` | Host creates a new room |
| `joinRoom` | Challenger joins an existing room |
| `leaveRoom` | Player leaves the room |
| `startGame` | Host starts the game |
| `makeMove` | Host places a move **or** challenger casts a vote |
| `getRooms` | Request the current room list |
| `setHostColor` | Host sets piece color preference (`white`, `black`, or `random`) before game start |

### Server → Client

| Event | Description |
|---|---|
| `sessionRegistered` | Session ID acknowledged; includes player identity |
| `reconnected` | Player reconnected within grace period; full state restored |
| `roomCreated` | Confirmation that a room was created |
| `roomJoined` | Confirmation that a player joined |
| `roomUpdated` | Room state changed (e.g. new player joined) |
| `roomList` | Current list of open rooms |
| `playerJoined` | A new player joined the room |
| `playerLeft` | A player left or disconnected |
| `playerReconnected` | A player reconnected within the grace period |
| `gameStarted` | Game has begun; includes resolved host color |
| `gameState` | Full shared game state snapshot (sent after every move) |
| `hostMoved` | Host placed a move |
| `voteUpdate` | Live vote tally update (challenger voted or changed vote) |
| `voteResolved` | Voting resolved: winning move + method (`plurality` / `tiebreak` / `random`) |
| `gameOver` | Game ended — includes winner and reason |
| `error` | An error occurred |
| `hostColorChanged` | Host changed their color preference; broadcast to all players in the room |

### Game State (sent to clients)

```typescript
{
  fen: string;                        // Board position in FEN notation
  isHostTurn: boolean;
  winner: 'host' | 'challengers' | 'draw' | null;
  winReason: 'checkmate' | 'stalemate' | 'fifty_move' | 'threefold' | 'insufficient' | 'disconnect' | null;
  lastMove: { from: string; to: string; san: string } | null;
  hostColor: 'white' | 'black';
  moveHistory: string[];              // SAN notation list (e.g. ["e4", "e5", "Nf3"])
  capturedPieces: { byHost: string[]; byChallengers: string[] };
  isCheck: boolean;
  legalMoves: { from: string; to: string; promotion?: string }[];  // Current player's legal moves
  votes: Record<string, { from: string; to: string; promotion?: string }>;  // socketId → move
  voteTally: { move: ChessMove; count: number }[];
  timeLeftMs: number | null;
}
```

---

## Player Identity in UI

Each player can identify themselves in the player list: their own name is displayed in **bold** with a highlight. For example, if Jisu and Jay are both challengers, Jisu sees her name bolded in her UI, and Jay sees his name bolded in his UI. The same applies to the host row.

---

## Platform & Environment

### Client
- React 18 + TypeScript
- Vite (dev server: `http://localhost:5173`)
- Raw WebSocket (no Socket.io)
- Standalone web app
- Korean + English UI — auto-detected from `navigator.language`

### Server
- Go
- `github.com/gorilla/websocket`
- `github.com/notnil/chess` (full chess engine)
- Default port: `3001`

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `GRACE_PERIOD_MS` | `30000` | Reconnection window in milliseconds |
| `VOTE_TIMEOUT_MS` | `30000` | Challenger voting window in milliseconds |
| `VITE_SERVER_URL` | `ws://localhost:3001` | WebSocket server URL for the client |
