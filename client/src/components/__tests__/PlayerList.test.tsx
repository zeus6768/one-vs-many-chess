import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerList } from '../PlayerList';
import type { Player } from '../../types/game';

const t = (key: string) => key;

const host: Player = { id: 'host-1', name: 'Alice', isHost: true };
const challenger1: Player = { id: 'chal-1', name: 'Bob', isHost: false };
const challenger2: Player = { id: 'chal-2', name: 'Carol', isHost: false };

function renderList(overrides: Partial<Parameters<typeof PlayerList>[0]> = {}) {
  return render(
    <PlayerList
      host={host}
      challengers={[challenger1]}
      currentPlayer={null}
      hostColor="white"
      t={t as never}
      {...overrides}
    />
  );
}

describe('PlayerList', () => {
  it('renders host name', () => {
    renderList();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders challenger name', () => {
    renderList();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders multiple challengers', () => {
    renderList({ challengers: [challenger1, challenger2] });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('shows correct challenger count', () => {
    renderList({ challengers: [challenger1, challenger2] });
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  it('shows "(You)" marker when currentPlayer is host', () => {
    renderList({ currentPlayer: host });
    expect(screen.getByText('you')).toBeInTheDocument();
  });

  it('shows "(You)" marker when currentPlayer is a challenger', () => {
    renderList({ currentPlayer: challenger1 });
    expect(screen.getByText('you')).toBeInTheDocument();
  });

  it('renders empty state — only labels when host is null and challengers is empty', () => {
    renderList({ host: null, challengers: [] });
    expect(screen.getByText('host_label')).toBeInTheDocument();
    expect(screen.getByText('challengers_label (0)')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('does not render host row when host is null', () => {
    renderList({ host: null });
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});
