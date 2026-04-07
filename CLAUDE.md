# CLAUDE.md — one-vs-many-chess

Real-time multiplayer chess game where 1 host plays against N challengers who collectively vote on moves. Go backend, React + TypeScript frontend.

> See [`server/CLAUDE.md`](server/CLAUDE.md) and [`client/CLAUDE.md`](client/CLAUDE.md) for detailed patterns, conventions, and gotchas.

## Commands

### Server (Go)
```bash
cd server
go mod tidy          # Install dependencies
go run main.go       # Start server (default port 3001)
PORT=3001 go run main.go
go test ./...        # Run all tests
go test -race ./...  # Run with race detector
go build ./...       # Type-check all packages
```

### Client (React + Vite)
```bash
cd client
npm install
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build → dist/
```

## Environment

Create `client/.env.local` to override server URL:
```
VITE_SERVER_URL=ws://localhost:3001
```
Server env vars: `PORT` (default 3001), `GRACE_PERIOD_MS` (default 30000), `VOTE_TIMEOUT_MS` (default 30000).

## WebSocket Protocol

**Message envelope**: `{"event": "eventName", "data": ...}`

**Client → Server**: `register`, `createRoom`, `joinRoom`, `leaveRoom`, `startGame`, `makeMove`, `getRooms`, `setHostColor`

**Server → Client**: `sessionRegistered`, `reconnected`, `roomCreated`, `roomJoined`, `roomUpdated`, `roomList`, `playerJoined`, `playerLeft`, `playerReconnected`, `gameStarted`, `gameState`, `hostMoved`, `hostTimeUpdate`, `voteUpdate`, `voteResolved`, `gameOver`, `error`, `hostColorChanged`

## Turn Cycle

1. **White always moves first**. Host picks White/Black/Random before game starts (default: Black, so challengers move first).
2. **Host turn**: clicks source then destination square → `makeMove`.
3. **Challenger voting**: 30s timer. Each challenger votes via `makeMove` (same event, server differentiates by session role). Can change vote. Server broadcasts `voteUpdate` after each.
4. **Vote resolves** when all challengers voted OR timer expires: plurality wins, ties broken randomly, no votes → random legal move. Server broadcasts `voteResolved` + `gameState`.
5. **Pawn promotion**: each promotion piece is a distinct vote. Client shows `PromotionDialog` before submitting.
6. **Game ends** on checkmate, stalemate, 50-move rule, threefold repetition, insufficient material, or host disconnect.

## Key Dependencies

**Server**: `github.com/notnil/chess` (chess engine), `github.com/gorilla/websocket`
**Client**: React 19, Vite 8 — zero other runtime libraries
