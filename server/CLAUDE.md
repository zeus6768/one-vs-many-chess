# CLAUDE.md — server

Go backend for one-vs-many-chess. Go 1.26.1, `github.com/notnil/chess`, `github.com/gorilla/websocket`.

## Architecture

```
main.go              Entry point — HTTP server, static file serving (../client/dist), mounts /ws
types/types.go       Shared leaf types: Player, RoomInfo, SessionInfo, ChessMove, GameState, VoteTally, timerHandle
game/chess.go        Pure chess logic — wraps notnil/chess, no I/O
game/room.go         Room state machine — players, voting, turn management, no I/O
manager/manager.go   Thread-safe in-memory session + room registry
handler/hub.go       WebSocket connection registry + per-room broadcast helpers
handler/ws.go        WebSocket upgrade, message dispatch, all event handlers (composition root)
```

### Layering rules

| Layer | Owns | Must not |
|---|---|---|
| `handler` | `*websocket.Conn`, all sends/broadcasts | touch chess logic directly |
| `manager` | session↔socket mapping, room registry, grace period timers | know about WebSocket |
| `game` | chess rules, room state machine, vote resolution | do any I/O |

`handler/ws.go` is the **only** file that touches WebSocket connections. `game/room.go` and `game/chess.go` are pure domain logic.

## Concurrency

Four distinct locking scopes — never hold two locks simultaneously:

1. **Hub `sync.RWMutex`** (`handler/hub.go`): protects `conns` map and `rooms` membership sets. Broadcasts snapshot connections under `RLock`, release before writing to avoid holding during `WriteMessage`.
2. **Manager `sync.RWMutex`** (`manager/manager.go`): single mutex for all manager maps (`rooms`, `playerRooms`, `sessions`, `socketToSess`). `RLock` for lookups, `Lock` for mutations.
3. **Per-room `sync.Mutex` via `sync.Map`** (`handler/ws.go`, `Server.roomMu`): serializes game-state mutations per room. Created lazily with `LoadOrStore`. Used in `handleMakeMove` and `handleDisconnect`.
4. **Per-connection `sync.Mutex`** (`handler/hub.go`, `Conn.mu`): serializes concurrent `WriteMessage` calls to the same socket.

### Goroutine patterns

- **Vote timer** (`game/room.go`): `go func()` with `select` on `time.After` and a cancel channel. Uses `atomic.Int32 voteRound` as a nonce — timer captures the round on spawn; on expiry, if the round advanced, it's a no-op. This prevents stale timers from firing after the host already moved.
- **Grace period timer** (`manager/manager.go`): same nonce-less pattern using a `done` channel. The `timerHandle` wraps the cancel function. Fired `time.AfterFunc` calls `LeaveRoom` only if the channel hasn't been closed.

## WebSocket Event Details

**Client → Server**

| Event | Data | Notes |
|---|---|---|
| `register` | `string` (sessionID) | Must be first message. Re-registering reconnects the session. |
| `getRooms` | — | Returns `roomList` of waiting rooms |
| `createRoom` | `{roomName, playerName}` | |
| `joinRoom` | `{roomId, playerName}` | |
| `leaveRoom` | — | |
| `setHostColor` | `HostColorPreference` (`"white"/"black"/"random"`) | Host only, pre-game only |
| `startGame` | — | Host only, requires ≥1 challenger |
| `makeMove` | `ChessMove {from, to, promotion?}` | Host: direct move. Challenger: vote. Server decides based on session role. |

**Server → Client**

| Event | When |
|---|---|
| `sessionRegistered` | After `register` for a new session |
| `reconnected` | After `register` re-attaches a known session |
| `roomList` | Response to `getRooms` |
| `roomCreated` | After `createRoom` succeeds |
| `roomJoined` | After `joinRoom` succeeds |
| `roomUpdated` | Broadcast to room members on any room state change |
| `playerJoined` / `playerLeft` / `playerReconnected` | Player lifecycle |
| `hostColorChanged` | After `setHostColor` |
| `gameStarted` | After `startGame`, includes initial `GameState` |
| `gameState` | After any move resolves |
| `hostMoved` | Broadcast to challengers when host completes a move |
| `voteUpdate` | Broadcast after each vote cast; includes `VoteTally` |
| `voteResolved` | Broadcast when vote finishes; includes winning move and `GameState` |
| `gameOver` | Game ended; includes winner, reason |
| `error` | Error message (string, in Korean) |

## Game Logic

### ChessGame (`game/chess.go`)

- Nil-safe: every method checks `g == nil || g.game == nil` and returns zero values.
- Move matching uses UCI string (`from + to + promotion`) against `ValidMoves()` — the actual `chess.Move` object is looked up, not constructed.
- `CapturedPieces()` infers captures by diffing current board piece counts vs. starting counts — **not** incremental tracking.
- `Outcome()` → `(winner "white"/"black"/"draw", reason string)`.

### GameRoom state machine (`game/room.go`)

States: `"waiting"` → `"playing"` → `"finished"`

- **Color resolution**: host picks `"white"/"black"/"random"`. Default is `ColorBlack`. Random uses `rand.Float64() < 0.5`. `IsHostTurn` = `chess.Turn() == resolvedHostColor`.
- **Winner translation**: chess color winner (`"white"/"black"`) → role winner (`"host"/"challengers"/"draw"`) in `buildGameState()`.
- **Voting**:
  - Votes stored as `map[playerID]ChessMove`.
  - All votes validated against legal moves before acceptance.
  - Challengers can change their vote (overwrite).
  - Resolution: `"plurality"` (clear winner), `"tiebreak"` (random among tied), `"random"` (no votes cast).
  - After resolution: votes cleared, `voteRound` incremented.
- `ResolveVotes()` panics if called with no game or no legal moves — treated as programmer errors.

### `gameStateToWire` (`handler/ws.go`)

Manually constructs `map[string]interface{}` for the wire format. **Note**: includes `lastMoveSan` which is NOT present in `types.GameState` (it's on `game.GameState`). This is intentional — the wire format is a superset of the exported type struct.

### Two `GameState` types

- `game.GameState` (in `game/room.go`): used internally, no JSON tags, converted to map for wire.
- `types.GameState` (in `types/types.go`): has JSON tags, mirrors the client's TypeScript type. Used in `RoomInfo` and broadcast payloads.

These are separate structs — not aliases. `types.GameState` is the wire contract; `game.GameState` is the internal computation model.

## Error Handling

- All errors are `fmt.Errorf(...)` — no custom error types.
- User-facing errors sent to client via `s.hub.SendTo(socketID, "error", ...)` are in **Korean**.
- Bad JSON input in `dispatch()` is silently dropped (no error sent to client).
- `ResolveVotes()` panics on programmer errors (no game, no legal moves).
- Logging: `log.Printf` throughout. Key events: connect/disconnect, room lifecycle, grace period, reconnect, errors.

## Naming Conventions

- Packages: lowercase single-word (`handler`, `game`, `manager`, `types`).
- Constructors: `New*` (`NewHub()`, `NewChessGame()`, `NewGameRoom()`, `New()` for manager).
- Section headers in long files: `// ── Section name ──────────────────────`.
- Socket ID: `fmt.Sprintf("%p", ws)` — the WebSocket pointer address as string.

## Testing

Standard `testing` package only — no assertion libraries.

Covered: `game/chess_test.go` (13 tests), `game/room_test.go` (18 tests), `manager/manager_test.go` (12 tests). The `handler` package has **no tests**.

- Async tests use `time.Sleep` with generous margins (e.g., 50ms timer, 200ms sleep).
- Test helpers are package-level unexported functions (not `t.Helper()`-based).
- Tests access unexported fields directly (same package): `r.votes`, `r.voteRound`, `r.voteStartTime`.

## Gotchas

- **Socket ID is pointer address** (`fmt.Sprintf("%p", ws)`): safe because the hub tracks active connections, but non-obvious if you're tracing identity through logs.
- **Room mutex entries never cleaned up**: `Server.roomMu` (`sync.Map`) accumulates mutex entries when rooms are deleted. Memory leak for long-running servers with many rooms.
- **`CapturedPieces()` promotion bug**: infers captures by diffing against starting piece counts. A promoted pawn will look like a missing pawn, producing incorrect captured piece display.
- **Grace period callback unlock/relock window** (`handleDisconnect`): the callback acquires the room mutex, calls `LeaveRoom` (which acquires the manager mutex), then re-acquires the room mutex. The unlock/relock creates a window where another goroutine can modify state between the two critical sections.
- **No authentication**: session IDs are client-provided strings via `register`. Any client can claim any session ID.
- **Host color defaults to black**: challengers (white) move first in a default game. This is intentional but easy to miss.
- **`gameStateToWire` wire format is a superset** of `types.GameState`: the `lastMoveSan` field exists on the wire but not in the exported struct. Client-side TypeScript types do include it.
