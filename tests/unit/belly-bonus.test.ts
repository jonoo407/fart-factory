import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBellyBonus,
  grantBellyBonus,
  bellyCapacity,
  loadBelly,
  refillBelly,
  spendBelly,
  BELLY_CAPACITY,
} from '../../src/state/persistence';

/**
 * Cleanup #1 — the intermission belly activities are now a REAL benefit: bonus
 * stomach capacity for the UPCOMING crowd. A full belly is bad (you can eat
 * less), so the benefit of a belly rub is MORE room. Previously every new
 * encounter started at BELLY_CAPACITY regardless, so the old "refill belly"
 * activities were no-ops. Now an activity grants bonus capacity to a specific
 * encounter idx, raising both its starting room and its cap.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('belly bonus capacity (per encounter)', () => {
  it('defaults to no bonus — capacity equals the base', () => {
    expect(loadBellyBonus(3)).toBe(0);
    expect(bellyCapacity(3)).toBe(BELLY_CAPACITY);
  });

  it("granting a bonus raises that encounter's capacity", () => {
    grantBellyBonus(6, 3);
    expect(loadBellyBonus(3)).toBe(6);
    expect(bellyCapacity(3)).toBe(BELLY_CAPACITY + 6);
  });

  it('a boosted, untouched encounter STARTS with the boosted room', () => {
    grantBellyBonus(6, 3);
    expect(loadBelly(3)).toBe(BELLY_CAPACITY + 6);
  });

  it('lets you eat into the bonus room (spend up past the base, within the boosted cap)', () => {
    grantBellyBonus(6, 3);
    const r = spendBelly(BELLY_CAPACITY + 4, 3); // 24 of a boosted 26
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it('refillBelly tops up to the boosted capacity', () => {
    grantBellyBonus(6, 3);
    spendBelly(10, 3);
    refillBelly(3);
    expect(loadBelly(3)).toBe(BELLY_CAPACITY + 6);
  });

  it('is per-encounter — granting to one idx leaves neighbours at the base', () => {
    grantBellyBonus(6, 3);
    expect(bellyCapacity(2)).toBe(BELLY_CAPACITY);
    expect(bellyCapacity(4)).toBe(BELLY_CAPACITY);
  });

  it('clamps the granted bonus to a sane range', () => {
    grantBellyBonus(999, 3);
    expect(loadBellyBonus(3)).toBeLessThanOrEqual(12);
    grantBellyBonus(-5, 4);
    expect(loadBellyBonus(4)).toBe(0);
  });
});
