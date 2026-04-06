# CLAUDE.md — client

React 19 + TypeScript 5.9 + Vite 8 frontend. Zero runtime dependencies beyond React itself.

## Architecture

```
src/
  main.tsx                    StrictMode + createRoot
  App.tsx                     Top-level: switches Lobby ↔ GameRoom, error toast, reconnecting overlay
  types/
    game.ts                   All shared types + PIECE_VALUES constant + materialAdvantage()
  hooks/
    useSocket.ts              All application state + raw WebSocket + server communication
  i18n/
    ko.ts                     Korean strings, defines I18nKey type (canonical source)
    en.ts                     English strings, typed as Record<I18nKey, string>
    index.ts                  useI18n() hook — auto-detects navigator.language
  components/
    Lobby.tsx                 Room list, name input, create/join room
    GameRoom.tsx              Pre-game + in-game UI; contains sub-components Header, GameOverBanner, useCountdown
    Board.tsx                 Chess board rendering, FEN parsing, move/vote selection, promotion detection
    Piece.tsx                 All 12 inline SVG chess pieces (Cburnett-style)
    PromotionDialog.tsx       Pawn promotion modal — 4 piece options
    PlayerList.tsx            Host + challengers with color dots; contains sub-component ColorDot
    MoveHistory.tsx           Two-column SAN move list, auto-scrolls to latest
    CapturedPieces.tsx        Captured pieces with material advantage; contains sub-component PieceRow
```

## Styling

**100% inline styles** — `style={{...}}` on every JSX element. No CSS framework, no CSS modules, no CSS-in-JS library.

`App.css`, `index.css`, and `src/assets/` are **dead code** left from the Vite scaffold — never imported anywhere. Do not add CSS files.

### Color palette (chess.com-inspired dark theme)

| Role | Value |
|---|---|
| Background | `#312e2b` |
| Card / panel | `#272522` |
| Border / inactive | `#3d3a38` |
| Text primary | `#fff` |
| Text secondary | `#bababa` |
| Text muted | `#555` / `#666` |
| Accent green (buttons, active) | `#81b64c` |
| Board light square | `#eeeed2` |
| Board dark square | `#769656` |
| Last move highlight | `#cdd16a` (light) / `#aaa23a` (dark) |
| Selection highlight | `#f7f769` (light) / `#d4c846` (dark) |
| Check / error | `#e74c3c` |
| Vote badge | `#3b82f6` (blue) |
| Own vote highlight | `#f59e0b` (amber) |

## Component Patterns

- **Named exports** for all components: `export function Board(...)`. Only `App` uses `export default`.
- **No `React.FC`**, no `memo`, no `forwardRef`. Plain function components.
- **Props interfaces** defined inline above each component: `interface BoardProps { ... }`.
- **Sub-components** (e.g., `Header`, `GameOverBanner` in `GameRoom.tsx`; `ColorDot` in `PlayerList.tsx`) are plain functions in the same file — not exported.
- **`useCountdown`** is defined inside `GameRoom.tsx`, not in `hooks/` — it's a local hook, not reused.
- **Hover effects** in `PromotionDialog.tsx` use imperative `onMouseEnter`/`onMouseLeave` to mutate `style` properties directly.

## State Management

All application state lives in `useSocket.ts`. No context, no reducer, no external library. State is lifted through `App.tsx` and passed as props.

### State variables (13)

| Variable | Type | Purpose |
|---|---|---|
| `isConnected` | `boolean` | WebSocket connection status |
| `isReconnecting` | `boolean` | Show reconnecting overlay |
| `rooms` | `RoomInfo[]` | Available rooms list |
| `currentRoom` | `RoomInfo \| null` | Current room (null = lobby) |
| `player` | `Player \| null` | This client's player info |
| `gameState` | `GameState \| null` | Full game state from server |
| `challengers` | `Player[]` | Challenger player list |
| `isGameStarted` | `boolean` | Whether game is in progress |
| `voteTally` | `VoteTally \| null` | Current vote state |
| `myVote` | `ChessMove \| null` | This player's submitted vote |
| `error` | `string \| null` | Error message for toast |
| `hostColorPreference` | `HostColorPreference` | Host's color choice |

### WebSocket connection

Custom `ReconnectingWS` class (not Socket.IO). Reconnects with exponential backoff: 1s initial, ×1.5 multiplier, 5s max. Connects to `${VITE_SERVER_URL}/ws` (defaults to `ws://localhost:3001`).

Session persisted in `localStorage` key `chess_session_id` via `crypto.randomUUID()`. Re-sent on every reconnect as `register(sessionId)`.

### Client actions emitted

`register`, `getRooms`, `createRoom`, `joinRoom`, `leaveRoom`, `startGame`, `makeMove`, `setHostColor`

### Server events handled

`sessionRegistered`, `reconnected`, `roomList`, `roomCreated`, `roomJoined`, `roomUpdated`, `playerJoined`, `playerLeft`, `playerReconnected`, `gameStarted`, `gameState`, `hostMoved`, `voteUpdate`, `voteResolved`, `gameOver`, `hostColorChanged`, `error`

## i18n System

- `ko.ts` is **canonical**: defines the strings object `as const` and exports `I18nKey = keyof typeof ko`.
- `en.ts` is typed as `Record<I18nKey, string>` — TypeScript enforces completeness.
- `useI18n()` in `index.ts`: detects browser language from `navigator.language` once on mount, returns `{ t, lang }`. No language-switching UI.
- `t` is **passed as a prop** through the component tree — not via context. Typed as `(key: I18nKey) => string`.
- Import `I18nKey` from `'../i18n/ko'` (not from `'../i18n'`).
- 74 translation keys covering all UI strings.

## Board Rendering (`Board.tsx`)

- **FEN parsing**: custom `parseFEN()` converts FEN to a 64-element array. Index 0 = a8 (top-left), index 63 = h1 (bottom-right).
- **Layout**: CSS flexbox with `flex-wrap: wrap`, each square is `width: 12.5%` with `aspectRatio: 1`. Board is `min(80vw, 480px)`.
- **Flipping**: `isFlipped` is true for challengers. Visual index = `isFlipped ? 63-i : i`. Own pieces always at the bottom.
- **Legal move indicators**: small circle (32% of square) for empty target squares; border ring for capture squares.
- **Vote visualization**: blue badge on destination squares (vote count); amber border on the player's own voted square.
- **Check highlight**: king square background → `#e74c3c`.
- **Piece size**: `Math.floor(window.innerWidth * 0.055)` — viewport-relative but recalculated on every render, no resize listener.

## Gotchas

- **Korean substring check for host disconnect**: `useSocket.ts` detects host-left errors by checking if the error string contains `'호스트가 방을'` or `'호스트가 연결'`. This is language-dependent on server-side Korean error messages — changing server error strings will break this detection.
- **`castVote` is optimistic**: sets `myVote` locally before server confirmation. If the server rejects the vote, the UI can be momentarily out of sync.
- **No resize listener on board**: `window.innerWidth * 0.055` piece size is computed on every render but doesn't react to window resize events. Resizing the window only re-calculates on the next render trigger.
- **`PromotionDialog` cancel not i18n'd**: the cancel button is hardcoded `"Cancel"` in English, not using the i18n system.
- **Dead files** — never imported, can be deleted safely:
  - `src/App.css`, `src/index.css`
  - `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`
  - `public/icons.svg`
- **`CapturedPieces` unused prop**: `hostColor` is received in props but not referenced in the function body. The `isHost` prop is used instead for sign-flipping advantage.
- **`useEffect` ESLint disable** in `useSocket.ts`: the hook setup effect has `// eslint-disable-next-line react-hooks/exhaustive-deps` — intentionally runs only once on mount, not a bug.
- **`I18nKey` source of truth**: import from `'../i18n/ko'`, not `'../i18n'` (the `index.ts` re-exports the hook but not the type).
