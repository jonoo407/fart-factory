import { describe, it, expect, beforeEach } from 'vitest';
import { applyActivityChoice } from '../../src/ui/intermission';
import { getActivity } from '../../src/state/activities';
import { bellyCapacity, BELLY_CAPACITY } from '../../src/state/persistence';
import { resetRunState, currentEncounterIdx } from '../../src/state/run-state';

/**
 * Cleanup #1 — picking a belly activity in the intermission grants bonus
 * capacity to the UPCOMING crowd (currentEncounterIdx + 1, the one you advance
 * into when the intermission resolves), never to the crowd you just finished.
 */
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('fart_run_seed', '12345'); // pin: no unicorn roll, reproducible encounter seeds
  resetRunState();
});

describe('intermission belly activity → bonus capacity for the NEXT crowd', () => {
  it('grants the activity amount to the upcoming encounter, not the current one', () => {
    const idx = currentEncounterIdx(); // 0
    applyActivityChoice(getActivity('belly-massage')!); // +3
    expect(bellyCapacity(idx + 1)).toBe(BELLY_CAPACITY + 3);
    expect(bellyCapacity(idx)).toBe(BELLY_CAPACITY); // the crowd you just left is unchanged
  });

  it('a bigger activity grants more room', () => {
    applyActivityChoice(getActivity('bean-burrito')!); // +6
    expect(bellyCapacity(currentEncounterIdx() + 1)).toBe(BELLY_CAPACITY + 6);
  });

  it('power nap grants room AND flags the next intermission to be skipped', () => {
    applyActivityChoice(getActivity('power-nap')!);
    expect(bellyCapacity(currentEncounterIdx() + 1)).toBeGreaterThan(BELLY_CAPACITY);
    expect(localStorage.getItem('fart_skip_next_intermission')).toBe('true');
  });
});
