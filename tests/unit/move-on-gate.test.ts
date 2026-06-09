import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { renderMoveOnGate } from '../../src/ui/plate';
import { recordLaunch } from '../../src/state/encounter-progress';
import { audienceForEncounter } from '../../src/state/audience';

// Regression guard for the Move On gate logic. The bug was that renderMoveOnGate
// was never CALLED after a launch, so the button stayed locked even after a pass
// (that wiring is verified live in the preview). This locks the gate's logic:
// it must reflect whether the current crowd has been passed.
beforeEach(() => {
  localStorage.clear();
  // Pin the run seed: with it unpinned, currentAudience() rolls the 4%
  // unicorn encounter off a Math.random() run seed — making this suite fail
  // roughly 1 run in 25 (the gate checks the unicorn's id, not the audience
  // the test recorded a pass for). Seed 12345 is unicorn-free at idx 0.
  localStorage.setItem('fart_run_seed', '12345');
  document.body.innerHTML = '<button id="moveOnBtn"></button>';
});

describe('Move On gate reflects whether the crowd has been passed', () => {
  it('stays LOCKED before the crowd is passed', () => {
    renderMoveOnGate();
    expect((document.getElementById('moveOnBtn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('UNLOCKS once a launch has passed the crowd (>= PASS_PCT)', () => {
    const aud = audienceForEncounter(0);
    recordLaunch(aud.id, 0, 77); // a passing launch this encounter
    renderMoveOnGate();
    expect((document.getElementById('moveOnBtn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('stays LOCKED after a sub-pass launch (< PASS_PCT)', () => {
    const aud = audienceForEncounter(0);
    recordLaunch(aud.id, 0, 30);
    renderMoveOnGate();
    expect((document.getElementById('moveOnBtn') as HTMLButtonElement).disabled).toBe(true);
  });
});
