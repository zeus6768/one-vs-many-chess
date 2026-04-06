package game

import (
	"fmt"
	"strings"

	"github.com/notnil/chess"
	"github.com/zeus/one-vs-many-chess/types"
)

// ChessGame wraps github.com/notnil/chess and exposes the subset of chess
// functionality needed by the room layer. Pure logic — no I/O.
type ChessGame struct {
	game *chess.Game
}

// NewChessGame creates a game at the standard starting position.
func NewChessGame() *ChessGame {
	return &ChessGame{game: chess.NewGame()}
}

// Turn returns "white" or "black" indicating whose turn it is.
func (g *ChessGame) Turn() string {
	if g == nil || g.game == nil {
		return "white"
	}
	if g.game.Position().Turn() == chess.White {
		return "white"
	}
	return "black"
}

// FEN returns the current FEN string.
func (g *ChessGame) FEN() string {
	if g == nil || g.game == nil {
		return ""
	}
	return g.game.FEN()
}

// MakeMove applies a move given algebraic from/to squares and optional
// promotion piece. Promotion is one of "q", "r", "b", "n" (lowercase).
// Returns an error if the move is illegal.
func (g *ChessGame) MakeMove(m types.ChessMove) error {
	if g == nil || g.game == nil {
		return fmt.Errorf("no game in progress")
	}

	uci := m.From + m.To
	if m.Promotion != "" {
		uci += strings.ToLower(m.Promotion)
	}

	// Match against legal moves by UCI string.
	for _, lm := range g.game.ValidMoves() {
		if lm.String() == uci {
			return g.game.Move(lm)
		}
	}
	return fmt.Errorf("illegal move: %s", uci)
}

// LegalMoves returns all legal moves for the current position.
func (g *ChessGame) LegalMoves() []types.ChessMove {
	if g == nil || g.game == nil {
		return nil
	}
	moves := g.game.ValidMoves()
	result := make([]types.ChessMove, 0, len(moves))
	for _, m := range moves {
		result = append(result, moveToChessMove(m))
	}
	return result
}

// IsLegalMove reports whether the given move is legal.
func (g *ChessGame) IsLegalMove(m types.ChessMove) bool {
	if g == nil || g.game == nil {
		return false
	}
	uci := m.From + m.To
	if m.Promotion != "" {
		uci += strings.ToLower(m.Promotion)
	}
	for _, lm := range g.game.ValidMoves() {
		if lm.String() == uci {
			return true
		}
	}
	return false
}

// IsCheck reports whether the current player's king is in check.
// The last move's Check tag indicates whether the opponent (current player) is in check.
func (g *ChessGame) IsCheck() bool {
	if g == nil || g.game == nil {
		return false
	}
	moves := g.game.Moves()
	if len(moves) == 0 {
		return false
	}
	return moves[len(moves)-1].HasTag(chess.Check)
}

// Outcome returns ("", "") if the game is ongoing, otherwise returns
// (winner, reason). Winner is "white", "black", or "draw".
// Reason is one of: "checkmate", "stalemate", "fifty_move", "threefold", "insufficient".
func (g *ChessGame) Outcome() (winner string, reason string) {
	if g == nil || g.game == nil {
		return "", ""
	}
	outcome := g.game.Outcome()
	if outcome == chess.NoOutcome {
		return "", ""
	}

	switch outcome {
	case chess.WhiteWon:
		winner = "white"
	case chess.BlackWon:
		winner = "black"
	case chess.Draw:
		winner = "draw"
	}

	switch g.game.Method() {
	case chess.Checkmate:
		reason = "checkmate"
	case chess.Stalemate:
		reason = "stalemate"
	case chess.FiftyMoveRule:
		reason = "fifty_move"
	case chess.ThreefoldRepetition:
		reason = "threefold"
	case chess.InsufficientMaterial:
		reason = "insufficient"
	default:
		reason = "unknown"
	}
	return winner, reason
}

// MoveHistory returns the list of moves in SAN notation.
func (g *ChessGame) MoveHistory() []string {
	if g == nil || g.game == nil {
		return nil
	}
	moves := g.game.Moves()
	positions := g.game.Positions() // len = len(moves) + 1
	san := make([]string, 0, len(moves))
	for i, m := range moves {
		san = append(san, chess.AlgebraicNotation{}.Encode(positions[i], m))
	}
	return san
}

// LastMove returns the last move played, or nil if no moves have been made.
func (g *ChessGame) LastMove() *types.ChessMove {
	if g == nil || g.game == nil {
		return nil
	}
	moves := g.game.Moves()
	if len(moves) == 0 {
		return nil
	}
	m := moveToChessMove(moves[len(moves)-1])
	return &m
}

// LastMoveSAN returns the SAN notation of the last move, or "" if no moves.
func (g *ChessGame) LastMoveSAN() string {
	if g == nil || g.game == nil {
		return ""
	}
	history := g.MoveHistory()
	if len(history) == 0 {
		return ""
	}
	return history[len(history)-1]
}

// CapturedPieces returns piece chars captured by each side.
// Returns (capturedByWhite, capturedByBlack).
// Uppercase = white piece captured (by black), lowercase = black piece captured (by white).
func (g *ChessGame) CapturedPieces() (capturedByWhite []string, capturedByBlack []string) {
	if g == nil || g.game == nil {
		return nil, nil
	}

	startCounts := map[chess.Piece]int{
		chess.WhitePawn: 8, chess.WhiteKnight: 2, chess.WhiteBishop: 2,
		chess.WhiteRook: 2, chess.WhiteQueen: 1,
		chess.BlackPawn: 8, chess.BlackKnight: 2, chess.BlackBishop: 2,
		chess.BlackRook: 2, chess.BlackQueen: 1,
	}

	board := g.game.Position().Board()
	currentCounts := make(map[chess.Piece]int)
	for sq, p := range board.SquareMap() {
		_ = sq
		currentCounts[p]++
	}

	for p, start := range startCounts {
		missing := start - currentCounts[p]
		for i := 0; i < missing; i++ {
			if p.Color() == chess.Black {
				// Black piece captured → captured by white
				capturedByWhite = append(capturedByWhite, pieceToChar(p))
			} else {
				// White piece captured → captured by black
				capturedByBlack = append(capturedByBlack, pieceToChar(p))
			}
		}
	}
	return capturedByWhite, capturedByBlack
}

// moveToChessMove converts a *chess.Move to types.ChessMove.
func moveToChessMove(m *chess.Move) types.ChessMove {
	result := types.ChessMove{
		From: m.S1().String(),
		To:   m.S2().String(),
	}
	if p := m.Promo(); p != chess.NoPieceType {
		result.Promotion = pieceTypeChar(p)
	}
	return result
}

// pieceToChar returns the single-char representation of a piece.
// Uppercase for white pieces, lowercase for black pieces.
func pieceToChar(p chess.Piece) string {
	c := pieceTypeChar(p.Type())
	if p.Color() == chess.White {
		return strings.ToUpper(c)
	}
	return c
}

// pieceTypeChar returns the lowercase single char for a piece type.
func pieceTypeChar(t chess.PieceType) string {
	switch t {
	case chess.Pawn:
		return "p"
	case chess.Knight:
		return "n"
	case chess.Bishop:
		return "b"
	case chess.Rook:
		return "r"
	case chess.Queen:
		return "q"
	case chess.King:
		return "k"
	default:
		return "?"
	}
}
