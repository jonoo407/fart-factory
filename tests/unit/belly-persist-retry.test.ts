import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import {
  addFoodToPlate,
  commitBellySpend,
  remainingBelly,
  handleReactionAction,
  _resetPlateAndBelly,
} from '../../src/ui/plate';
import { loadBelly, BELLY_CAPACITY } from '../../src/state/persistence';

// Fill-up belly model (commit 6207e26): the stomach starts EMPTY and FILLS as
// you eat — it is the per-crowd attempt budget that makes the stuffed-fail
// bite. Retrying the same crowd must therefore KEEP the fullness from prior
// attempts. The legacy drain-model retry called refillBelly(), which reset the
// stomach to empty every attempt and killed the pressure loop entirely.

describe('belly persists across attempts at the same crowd', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fart_run_seed', '12345'); // pin: reproducible encounter seeds
    document.body.innerHTML = '';
    _resetPlateAndBelly();
  });

  function eatAndLaunchCommons(): void {
    // 4 commons at 2 belly each = 8 spent, then commit (what Launch does).
    for (const id of ['beans', 'cheese', 'onion', 'egg']) {
      expect(addFoodToPlate(id).ok).toBe(true);
    }
    expect(commitBellySpend().ok).toBe(true);
    expect(loadBelly()).toBe(BELLY_CAPACITY - 8);
  }

  it('"Try this crowd again" does NOT refill the belly', () => {
    eatAndLaunchCommons();
    handleReactionAction('retry');
    expect(loadBelly()).toBe(BELLY_CAPACITY - 8);
    expect(remainingBelly()).toBe(BELLY_CAPACITY - 8);
  });

  it('"Improve" after a pass does NOT refill the belly either', () => {
    eatAndLaunchCommons();
    handleReactionAction('improve');
    expect(loadBelly()).toBe(BELLY_CAPACITY - 8);
    expect(remainingBelly()).toBe(BELLY_CAPACITY - 8);
  });
});
