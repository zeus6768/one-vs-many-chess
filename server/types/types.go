package types

// HostColorPreference is the host's color choice before game start.
type HostColorPreference string

const (
	ColorWhite  HostColorPreference = "white"
	ColorBlack  HostColorPreference = "black"
	ColorRandom HostColorPreference = "random"
)

// ChessMove represents a chess move using algebraic square names.
type ChessMove struct {
	From      string `json:"from"`                // e.g. "e2"
	To        string `json:"to"`                  // e.g. "e4"
	Promotion string `json:"promotion,omitempty"` // "q", "r", "b", "n" (lowercase)
}

// CapturedPieces holds captured pieces for each side.
type CapturedPieces struct {
	ByHost        []string `json:"byHost"`        // piece chars captured by host
	ByChallengers []string `json:"byChallengers"` // piece chars captured by challengers
}

// GameState is the authoritative game state sent to all clients.
type GameState struct {
	FEN            string         `json:"fen"`
	IsHostTurn     bool           `json:"isHostTurn"`
	Winner         string         `json:"winner"`         // "host", "challengers", "draw", ""
	WinReason      string         `json:"winReason"`      // "checkmate", "stalemate", "fifty_move", "threefold", "insufficient", "disconnect", ""
	LastMove       *ChessMove     `json:"lastMove"`       // nil if no move yet
	HostColor      string         `json:"hostColor"`      // "white" or "black"
	MoveHistory    []string       `json:"moveHistory"`    // SAN notation list
	CapturedPieces CapturedPieces `json:"capturedPieces"` // captured pieces per side
	IsCheck        bool           `json:"isCheck"`
	LegalMoves     []ChessMove    `json:"legalMoves"` // legal moves for current side
}

// VoteMove is a vote for a specific chess move.
type VoteMove = ChessMove

// VoteMap maps challengerId to their voted move.
type VoteMap map[string]VoteMove

// VoteTally is the current voting state.
type VoteTally struct {
	Votes       VoteMap `json:"votes"`
	TimeLeftMs  int64   `json:"timeLeftMs"`
	TotalVoters int     `json:"totalVoters"`
}

// Player represents a connected player.
type Player struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	IsHost bool   `json:"isHost"`
}

// RoomInfo is the stripped-down room info for listing.
type RoomInfo struct {
	ID             string              `json:"id"`
	Name           string              `json:"name"`
	HostName       string              `json:"hostName"`
	ChallengerCount int                `json:"challengerCount"`
	Status         string              `json:"status"` // "waiting", "playing", "finished"
	HostColor      HostColorPreference `json:"hostColor"`
}

// SessionInfo holds per-session data including grace period timer.
type SessionInfo struct {
	SessionID   string
	SocketID    string
	PlayerName  string
	IsHost      bool
	RoomID      string // "" if not in a room
	GraceTimer  *timerHandle
}

// timerHandle is an internal handle for a cancelable timer.
type timerHandle struct {
	cancel func()
}

// NewTimerHandle wraps a cancel function.
func NewTimerHandle(cancel func()) *timerHandle {
	return &timerHandle{cancel: cancel}
}

// Cancel stops the timer.
func (t *timerHandle) Cancel() {
	if t != nil {
		t.cancel()
	}
}

// WSMessage is the WebSocket message envelope.
type WSMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data,omitempty"`
}
