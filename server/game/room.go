package game

import (
	"fmt"
	"math/rand"
	"sync/atomic"
	"time"

	"github.com/zeus/one-vs-many-chess/types"
)

const DefaultVoteTimeoutMs = 30000

// GameRoom manages one room: players, turn order, voting, and the chess game.
// It mirrors the structure of the omok GameRoom.ts.
// All methods must be called while holding the caller's lock; GameRoom itself
// does not synchronize (the handler layer holds the room mutex).
type GameRoom struct {
	ID     string
	Name   string
	Host   types.Player
	Challengers []types.Player
	Game   *GameState // nil until game starts; exported for handler access
	Status string     // "waiting", "playing", "finished"

	hostColorPref  types.HostColorPreference
	resolvedColor  string // "white" or "black" (host's resolved color)
	chess          *ChessGame
	votes          map[string]types.ChessMove // challengerId → voted move
	voteStartTime  time.Time
	voteRound      atomic.Int32 // incremented each host move; read atomically by timer goroutine
	voteCancel     func()       // cancels the current vote timer goroutine
	voteTimeoutMs  int
	hostTimeoutMs  int

	hostMoveStartTime time.Time
	hostMoveCancel    func() // cancels the current host-move timer goroutine
}

// GameState is the room-level game state (wraps ChessGame output).
type GameState struct {
	FEN            string
	IsHostTurn     bool
	Winner         string // "host", "challengers", "draw", ""
	WinReason      string
	LastMove       *types.ChessMove
	LastMoveSAN    string
	HostColor      string
	MoveHistory    []string
	CapturedPieces types.CapturedPieces
	IsCheck        bool
	LegalMoves     []types.ChessMove
}

// NewGameRoom creates a waiting room with the given host.
func NewGameRoom(id, name string, host types.Player, voteTimeoutMs int) *GameRoom {
	if voteTimeoutMs <= 0 {
		voteTimeoutMs = DefaultVoteTimeoutMs
	}
	return &GameRoom{
		ID:            id,
		Name:          name,
		Host:          host,
		Status:        "waiting",
		hostColorPref: types.ColorBlack,
		votes:         make(map[string]types.ChessMove),
		voteTimeoutMs: voteTimeoutMs,
		hostTimeoutMs: voteTimeoutMs,
	}
}

// AddChallenger adds a challenger if the room is waiting and not already joined.
func (r *GameRoom) AddChallenger(player types.Player) bool {
	if r.Status != "waiting" {
		return false
	}
	for _, c := range r.Challengers {
		if c.ID == player.ID {
			return false
		}
	}
	r.Challengers = append(r.Challengers, player)
	return true
}

// RemoveChallenger removes a challenger and their vote.
func (r *GameRoom) RemoveChallenger(playerID string) bool {
	for i, c := range r.Challengers {
		if c.ID == playerID {
			r.Challengers = append(r.Challengers[:i], r.Challengers[i+1:]...)
			delete(r.votes, playerID)
			return true
		}
	}
	return false
}

// SetHostColor sets the host's color preference while waiting.
func (r *GameRoom) SetHostColor(pref types.HostColorPreference) bool {
	if r.Status != "waiting" {
		return false
	}
	r.hostColorPref = pref
	return true
}

// StartGame initializes the chess game and transitions to "playing".
// Returns false if there are no challengers.
func (r *GameRoom) StartGame() bool {
	if len(r.Challengers) == 0 {
		return false
	}
	// Resolve color preference.
	switch r.hostColorPref {
	case types.ColorWhite:
		r.resolvedColor = "white"
	case types.ColorBlack:
		r.resolvedColor = "black"
	default: // random
		if rand.Float64() < 0.5 {
			r.resolvedColor = "white"
		} else {
			r.resolvedColor = "black"
		}
	}

	r.Status = "playing"
	r.chess = NewChessGame()
	r.votes = make(map[string]types.ChessMove)
	r.voteRound.Store(0)
	r.Game = r.buildGameState()
	return true
}

// MakeHostMove applies the host's move. Returns an error if invalid.
// Cancels the host-move timer (if running) before applying the move.
func (r *GameRoom) MakeHostMove(move types.ChessMove) error {
	r.ClearHostMoveTimer()
	if r.Game == nil || r.Status != "playing" {
		return fmt.Errorf("game not in progress")
	}
	if !r.Game.IsHostTurn {
		return fmt.Errorf("not host's turn")
	}
	if r.Game.Winner != "" {
		return fmt.Errorf("game already over")
	}
	if err := r.chess.MakeMove(move); err != nil {
		return err
	}
	r.votes = make(map[string]types.ChessMove)
	r.voteRound.Add(1)
	r.Game = r.buildGameState()
	return nil
}

// CastVote records or updates a challenger's vote.
func (r *GameRoom) CastVote(challengerID string, move types.ChessMove) bool {
	if r.Game == nil || r.Game.IsHostTurn || r.Game.Winner != "" {
		return false
	}
	if !r.isChallenger(challengerID) {
		return false
	}
	if !r.chess.IsLegalMove(move) {
		return false
	}
	r.votes[challengerID] = move
	return true
}

// AllVotesIn returns true when every challenger has voted.
func (r *GameRoom) AllVotesIn() bool {
	for _, c := range r.Challengers {
		if _, ok := r.votes[c.ID]; !ok {
			return false
		}
	}
	return true
}

// ResolveVotes tallies votes and applies the winning move.
// Returns the move chosen and the method used.
func (r *GameRoom) ResolveVotes() (types.ChessMove, string) {
	if r.chess == nil {
		panic("ResolveVotes called with no chess game")
	}

	var chosen types.ChessMove
	var method string

	if len(r.votes) == 0 {
		// No votes — pick a random legal move.
		legal := r.chess.LegalMoves()
		if len(legal) == 0 {
			panic("ResolveVotes: no legal moves available")
		}
		chosen = legal[rand.Intn(len(legal))]
		method = "random"
	} else {
		// Tally by move key.
		tally := make(map[string]struct {
			move  types.ChessMove
			count int
		})
		for _, vote := range r.votes {
			key := voteKey(vote)
			entry := tally[key]
			entry.move = vote
			entry.count++
			tally[key] = entry
		}

		// Find max count.
		maxCount := 0
		for _, entry := range tally {
			if entry.count > maxCount {
				maxCount = entry.count
			}
		}

		// Collect winners.
		var winners []types.ChessMove
		for _, entry := range tally {
			if entry.count == maxCount {
				winners = append(winners, entry.move)
			}
		}

		if len(winners) == 1 {
			chosen = winners[0]
			method = "plurality"
		} else {
			chosen = winners[rand.Intn(len(winners))]
			method = "tiebreak"
		}
	}

	// Apply the move.
	if err := r.chess.MakeMove(chosen); err != nil {
		// Shouldn't happen since we validated votes, but fall back to random.
		legal := r.chess.LegalMoves()
		if len(legal) == 0 {
			panic(fmt.Sprintf("ResolveVotes: cannot apply chosen move and no fallback: %v", err))
		}
		chosen = legal[rand.Intn(len(legal))]
		r.chess.MakeMove(chosen) //nolint:errcheck
		method = "random"
	}

	r.votes = make(map[string]types.ChessMove)
	r.Game = r.buildGameState()
	return chosen, method
}

// StartVoteTimer starts a background timer that calls onExpire after the
// configured timeout. Cancels any previously running timer.
func (r *GameRoom) StartVoteTimer(onExpire func()) {
	r.ClearVoteTimer()
	r.voteStartTime = time.Now()
	capturedRound := r.voteRound.Load()

	done := make(chan struct{})
	r.voteCancel = func() {
		close(done)
	}

	go func() {
		select {
		case <-time.After(time.Duration(r.voteTimeoutMs) * time.Millisecond):
			if r.voteRound.Load() == capturedRound {
				onExpire()
			}
		case <-done:
		}
	}()
}

// ClearVoteTimer cancels the running vote timer, if any.
func (r *GameRoom) ClearVoteTimer() {
	if r.voteCancel != nil {
		r.voteCancel()
		r.voteCancel = nil
	}
}

// GetVoteTally returns the current vote state.
func (r *GameRoom) GetVoteTally() types.VoteTally {
	votes := make(types.VoteMap)
	for id, move := range r.votes {
		votes[id] = move
	}
	var timeLeftMs int64
	if !r.voteStartTime.IsZero() {
		elapsed := time.Since(r.voteStartTime).Milliseconds()
		timeLeft := int64(r.voteTimeoutMs) - elapsed
		if timeLeft < 0 {
			timeLeft = 0
		}
		timeLeftMs = timeLeft
	}
	return types.VoteTally{
		Votes:       votes,
		TimeLeftMs:  timeLeftMs,
		TotalVoters: len(r.Challengers),
	}
}

// StartHostMoveTimer starts a background timer that calls onExpire after the
// configured timeout. Cancels any previously running timer.
func (r *GameRoom) StartHostMoveTimer(onExpire func()) {
	r.ClearHostMoveTimer()
	r.hostMoveStartTime = time.Now()

	done := make(chan struct{})
	r.hostMoveCancel = func() {
		close(done)
	}

	go func() {
		select {
		case <-time.After(time.Duration(r.hostTimeoutMs) * time.Millisecond):
			onExpire()
		case <-done:
		}
	}()
}

// ClearHostMoveTimer cancels the running host-move timer, if any.
func (r *GameRoom) ClearHostMoveTimer() {
	if r.hostMoveCancel != nil {
		r.hostMoveCancel()
		r.hostMoveCancel = nil
	}
	r.hostMoveStartTime = time.Time{}
}

// GetHostTimeLeft returns the milliseconds remaining on the host-move timer.
func (r *GameRoom) GetHostTimeLeft() int64 {
	if r.hostMoveStartTime.IsZero() {
		return 0
	}
	elapsed := time.Since(r.hostMoveStartTime).Milliseconds()
	timeLeft := int64(r.hostTimeoutMs) - elapsed
	if timeLeft < 0 {
		timeLeft = 0
	}
	return timeLeft
}

// ToRoomInfo returns the stripped-down room info for listing.
func (r *GameRoom) ToRoomInfo() types.RoomInfo {
	return types.RoomInfo{
		ID:              r.ID,
		Name:            r.Name,
		HostName:        r.Host.Name,
		ChallengerCount: len(r.Challengers),
		Status:          r.Status,
		HostColor:       r.hostColorPref,
	}
}

// buildGameState constructs the current GameState from the chess engine.
func (r *GameRoom) buildGameState() *GameState {
	winner, winReason := r.chess.Outcome()

	// Map chess color winner to room winner.
	roomWinner := ""
	if winner != "" && winner != "draw" {
		if winner == r.resolvedColor {
			roomWinner = "host"
		} else {
			roomWinner = "challengers"
		}
	} else if winner == "draw" {
		roomWinner = "draw"
	}

	// It's the host's turn when chess says it's the host's color's turn.
	isHostTurn := r.chess.Turn() == r.resolvedColor

	capturedByWhite, capturedByBlack := r.chess.CapturedPieces()
	var capturedByHost, capturedByChallengers []string
	if r.resolvedColor == "white" {
		capturedByHost = capturedByWhite
		capturedByChallengers = capturedByBlack
	} else {
		capturedByHost = capturedByBlack
		capturedByChallengers = capturedByWhite
	}
	// Ensure non-nil so JSON serializes as [] not null — nil slices crash clients.
	if capturedByHost == nil {
		capturedByHost = []string{}
	}
	if capturedByChallengers == nil {
		capturedByChallengers = []string{}
	}

	// Legal moves for whoever's turn it currently is.
	legalMoves := r.chess.LegalMoves()

	return &GameState{
		FEN:         r.chess.FEN(),
		IsHostTurn:  isHostTurn,
		Winner:      roomWinner,
		WinReason:   winReason,
		LastMove:    r.chess.LastMove(),
		LastMoveSAN: r.chess.LastMoveSAN(),
		HostColor:   r.resolvedColor,
		MoveHistory: r.chess.MoveHistory(),
		CapturedPieces: types.CapturedPieces{
			ByHost:        capturedByHost,
			ByChallengers: capturedByChallengers,
		},
		IsCheck:    r.chess.IsCheck(),
		LegalMoves: legalMoves,
	}
}

func (r *GameRoom) isChallenger(id string) bool {
	for _, c := range r.Challengers {
		if c.ID == id {
			return true
		}
	}
	return false
}

// voteKey produces a canonical string key for a chess move vote.
func voteKey(m types.ChessMove) string {
	return m.From + m.To + m.Promotion
}
