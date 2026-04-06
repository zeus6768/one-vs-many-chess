package game

import (
	"sync"
	"testing"
	"time"

	"github.com/zeus/one-vs-many-chess/types"
)

// In standard chess, WHITE moves first.
// - Host WHITE  → host goes first (isHostTurn = true)
// - Host BLACK  → challengers (white) go first (isHostTurn = false)

func makeRoom(voteMs int) *GameRoom {
	host := types.Player{ID: "host1", Name: "Host", IsHost: true}
	return NewGameRoom("room1", "Test Room", host, voteMs)
}

func addChallenger(r *GameRoom, id, name string) types.Player {
	p := types.Player{ID: id, Name: name, IsHost: false}
	r.AddChallenger(p)
	return p
}

// ── Construction ─────────────────────────────────────────────────────────────

func TestNewGameRoom(t *testing.T) {
	r := makeRoom(0)
	if r.Status != "waiting" {
		t.Errorf("expected 'waiting', got %q", r.Status)
	}
	if r.Host.ID != "host1" {
		t.Error("host not set")
	}
	if r.Game != nil {
		t.Error("game should be nil before start")
	}
}

// ── Challenger management ─────────────────────────────────────────────────────

func TestAddChallenger(t *testing.T) {
	r := makeRoom(0)
	p := types.Player{ID: "c1", Name: "Alice", IsHost: false}
	if !r.AddChallenger(p) {
		t.Error("expected AddChallenger to succeed")
	}
	if len(r.Challengers) != 1 {
		t.Errorf("expected 1 challenger, got %d", len(r.Challengers))
	}
}

func TestAddChallenger_Duplicate(t *testing.T) {
	r := makeRoom(0)
	p := types.Player{ID: "c1", Name: "Alice", IsHost: false}
	r.AddChallenger(p)
	if r.AddChallenger(p) {
		t.Error("duplicate AddChallenger should return false")
	}
	if len(r.Challengers) != 1 {
		t.Errorf("expected 1 challenger, got %d", len(r.Challengers))
	}
}

func TestRemoveChallenger(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	if !r.RemoveChallenger("c1") {
		t.Error("expected RemoveChallenger to succeed")
	}
	if len(r.Challengers) != 0 {
		t.Errorf("expected 0 challengers, got %d", len(r.Challengers))
	}
}

// ── StartGame ────────────────────────────────────────────────────────────────

func TestStartGame_NeedsChallengerCount(t *testing.T) {
	r := makeRoom(0)
	if r.StartGame() {
		t.Error("StartGame should fail with no challengers")
	}
}

func TestStartGame_Success(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	if !r.StartGame() {
		t.Error("StartGame should succeed with challenger")
	}
	if r.Status != "playing" {
		t.Errorf("expected 'playing', got %q", r.Status)
	}
	if r.Game == nil {
		t.Error("game should be non-nil after start")
	}
}

func TestStartGame_HostWhiteGoesFirst(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite)
	r.StartGame()
	// Host is white → white goes first in chess → host's turn.
	if !r.Game.IsHostTurn {
		t.Error("host (white) should move first")
	}
}

func TestStartGame_HostBlackChallengersFirst(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()
	// Host is black → challengers are white → challengers go first.
	if r.Game.IsHostTurn {
		t.Error("challengers (white) should move first when host is black")
	}
}

// ── MakeHostMove ─────────────────────────────────────────────────────────────

func TestMakeHostMove_Valid(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite) // host (white) goes first
	r.StartGame()

	err := r.MakeHostMove(types.ChessMove{From: "e2", To: "e4"})
	if err != nil {
		t.Fatalf("expected valid move, got: %v", err)
	}
	if r.Game.IsHostTurn {
		t.Error("should be challengers' turn after host move")
	}
}

func TestMakeHostMove_Invalid(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite)
	r.StartGame()

	if err := r.MakeHostMove(types.ChessMove{From: "e2", To: "e5"}); err == nil {
		t.Error("expected error for illegal move")
	}
}

func TestMakeHostMove_NotHostTurn(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack) // challengers (white) go first
	r.StartGame()

	if err := r.MakeHostMove(types.ChessMove{From: "e2", To: "e4"}); err == nil {
		t.Error("expected error when host tries to move out of turn")
	}
}

// ── CastVote ─────────────────────────────────────────────────────────────────

func TestCastVote_Valid(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack) // challengers (white) go first
	r.StartGame()

	ok := r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	if !ok {
		t.Error("expected valid vote")
	}
}

func TestCastVote_Illegal(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	ok := r.CastVote("c1", types.ChessMove{From: "e2", To: "e5"})
	if ok {
		t.Error("expected vote to fail for illegal move")
	}
}

func TestCastVote_CanChange(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	ok := r.CastVote("c1", types.ChessMove{From: "d2", To: "d4"})
	if !ok {
		t.Error("challenger should be able to change their vote")
	}
	if len(r.votes) != 1 {
		t.Errorf("expected 1 vote after change, got %d", len(r.votes))
	}
}

// ── AllVotesIn ───────────────────────────────────────────────────────────────

func TestAllVotesIn(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	addChallenger(r, "c2", "Bob")
	r.SetHostColor(types.ColorBlack) // challengers (white) go first
	r.StartGame()

	if r.AllVotesIn() {
		t.Error("should not be all-in with 0 votes")
	}
	r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	if r.AllVotesIn() {
		t.Error("should not be all-in with 1 of 2 votes")
	}
	r.CastVote("c2", types.ChessMove{From: "d2", To: "d4"})
	if !r.AllVotesIn() {
		t.Error("should be all-in with 2 of 2 votes")
	}
}

// ── ResolveVotes ─────────────────────────────────────────────────────────────

func TestResolveVotes_Plurality(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	addChallenger(r, "c2", "Bob")
	addChallenger(r, "c3", "Carol")
	r.SetHostColor(types.ColorBlack) // challengers (white) go first
	r.StartGame()

	r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	r.CastVote("c2", types.ChessMove{From: "e2", To: "e4"})
	r.CastVote("c3", types.ChessMove{From: "d2", To: "d4"})

	move, method := r.ResolveVotes()
	if method != "plurality" {
		t.Errorf("expected plurality, got %q", method)
	}
	if move.From != "e2" || move.To != "e4" {
		t.Errorf("expected e2-e4 to win, got %s-%s", move.From, move.To)
	}
}

func TestResolveVotes_Tiebreak(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	addChallenger(r, "c2", "Bob")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	r.CastVote("c2", types.ChessMove{From: "d2", To: "d4"})

	_, method := r.ResolveVotes()
	if method != "tiebreak" {
		t.Errorf("expected tiebreak, got %q", method)
	}
}

func TestResolveVotes_Random(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	// No votes — should pick random.
	_, method := r.ResolveVotes()
	if method != "random" {
		t.Errorf("expected random, got %q", method)
	}
}

func TestResolveVotes_UpdatesGameState(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack) // challengers (white) go first
	r.StartGame()

	r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	r.ResolveVotes()

	// After challengers (white) move, it's host's (black) turn.
	if !r.Game.IsHostTurn {
		t.Error("should be host's turn after challengers resolve")
	}
}

// ── Vote timer ───────────────────────────────────────────────────────────────

func TestVoteTimer_Fires(t *testing.T) {
	r := makeRoom(50) // 50ms timeout
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	var mu sync.Mutex
	fired := false
	r.StartVoteTimer(func() {
		mu.Lock()
		fired = true
		mu.Unlock()
	})

	time.Sleep(200 * time.Millisecond)
	mu.Lock()
	if !fired {
		t.Error("expected vote timer to fire")
	}
	mu.Unlock()
}

func TestVoteTimer_Cancel(t *testing.T) {
	r := makeRoom(50)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	fired := false
	r.StartVoteTimer(func() {
		fired = true
	})
	r.ClearVoteTimer()

	time.Sleep(150 * time.Millisecond)
	if fired {
		t.Error("cancelled timer should not fire")
	}
}

func TestVoteTimer_RoundNonce(t *testing.T) {
	r := makeRoom(50)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	fired := false
	r.StartVoteTimer(func() {
		fired = true
	})

	// Simulate a new round — stale timer's capturedRound no longer matches.
	r.voteRound.Add(1)

	time.Sleep(150 * time.Millisecond)
	if fired {
		t.Error("stale timer from previous round should not fire")
	}
}

// ── Game-over paths ───────────────────────────────────────────────────────────

// playScholarsMate plays out Scholar's Mate via the room API.
// Host is white and delivers checkmate on the last move.
func playScholarsMate(t *testing.T, r *GameRoom) {
	t.Helper()
	// Scholar's Mate: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#
	type step struct {
		isHost         bool
		from, to, promo string
	}
	steps := []step{
		{true, "e2", "e4", ""},
		{false, "e7", "e5", ""},
		{true, "d1", "h5", ""},
		{false, "b8", "c6", ""},
		{true, "f1", "c4", ""},
		{false, "g8", "f6", ""},
		{true, "h5", "f7", ""}, // Qxf7#
	}
	for _, s := range steps {
		if s.isHost {
			if err := r.MakeHostMove(types.ChessMove{From: s.from, To: s.to, Promotion: s.promo}); err != nil {
				t.Fatalf("host move %s-%s failed: %v", s.from, s.to, err)
			}
		} else {
			r.CastVote("c1", types.ChessMove{From: s.from, To: s.to, Promotion: s.promo})
			r.ResolveVotes()
		}
	}
}

func TestMakeHostMove_Checkmate(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite) // host (white) goes first
	r.StartGame()

	playScholarsMate(t, r)

	if r.Game.Winner != "host" {
		t.Errorf("expected winner='host', got %q", r.Game.Winner)
	}
	if r.Game.WinReason != "checkmate" {
		t.Errorf("expected reason='checkmate', got %q", r.Game.WinReason)
	}
	if len(r.Game.LegalMoves) != 0 {
		t.Errorf("expected 0 legal moves after checkmate, got %d", len(r.Game.LegalMoves))
	}
}

func TestResolveVotes_Checkmate(t *testing.T) {
	// Challengers are white; Scholar's Mate delivered via votes.
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack) // challengers (white) go first
	r.StartGame()

	type step struct {
		isHost         bool
		from, to, promo string
	}
	steps := []step{
		{false, "e2", "e4", ""},
		{true, "e7", "e5", ""},
		{false, "d1", "h5", ""},
		{true, "b8", "c6", ""},
		{false, "f1", "c4", ""},
		{true, "g8", "f6", ""},
		{false, "h5", "f7", ""}, // Qxf7# via vote
	}
	for _, s := range steps {
		if s.isHost {
			if err := r.MakeHostMove(types.ChessMove{From: s.from, To: s.to, Promotion: s.promo}); err != nil {
				t.Fatalf("host move %s-%s failed: %v", s.from, s.to, err)
			}
		} else {
			r.CastVote("c1", types.ChessMove{From: s.from, To: s.to, Promotion: s.promo})
			r.ResolveVotes()
		}
	}

	if r.Game.Winner != "challengers" {
		t.Errorf("expected winner='challengers', got %q", r.Game.Winner)
	}
	if r.Game.WinReason != "checkmate" {
		t.Errorf("expected reason='checkmate', got %q", r.Game.WinReason)
	}
}

func TestBuildGameState_Fields(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite)
	r.StartGame()

	gs := r.Game
	if gs == nil {
		t.Fatal("expected non-nil GameState after StartGame")
	}
	if gs.FEN == "" {
		t.Error("expected non-empty FEN")
	}
	if !gs.IsHostTurn {
		t.Error("expected IsHostTurn=true when host is white at game start")
	}
	if gs.HostColor != "white" {
		t.Errorf("expected HostColor='white', got %q", gs.HostColor)
	}
	if gs.Winner != "" || gs.WinReason != "" {
		t.Errorf("expected no winner at start, got %q/%q", gs.Winner, gs.WinReason)
	}
	if len(gs.LegalMoves) != 20 {
		t.Errorf("expected 20 legal moves at start, got %d", len(gs.LegalMoves))
	}
	if gs.LastMove != nil {
		t.Error("expected nil LastMove at game start")
	}
	if gs.IsCheck {
		t.Error("expected IsCheck=false at game start")
	}
	if len(gs.MoveHistory) != 0 {
		t.Errorf("expected empty MoveHistory at start, got %d", len(gs.MoveHistory))
	}
	if len(gs.CapturedPieces.ByHost) != 0 || len(gs.CapturedPieces.ByChallengers) != 0 {
		t.Error("expected no captured pieces at game start")
	}
}

func TestWinnerMapping_Draw(t *testing.T) {
	// Load a stalemate FEN (black to move, no legal moves, not in check).
	// Host is white → resolvedColor="white". Black (challengers) is stalemated → draw.
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite)
	r.StartGame()

	r.chess = newChessGameFromFEN(t, "5k2/5P2/5K2/8/8/8/8/8 b - - 0 1")
	r.Game = r.buildGameState()

	if r.Game.Winner != "draw" {
		t.Errorf("expected winner='draw' for stalemate, got %q", r.Game.Winner)
	}
	if r.Game.WinReason != "stalemate" {
		t.Errorf("expected reason='stalemate', got %q", r.Game.WinReason)
	}
}

// ── Additional StartGame / challenger management edge cases ───────────────────

func TestSetHostColor_Random(t *testing.T) {
	r := makeRoom(0)
	if !r.SetHostColor(types.ColorRandom) {
		t.Error("SetHostColor('random') should return true while waiting")
	}
	addChallenger(r, "c1", "Alice")
	if !r.StartGame() {
		t.Error("StartGame should succeed with random color preference")
	}
	// resolvedColor must be one of the two concrete colors.
	if r.resolvedColor != "white" && r.resolvedColor != "black" {
		t.Errorf("expected resolvedColor 'white' or 'black', got %q", r.resolvedColor)
	}
}

func TestAddChallenger_WhilePlaying(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.StartGame()

	p := types.Player{ID: "c2", Name: "Bob", IsHost: false}
	if r.AddChallenger(p) {
		t.Error("AddChallenger should return false when game is already playing")
	}
}

func TestRemoveChallenger_NotFound(t *testing.T) {
	r := makeRoom(0)
	if r.RemoveChallenger("nonexistent") {
		t.Error("RemoveChallenger should return false for unknown player ID")
	}
}

func TestVoteTimer_Replaced(t *testing.T) {
	r := makeRoom(50)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	var mu sync.Mutex
	count := 0

	r.StartVoteTimer(func() {
		mu.Lock()
		count++
		mu.Unlock()
	})
	// Immediately replace with a new timer.
	r.StartVoteTimer(func() {
		mu.Lock()
		count++
		mu.Unlock()
	})

	time.Sleep(200 * time.Millisecond)
	mu.Lock()
	defer mu.Unlock()
	if count != 1 {
		t.Errorf("expected exactly 1 timer fire after replacement, got %d", count)
	}
}

func TestCastVote_HostTurn(t *testing.T) {
	r := makeRoom(0)
	addChallenger(r, "c1", "Alice")
	r.SetHostColor(types.ColorWhite) // host goes first
	r.StartGame()

	// It is host's turn — challenger vote should be rejected.
	ok := r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})
	if ok {
		t.Error("CastVote should return false when it is the host's turn")
	}
}

// ── GetVoteTally ─────────────────────────────────────────────────────────────

func TestGetVoteTally(t *testing.T) {
	r := makeRoom(5000)
	addChallenger(r, "c1", "Alice")
	addChallenger(r, "c2", "Bob")
	r.SetHostColor(types.ColorBlack)
	r.StartGame()

	r.voteStartTime = time.Now()
	r.CastVote("c1", types.ChessMove{From: "e2", To: "e4"})

	tally := r.GetVoteTally()
	if tally.TotalVoters != 2 {
		t.Errorf("expected 2 voters, got %d", tally.TotalVoters)
	}
	if len(tally.Votes) != 1 {
		t.Errorf("expected 1 vote, got %d", len(tally.Votes))
	}
	if tally.TimeLeftMs <= 0 {
		t.Error("expected positive time left")
	}
}
