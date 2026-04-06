package game

import (
	"testing"

	"github.com/notnil/chess"
	"github.com/zeus/one-vs-many-chess/types"
)

// newChessGameFromFEN creates a ChessGame starting from a FEN string.
// Accesses the unexported `game` field since this is package game.
func newChessGameFromFEN(t *testing.T, fen string) *ChessGame {
	t.Helper()
	f, err := chess.FEN(fen)
	if err != nil {
		t.Fatalf("invalid FEN %q: %v", fen, err)
	}
	return &ChessGame{game: chess.NewGame(f)}
}

func chessMove(from, to, promo string) types.ChessMove {
	return types.ChessMove{From: from, To: to, Promotion: promo}
}

func applyMove(g *ChessGame, from, to, promo string) error {
	return g.MakeMove(chessMove(from, to, promo))
}

func TestNewChessGame(t *testing.T) {
	g := NewChessGame()
	if g == nil {
		t.Fatal("expected non-nil game")
	}
	if g.Turn() != "white" {
		t.Errorf("expected white to move first, got %s", g.Turn())
	}
	if g.FEN() == "" {
		t.Error("expected non-empty FEN")
	}
}

func TestMakeMove_Basic(t *testing.T) {
	g := NewChessGame()
	if err := applyMove(g, "e2", "e4", ""); err != nil {
		t.Fatalf("expected valid move e2-e4, got: %v", err)
	}
	if g.Turn() != "black" {
		t.Errorf("expected black to move after e4, got %s", g.Turn())
	}
}

func TestMakeMove_Illegal(t *testing.T) {
	g := NewChessGame()
	if err := applyMove(g, "e2", "e5", ""); err == nil {
		t.Error("expected error for illegal move e2-e5")
	}
}

func TestLegalMoves_Initial(t *testing.T) {
	g := NewChessGame()
	moves := g.LegalMoves()
	// Standard chess: 20 legal moves from starting position (16 pawn + 4 knight)
	if len(moves) != 20 {
		t.Errorf("expected 20 legal moves from start, got %d", len(moves))
	}
}

func TestIsLegalMove(t *testing.T) {
	g := NewChessGame()
	if !g.IsLegalMove(chessMove("e2", "e4", "")) {
		t.Error("e2-e4 should be legal")
	}
	if g.IsLegalMove(chessMove("e2", "e5", "")) {
		t.Error("e2-e5 should not be legal")
	}
}

func TestCheckmate_ScholarsMate(t *testing.T) {
	// Scholar's mate: 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7#
	g := NewChessGame()
	moves := []struct{ from, to, promo string }{
		{"e2", "e4", ""},
		{"e7", "e5", ""},
		{"d1", "h5", ""},
		{"b8", "c6", ""},
		{"f1", "c4", ""},
		{"g8", "f6", ""},
		{"h5", "f7", ""},
	}
	for _, m := range moves {
		if err := applyMove(g, m.from, m.to, m.promo); err != nil {
			t.Fatalf("unexpected error at move %s-%s: %v", m.from, m.to, err)
		}
	}
	winner, reason := g.Outcome()
	if winner != "white" {
		t.Errorf("expected white to win, got %q", winner)
	}
	if reason != "checkmate" {
		t.Errorf("expected checkmate, got %q", reason)
	}
}

func TestOngoingGame_NoOutcome(t *testing.T) {
	g := NewChessGame()
	winner, reason := g.Outcome()
	if winner != "" || reason != "" {
		t.Errorf("expected no outcome at start, got winner=%q reason=%q", winner, reason)
	}
}

func TestIsCheck_Initial(t *testing.T) {
	g := NewChessGame()
	if g.IsCheck() {
		t.Error("should not be in check at start")
	}
}

func TestMoveHistory(t *testing.T) {
	g := NewChessGame()
	if err := applyMove(g, "e2", "e4", ""); err != nil {
		t.Fatal(err)
	}
	if err := applyMove(g, "e7", "e5", ""); err != nil {
		t.Fatal(err)
	}
	history := g.MoveHistory()
	if len(history) != 2 {
		t.Errorf("expected 2 moves in history, got %d", len(history))
	}
	if history[0] != "e4" {
		t.Errorf("expected first move 'e4', got %q", history[0])
	}
	if history[1] != "e5" {
		t.Errorf("expected second move 'e5', got %q", history[1])
	}
}

func TestLastMove(t *testing.T) {
	g := NewChessGame()
	if g.LastMove() != nil {
		t.Error("expected nil LastMove at start")
	}
	applyMove(g, "e2", "e4", "")
	lm := g.LastMove()
	if lm == nil {
		t.Fatal("expected non-nil LastMove after move")
	}
	if lm.From != "e2" || lm.To != "e4" {
		t.Errorf("expected e2-e4, got %s-%s", lm.From, lm.To)
	}
}

func TestKingsideCastling(t *testing.T) {
	// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O
	g := NewChessGame()
	moves := []struct{ from, to, promo string }{
		{"e2", "e4", ""},
		{"e7", "e5", ""},
		{"g1", "f3", ""},
		{"b8", "c6", ""},
		{"f1", "c4", ""},
		{"f8", "c5", ""},
		{"e1", "g1", ""}, // kingside castling — king from e1 to g1
	}
	for i, m := range moves {
		if err := applyMove(g, m.from, m.to, m.promo); err != nil {
			t.Fatalf("move %d (%s-%s) failed: %v", i+1, m.from, m.to, err)
		}
	}
}

func TestEnPassant(t *testing.T) {
	// 1.e4 a6 2.e5 d5 3.exd6 (en passant)
	g := NewChessGame()
	moves := []struct{ from, to, promo string }{
		{"e2", "e4", ""},
		{"a7", "a6", ""},
		{"e4", "e5", ""},
		{"d7", "d5", ""},
		{"e5", "d6", ""}, // en passant capture
	}
	for i, m := range moves {
		if err := applyMove(g, m.from, m.to, m.promo); err != nil {
			t.Fatalf("move %d (%s-%s) failed: %v", i+1, m.from, m.to, err)
		}
	}
	// Black's d pawn should be captured — verify by checking legal moves
	if g.Turn() != "black" {
		t.Errorf("expected black's turn after en passant, got %s", g.Turn())
	}
}

func TestCapturedPieces_Initial(t *testing.T) {
	g := NewChessGame()
	w, b := g.CapturedPieces()
	if len(w) != 0 || len(b) != 0 {
		t.Errorf("expected no captured pieces at start, got %v / %v", w, b)
	}
}

func TestCapturedPieces_AfterCapture(t *testing.T) {
	// 1.e4 d5 2.exd5 — white captures a pawn
	g := NewChessGame()
	applyMove(g, "e2", "e4", "")
	applyMove(g, "d7", "d5", "")
	applyMove(g, "e4", "d5", "") // white captures black pawn
	capturedByWhite, _ := g.CapturedPieces()
	if len(capturedByWhite) != 1 {
		t.Errorf("expected 1 piece captured by white, got %d", len(capturedByWhite))
	}
	if capturedByWhite[0] != "p" {
		t.Errorf("expected black pawn 'p', got %q", capturedByWhite[0])
	}
}

// ── New edge-case tests ───────────────────────────────────────────────────────

func TestNilChessGame_Safety(t *testing.T) {
	var g *ChessGame
	if g.Turn() != "white" {
		t.Errorf("nil Turn() should return 'white', got %q", g.Turn())
	}
	if g.FEN() != "" {
		t.Errorf("nil FEN() should return empty string, got %q", g.FEN())
	}
	if g.LegalMoves() != nil {
		t.Error("nil LegalMoves() should return nil")
	}
	if g.IsCheck() {
		t.Error("nil IsCheck() should return false")
	}
	if g.IsLegalMove(types.ChessMove{From: "e2", To: "e4"}) {
		t.Error("nil IsLegalMove() should return false")
	}
	winner, reason := g.Outcome()
	if winner != "" || reason != "" {
		t.Errorf("nil Outcome() should return empty strings, got %q %q", winner, reason)
	}
	if err := g.MakeMove(types.ChessMove{From: "e2", To: "e4"}); err == nil {
		t.Error("nil MakeMove() should return an error")
	}
	capturedByWhite, capturedByBlack := g.CapturedPieces()
	if capturedByWhite != nil || capturedByBlack != nil {
		t.Error("nil CapturedPieces() should return nils")
	}
	if g.LastMove() != nil {
		t.Error("nil LastMove() should return nil")
	}
	if g.LastMoveSAN() != "" {
		t.Errorf("nil LastMoveSAN() should return empty string, got %q", g.LastMoveSAN())
	}
}

func TestPromotion(t *testing.T) {
	// White pawn on e7, white king on e1, black king on a1.
	// White promotes pawn to queen: e7-e8=q.
	g := newChessGameFromFEN(t, "8/4P3/8/8/8/8/8/k3K3 w - - 0 1")
	if err := applyMove(g, "e7", "e8", "q"); err != nil {
		t.Fatalf("promotion move e7-e8=q failed: %v", err)
	}
	lm := g.LastMove()
	if lm == nil {
		t.Fatal("expected non-nil LastMove after promotion")
	}
	if lm.From != "e7" || lm.To != "e8" {
		t.Errorf("expected e7-e8, got %s-%s", lm.From, lm.To)
	}
	if lm.Promotion != "q" {
		t.Errorf("expected Promotion='q', got %q", lm.Promotion)
	}
}

func TestIsCheck_True(t *testing.T) {
	// 1. e4 f5 2. Qh5+ — white queen gives check to the black king
	g := NewChessGame()
	moves := []struct{ from, to, promo string }{
		{"e2", "e4", ""},
		{"f7", "f5", ""},
		{"d1", "h5", ""}, // Qh5+
	}
	for i, m := range moves {
		if err := applyMove(g, m.from, m.to, m.promo); err != nil {
			t.Fatalf("move %d (%s-%s) failed: %v", i+1, m.from, m.to, err)
		}
	}
	if !g.IsCheck() {
		t.Error("expected IsCheck()=true after Qh5+")
	}
}

func TestStalemate(t *testing.T) {
	// Black king on f8, white pawn on f7, white king on f6.
	// It is black's turn; black has no legal moves and is not in check — stalemate.
	g := newChessGameFromFEN(t, "5k2/5P2/5K2/8/8/8/8/8 b - - 0 1")
	winner, reason := g.Outcome()
	if winner != "draw" {
		t.Errorf("expected 'draw' for stalemate, got winner=%q", winner)
	}
	if reason != "stalemate" {
		t.Errorf("expected reason='stalemate', got %q", reason)
	}
	if len(g.LegalMoves()) != 0 {
		t.Errorf("expected 0 legal moves in stalemate, got %d", len(g.LegalMoves()))
	}
}

func TestCapturedPieces_BlackCapturesWhite(t *testing.T) {
	// 1. e4 d5 2. Nf3 dxe4 — black pawn captures the white e4 pawn
	g := NewChessGame()
	moves := []struct{ from, to, promo string }{
		{"e2", "e4", ""},
		{"d7", "d5", ""},
		{"g1", "f3", ""},
		{"d5", "e4", ""}, // black captures white pawn
	}
	for i, m := range moves {
		if err := applyMove(g, m.from, m.to, m.promo); err != nil {
			t.Fatalf("move %d (%s-%s) failed: %v", i+1, m.from, m.to, err)
		}
	}
	_, capturedByBlack := g.CapturedPieces()
	if len(capturedByBlack) != 1 {
		t.Errorf("expected 1 piece captured by black, got %d", len(capturedByBlack))
	}
	if capturedByBlack[0] != "P" {
		t.Errorf("expected white pawn 'P', got %q", capturedByBlack[0])
	}
}

func TestQueensideCastling(t *testing.T) {
	// 1.d4 d5 2.Nc3 Nc6 3.Bf4 Bf5 4.Qd3 Qd6 5.O-O-O
	// After Nc3 (b1 empty), Bf4 (c1 empty), Qd3 (d1 empty): queenside castling is legal.
	g := NewChessGame()
	moves := []struct{ from, to, promo string }{
		{"d2", "d4", ""},
		{"d7", "d5", ""},
		{"b1", "c3", ""},
		{"b8", "c6", ""},
		{"c1", "f4", ""},
		{"c8", "f5", ""},
		{"d1", "d3", ""},
		{"d8", "d6", ""},
		{"e1", "c1", ""}, // O-O-O: king from e1 to c1
	}
	for i, m := range moves {
		if err := applyMove(g, m.from, m.to, m.promo); err != nil {
			t.Fatalf("move %d (%s-%s) failed: %v", i+1, m.from, m.to, err)
		}
	}
	lm := g.LastMove()
	if lm == nil || lm.From != "e1" || lm.To != "c1" {
		t.Errorf("expected last move e1-c1 (O-O-O), got %v", lm)
	}
}

func TestLastMoveSAN(t *testing.T) {
	g := NewChessGame()
	if g.LastMoveSAN() != "" {
		t.Errorf("expected empty LastMoveSAN before any moves, got %q", g.LastMoveSAN())
	}
	applyMove(g, "e2", "e4", "")
	if g.LastMoveSAN() != "e4" {
		t.Errorf("expected 'e4', got %q", g.LastMoveSAN())
	}
	applyMove(g, "e7", "e5", "")
	if g.LastMoveSAN() != "e5" {
		t.Errorf("expected 'e5', got %q", g.LastMoveSAN())
	}
}
