import { useState, useCallback } from 'react';
import type { GameState, ChessMove, VoteTally } from '../types/game';
import { Piece } from './Piece';
import { PromotionDialog } from './PromotionDialog';
import {
  parseFEN, squareToIndex, indexToSquare, isLightSquare,
  isPromotionSquare, isOwnPiece, RANKS, FILES,
} from '../utils/chess';
import { THEME } from '../theme';

interface BoardProps {
  gameState: GameState;
  isHost: boolean;
  isMyTurn: boolean;
  voteTally: VoteTally | null;
  myVote: ChessMove | null;
  onMove: (move: ChessMove) => void;
  onVote: (move: ChessMove) => void;
  promotionLabel: string;
}


export function Board({
  gameState,
  isHost,
  isMyTurn,
  voteTally,
  myVote,
  onMove,
  onVote,
  promotionLabel,
}: BoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  const board = parseFEN(gameState.fen);
  const hostColor = gameState.hostColor;

  // Flip board so current player's pieces are at the bottom.
  const isFlipped = isHost ? hostColor === 'black' : hostColor === 'white';

  // Legal move destinations from the selected square.
  const legalDests = selected
    ? (gameState.legalMoves ?? []).filter(m => m.from === selected).map(m => m.to)
    : [];

  // Vote destination counts per square.
  const voteCounts: Record<string, number> = {};
  if (voteTally) {
    for (const vote of Object.values(voteTally.votes)) {
      voteCounts[vote.to] = (voteCounts[vote.to] ?? 0) + 1;
    }
  }

  const handleSquareClick = useCallback((sq: string) => {
    if (!isMyTurn || gameState.winner) return;

    if (selected) {
      // Is this a legal destination?
      if (legalDests.includes(sq)) {
        const move = { from: selected, to: sq };
        if (isPromotionSquare(selected, sq, board)) {
          setPendingPromotion(move);
          setSelected(null);
          return;
        }
        if (isHost) {
          onMove(move);
        } else {
          onVote(move);
        }
        setSelected(null);
        return;
      }
      // Clicked own piece — reselect.
      const idx = squareToIndex(sq);
      const piece = board[idx];
      if (piece && isOwnPiece(piece, isHost, hostColor)) {
        setSelected(sq);
        return;
      }
      setSelected(null);
    } else {
      const idx = squareToIndex(sq);
      const piece = board[idx];
      if (piece && isOwnPiece(piece, isHost, hostColor)) {
        setSelected(sq);
      }
    }
  }, [selected, legalDests, board, isHost, hostColor, isMyTurn, gameState.winner, onMove, onVote]);

  const handlePromotion = useCallback((promotion: string) => {
    if (!pendingPromotion) return;
    const move = { ...pendingPromotion, promotion };
    if (isHost) {
      onMove(move);
    } else {
      onVote(move);
    }
    setPendingPromotion(null);
  }, [pendingPromotion, isHost, onMove, onVote]);

  const renderBoard = () => {
    const indices = isFlipped
      ? Array.from({ length: 64 }, (_, i) => 63 - i)
      : Array.from({ length: 64 }, (_, i) => i);

    return indices.map(idx => {
      const sq = indexToSquare(idx);
      const piece = board[idx];
      const light = isLightSquare(idx);

      const isSelected = selected === sq;
      const isLastFrom = gameState.lastMove?.from === sq;
      const isLastTo = gameState.lastMove?.to === sq;
      const isLegalDest = legalDests.includes(sq);
      const isMyVoteSq = myVote?.to === sq || myVote?.from === sq;
      const isCheckKing = gameState.isCheck && piece &&
        ((isHost && hostColor === 'white' && piece === 'K') ||
         (isHost && hostColor === 'black' && piece === 'k') ||
         (!isHost && hostColor === 'white' && piece === 'k') ||
         (!isHost && hostColor === 'black' && piece === 'K'));

      const voteCount = voteCounts[sq];

      let bg: string = light ? THEME.colors.lightSquare : THEME.colors.darkSquare;
      if (isLastFrom || isLastTo) bg = light ? THEME.colors.lastMoveLight : THEME.colors.lastMoveDark;
      if (isSelected) bg = light ? THEME.colors.selectionLight : THEME.colors.selectionDark;
      if (isCheckKing) bg = THEME.colors.error;

      return (
        <div
          key={sq}
          data-testid={`square-${sq}`}
          onClick={() => handleSquareClick(sq)}
          style={{
            position: 'relative',
            width: '12.5%',
            aspectRatio: '1',
            background: bg,
            cursor: isMyTurn && !gameState.winner ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Legal move indicator */}
          {isLegalDest && !piece && (
            <div style={{
              width: '32%',
              height: '32%',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }} />
          )}
          {isLegalDest && piece && (
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '4px solid rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }} />
          )}

          {/* My vote highlight */}
          {isMyVoteSq && (
            <div style={{
              position: 'absolute',
              inset: 2,
              border: `3px solid ${THEME.colors.ownVote}`,
              borderRadius: 2,
              pointerEvents: 'none',
            }} />
          )}

          {/* Vote count badge */}
          {voteCount && voteCount > 0 && (
            <div style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: THEME.colors.voteBadge,
              color: THEME.colors.textPrimary,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: THEME.zIndex.badge,
              lineHeight: 1,
            }}>
              {voteCount}
            </div>
          )}

          {/* Piece */}
          {piece && <Piece piece={piece} size={Math.floor(window.innerWidth * 0.055)} />}
        </div>
      );
    });
  };

  // Rank and file labels.
  const rankLabels = isFlipped
    ? RANKS.slice().reverse()
    : RANKS;
  const fileLabels = isFlipped
    ? FILES.slice().reverse()
    : FILES;

  return (
    <div style={{ display: 'inline-block', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Rank labels left */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          width: 18,
          paddingBottom: 18,
        }}>
          {rankLabels.map(r => (
            <div key={r} style={{
              color: THEME.colors.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              textAlign: 'center',
            }}>{r}</div>
          ))}
        </div>

        {/* Board + file labels */}
        <div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: 'min(80vw, 480px)',
            border: `2px solid ${THEME.colors.boardBorder}`,
          }}>
            {renderBoard()}
          </div>
          {/* File labels bottom */}
          <div style={{ display: 'flex', paddingLeft: 0, marginTop: 2 }}>
            {fileLabels.map(f => (
              <div key={f} style={{
                flex: 1,
                color: '#bababa',
                fontSize: 11,
                fontWeight: 600,
                textAlign: 'center',
              }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {pendingPromotion && (
        <PromotionDialog
          color={isHost ? hostColor : (hostColor === 'white' ? 'black' : 'white')}
          onSelect={handlePromotion}
          onCancel={() => setPendingPromotion(null)}
          label={promotionLabel}
        />
      )}
    </div>
  );
}

