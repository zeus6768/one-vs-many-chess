import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from '../Board';
import type { GameState, VoteTally } from '../../types/game';

// Starting position with white to move. Legal moves used in tests are hand-picked.
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    fen: START_FEN,
    isHostTurn: true,
    winner: '',
    winReason: '',
    lastMove: null,
    lastMoveSan: '',
    hostColor: 'white',
    moveHistory: [],
    capturedPieces: { byHost: [], byChallengers: [] },
    isCheck: false,
    legalMoves: [
      { from: 'e2', to: 'e4' },
      { from: 'e2', to: 'e3' },
      { from: 'd2', to: 'd4' },
      { from: 'd2', to: 'd3' },
    ],
    ...overrides,
  };
}

const noOp = vi.fn();

function renderBoard(overrides: Partial<GameState> = {}, props: {
  isHost?: boolean;
  isMyTurn?: boolean;
  voteTally?: VoteTally | null;
} = {}) {
  return render(
    <Board
      gameState={makeGameState(overrides)}
      isHost={props.isHost ?? true}
      isMyTurn={props.isMyTurn ?? true}
      voteTally={props.voteTally ?? null}
      myVote={null}
      onMove={noOp}
      onVote={noOp}
      promotionLabel="Select promotion piece"
    />
  );
}

describe('Board', () => {
  it('renders 64 squares', () => {
    renderBoard();
    // Each square has data-testid="square-XN"
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['1','2','3','4','5','6','7','8'];
    for (const f of files) {
      for (const r of ranks) {
        expect(screen.getByTestId(`square-${f}${r}`)).toBeInTheDocument();
      }
    }
  });

  it('clicking an own piece selects it (isMyTurn=true)', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <Board
        gameState={makeGameState()}
        isHost
        isMyTurn
        voteTally={null}
        myVote={null}
        onMove={onMove}
        onVote={noOp}
        promotionLabel="Promote"
      />
    );
    // Click e2 (white pawn), then e4 (legal destination)
    await user.click(screen.getByTestId('square-e2'));
    await user.click(screen.getByTestId('square-e4'));
    expect(onMove).toHaveBeenCalledWith({ from: 'e2', to: 'e4' });
  });

  it('clicking a legal destination as challenger calls onVote', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(
      <Board
        gameState={makeGameState({ isHostTurn: false, hostColor: 'white' })}
        isHost={false}
        isMyTurn
        voteTally={null}
        myVote={null}
        onMove={noOp}
        onVote={onVote}
        promotionLabel="Promote"
      />
    );
    // Challenger plays black — click a black pawn (a7) with legalMoves from a7
    const gameStateWithBlackMoves = makeGameState({
      isHostTurn: false,
      hostColor: 'white',
      legalMoves: [{ from: 'a7', to: 'a5' }, { from: 'a7', to: 'a6' }],
    });
    render(
      <Board
        gameState={gameStateWithBlackMoves}
        isHost={false}
        isMyTurn
        voteTally={null}
        myVote={null}
        onMove={noOp}
        onVote={onVote}
        promotionLabel="Promote"
      />
    );
    const squares = screen.getAllByTestId('square-a7');
    await user.click(squares[1]); // second render
    const a5squares = screen.getAllByTestId('square-a5');
    await user.click(a5squares[1]);
    expect(onVote).toHaveBeenCalledWith({ from: 'a7', to: 'a5' });
  });

  it('does not call onMove when isMyTurn=false', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <Board
        gameState={makeGameState()}
        isHost
        isMyTurn={false}
        voteTally={null}
        myVote={null}
        onMove={onMove}
        onVote={noOp}
        promotionLabel="Promote"
      />
    );
    await user.click(screen.getByTestId('square-e2'));
    await user.click(screen.getByTestId('square-e4'));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('does not call onMove when game has a winner', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <Board
        gameState={makeGameState({ winner: 'host' })}
        isHost
        isMyTurn
        voteTally={null}
        myVote={null}
        onMove={onMove}
        onVote={noOp}
        promotionLabel="Promote"
      />
    );
    await user.click(screen.getByTestId('square-e2'));
    await user.click(screen.getByTestId('square-e4'));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('clicking opponent piece when nothing is selected does nothing', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <Board
        gameState={makeGameState({ hostColor: 'white' })}
        isHost
        isMyTurn
        voteTally={null}
        myVote={null}
        onMove={onMove}
        onVote={noOp}
        promotionLabel="Promote"
      />
    );
    // a7 has a black pawn — host plays white, can't select it
    await user.click(screen.getByTestId('square-a7'));
    await user.click(screen.getByTestId('square-a5'));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('opens PromotionDialog when pawn reaches promotion rank', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    // FEN with white pawn on e7 ready to promote
    const promotionFen = '4k3/4P3/8/8/8/8/8/4K3 w - - 0 1';
    const state = makeGameState({
      fen: promotionFen,
      legalMoves: [{ from: 'e7', to: 'e8' }],
    });
    render(
      <Board
        gameState={state}
        isHost
        isMyTurn
        voteTally={null}
        myVote={null}
        onMove={onMove}
        onVote={noOp}
        promotionLabel="Select promotion piece"
      />
    );
    await user.click(screen.getByTestId('square-e7'));
    await user.click(screen.getByTestId('square-e8'));
    // PromotionDialog should appear
    expect(screen.getByText('Select promotion piece')).toBeInTheDocument();
    // onMove not yet called — user must pick piece
    expect(onMove).not.toHaveBeenCalled();
    // Click the Queen button
    await user.click(screen.getByTitle('Queen'));
    expect(onMove).toHaveBeenCalledWith({ from: 'e7', to: 'e8', promotion: 'q' });
  });

  it('shows vote count badges when voteTally is provided', () => {
    const voteTally: VoteTally = {
      votes: {
        'player1': { from: 'a7', to: 'a5' },
        'player2': { from: 'a7', to: 'a5' },
        'player3': { from: 'b7', to: 'b5' },
      },
      timeLeftMs: 15000,
      totalVoters: 3,
    };
    render(
      <Board
        gameState={makeGameState()}
        isHost={false}
        isMyTurn={false}
        voteTally={voteTally}
        myVote={null}
        onMove={noOp}
        onVote={noOp}
        promotionLabel="Promote"
      />
    );
    // Badge showing "2" for a5 (2 votes) — use getAllByText since rank labels also contain numbers
    const twoElements = screen.getAllByText('2');
    const voteBadge = twoElements.find(el =>
      el.style.background.includes('59, 130, 246') // blue badge color
    );
    expect(voteBadge).toBeDefined();
    // Badge showing "1" for b5
    const oneElements = screen.getAllByText('1');
    const oneBadge = oneElements.find(el =>
      el.style.background.includes('59, 130, 246')
    );
    expect(oneBadge).toBeDefined();
  });
});
