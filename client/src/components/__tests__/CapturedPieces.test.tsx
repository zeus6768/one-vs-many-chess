import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapturedPieces } from '../CapturedPieces';
import type { CapturedPieces as CapturedPiecesType } from '../../types/game';

const t = (key: string) => key;

function renderCaptures(
  byHost: string[],
  byChallengers: string[],
  isHost = true,
) {
  const captured: CapturedPiecesType = { byHost, byChallengers };
  render(
    <CapturedPieces
      captured={captured}
      hostColor="white"
      isHost={isHost}
      t={t as never}
    />
  );
}

describe('CapturedPieces', () => {
  it('shows no advantage element when material is equal', () => {
    renderCaptures(['q'], ['q']);
    expect(screen.queryByText(/material_advantage/)).not.toBeInTheDocument();
  });

  it('shows no advantage element when both sides have nothing', () => {
    renderCaptures([], []);
    expect(screen.queryByText(/material_advantage/)).not.toBeInTheDocument();
  });

  it('shows positive advantage for host when host has captured more', () => {
    // host captures Q(9), challengers capture P(1) → adv = +8
    renderCaptures(['q'], ['p'], true);
    const adv = screen.getByText(/material_advantage/);
    expect(adv).toBeInTheDocument();
    expect(adv.textContent).toContain('+8');
  });

  it('shows negative advantage (red) when challengers have more material', () => {
    // host captures P(1), challengers capture R(5) → adv = -4 for host
    renderCaptures(['p'], ['r'], true);
    const adv = screen.getByText(/material_advantage/);
    expect(adv).toBeInTheDocument();
    // adv is -4, displayed as -4 (no + prefix)
    expect(adv.textContent).toContain('-4');
  });

  it('flips sign for challenger perspective', () => {
    // host captures Q(9), challengers capture nothing → adv = +9 from host POV
    // from challenger (isHost=false) perspective: displayed as -9
    renderCaptures(['q'], [], false);
    const adv = screen.getByText(/material_advantage/);
    expect(adv.textContent).toContain('-9');
  });

  it('challenger perspective: challengers ahead shows their advantage (no + sign)', () => {
    // challengers capture Q(9), host captures nothing → adv = -9 from host POV
    // from challenger (isHost=false): displayed as -(-9) = 9, adv < 0 so no '+' prefix
    renderCaptures([], ['q'], false);
    const adv = screen.getByText(/material_advantage/);
    expect(adv.textContent).toContain('9');
    expect(adv.textContent).not.toContain('+');
  });

  it('renders captured_by_host and captured_by_challengers labels', () => {
    renderCaptures([], []);
    expect(screen.getByText('captured_by_host')).toBeInTheDocument();
    expect(screen.getByText('captured_by_challengers')).toBeInTheDocument();
  });

  it('does not crash when byHost and byChallengers are null (server may send null for empty slices)', () => {
    // The Go server serializes nil slices as JSON null. Client code must handle
    // null gracefully — a crash here causes a blank page for all room members.
    const nullCaptured = { byHost: null, byChallengers: null } as unknown as CapturedPiecesType;
    expect(() =>
      render(
        <CapturedPieces
          captured={nullCaptured}
          hostColor="white"
          isHost
          t={t as never}
        />
      )
    ).not.toThrow();
  });

  it('renders dash placeholder when host has no captures', () => {
    const { container } = render(
      <CapturedPieces
        captured={{ byHost: [], byChallengers: [] }}
        hostColor="white"
        isHost
        t={t as never}
      />
    );
    // Two "—" placeholders: one for each empty side
    expect(container.textContent?.match(/—/g)?.length).toBe(2);
  });
});
