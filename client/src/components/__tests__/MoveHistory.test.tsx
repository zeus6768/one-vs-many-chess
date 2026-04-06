import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MoveHistory } from '../MoveHistory';

const t = (key: string) => key;

describe('MoveHistory', () => {
  it('shows dash placeholder for empty move list', () => {
    render(<MoveHistory moves={[]} t={t as never} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the move_history label', () => {
    render(<MoveHistory moves={[]} t={t as never} />);
    expect(screen.getByText('move_history')).toBeInTheDocument();
  });

  it('pairs moves correctly: two moves → one row', () => {
    render(<MoveHistory moves={['e4', 'e5']} t={t as never} />);
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
    // Row number
    expect(screen.getByText('1.')).toBeInTheDocument();
  });

  it('handles odd number of moves (unpaired last move)', () => {
    render(<MoveHistory moves={['e4', 'e5', 'Nf3']} t={t as never} />);
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
    expect(screen.getByText('Nf3')).toBeInTheDocument();
    // Two numbered rows
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
  });

  it('renders correct move numbers for multiple pairs', () => {
    render(<MoveHistory moves={['e4','e5','Nf3','Nc6','Bb5']} t={t as never} />);
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  it('does not show placeholder when moves are present', () => {
    render(<MoveHistory moves={['e4']} t={t as never} />);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('latest white move is highlighted when it is the last in an odd list', () => {
    const { container } = render(
      <MoveHistory moves={['e4', 'e5', 'Nf3']} t={t as never} />
    );
    // The highlighted move has a green background style applied inline.
    // The 3rd move (Nf3) should have the highlight style: background: rgba(129, 182, 76, 0.2)
    const spans = container.querySelectorAll('span');
    const nf3Span = Array.from(spans).find(s => s.textContent === 'Nf3');
    expect(nf3Span).toBeDefined();
    expect(nf3Span!.style.background).toContain('rgba(129, 182, 76, 0.2)');
  });

  it('latest black move is highlighted when it is the last in an even list', () => {
    const { container } = render(
      <MoveHistory moves={['e4', 'e5']} t={t as never} />
    );
    const spans = container.querySelectorAll('span');
    const e5Span = Array.from(spans).find(s => s.textContent === 'e5');
    expect(e5Span).toBeDefined();
    expect(e5Span!.style.background).toContain('rgba(129, 182, 76, 0.2)');
  });
});
