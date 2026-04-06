import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromotionDialog } from '../PromotionDialog';

describe('PromotionDialog', () => {
  it('renders 4 promotion options', () => {
    render(
      <PromotionDialog
        color="white"
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        label="Choose a piece"
      />
    );
    expect(screen.getByTitle('Queen')).toBeInTheDocument();
    expect(screen.getByTitle('Rook')).toBeInTheDocument();
    expect(screen.getByTitle('Bishop')).toBeInTheDocument();
    expect(screen.getByTitle('Knight')).toBeInTheDocument();
  });

  it('renders the label text', () => {
    render(
      <PromotionDialog color="white" onSelect={vi.fn()} onCancel={vi.fn()} label="Pick your piece" />
    );
    expect(screen.getByText('Pick your piece')).toBeInTheDocument();
  });

  it('calls onSelect with "q" when Queen is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PromotionDialog color="white" onSelect={onSelect} onCancel={vi.fn()} label="Promote" />
    );
    await user.click(screen.getByTitle('Queen'));
    expect(onSelect).toHaveBeenCalledWith('q');
  });

  it('calls onSelect with "r" when Rook is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PromotionDialog color="white" onSelect={onSelect} onCancel={vi.fn()} label="Promote" />
    );
    await user.click(screen.getByTitle('Rook'));
    expect(onSelect).toHaveBeenCalledWith('r');
  });

  it('calls onSelect with "b" when Bishop is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PromotionDialog color="white" onSelect={onSelect} onCancel={vi.fn()} label="Promote" />
    );
    await user.click(screen.getByTitle('Bishop'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('calls onSelect with "n" when Knight is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PromotionDialog color="white" onSelect={onSelect} onCancel={vi.fn()} label="Promote" />
    );
    await user.click(screen.getByTitle('Knight'));
    expect(onSelect).toHaveBeenCalledWith('n');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <PromotionDialog color="white" onSelect={vi.fn()} onCancel={onCancel} label="Promote" />
    );
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onSelect when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PromotionDialog color="white" onSelect={onSelect} onCancel={vi.fn()} label="Promote" />
    );
    await user.click(screen.getByText('Cancel'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
