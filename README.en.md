**Language:** [한국어](README.md) | English

# One vs Many Chess

A real-time multiplayer game where one host plays chess against a team of challengers on a **single shared board**. Challengers collectively decide each move through voting.

## How to Play

- **Host**: Creates the room and selects a piece color (white, black, or random) before the game starts
- **Challengers**: Join the room and vote together as a team on each move
- **Board**: 8×8 chess board (single shared board)
- **Win condition**: Checkmate the opponent's king

### Chess Rules

- White moves first — if the host plays white, the host moves first; if the host plays black, challengers vote first
- Full chess rules supported: castling, en passant, and pawn promotion
- **Draws**: stalemate, 50-move rule, threefold repetition, insufficient material

### Promotion Voting

When a pawn reaches the promotion rank, each promotion choice (e.g. e7→e8=Queen vs e7→e8=Knight) is counted as a separate vote. The host selects the promotion piece directly when moving.

### Turn Flow

1. White moves first — if the host plays white, the host moves first; if the host plays black, challengers vote first
2. **Host turn**: Click a piece, then click the destination square to move
3. **Challenger voting**: A 30-second timer starts — each challenger clicks a source square and destination square to cast or change their vote; promotion moves show a dialog to select the piece before submitting
4. Live vote tallies are visible to everyone in real-time
5. When the timer expires (or all challengers have voted), the plurality-vote move is played; ties are broken randomly; no votes → a random legal move is chosen

## Tech Stack

### Client

- React 18 + TypeScript
- Vite
- Raw WebSocket (no Socket.io)
- Korean / English UI (auto-detected from browser language)
- Standalone web app

### Server

- Go
- gorilla/websocket
- notnil/chess (chess engine)

## Running the App

### Start the Server

```bash
cd server
go mod tidy
go run main.go
```

The server runs at `http://localhost:3001`.

### Start the Client

```bash
cd client
npm install
npm run dev
```

The client runs at `http://localhost:5173`.

## Testing

### Server Tests

```bash
cd server
go test ./...
```

With race detector:

```bash
cd server
go test -race ./...
```

## Build

### Client Build

```bash
cd client
npm run build
```

### Server Build

```bash
cd server
go build -o chess-server .
./chess-server
```
