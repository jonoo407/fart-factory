import { describe, it, expect, beforeEach } from 'vitest';
import { goldForMatch, awardGoldForLaunch } from '../../src/scoring/reward';
import { loadGold } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('goldForMatch (Phase G item 48 — per-launch award rule)', () => {
  it('awards 0 gold below the 50% threshold', () => {
    expect(goldForMatch(0)).toBe(0);
    expect(goldForMatch(25)).toBe(0);
    expect(goldForMatch(49)).toBe(0);
  });

  it('awards floor(pct/10) at and above the 50% threshold', () => {
    expect(goldForMatch(50)).toBe(5);
    expect(goldForMatch(59)).toBe(5);
    expect(goldForMatch(60)).toBe(6);
    expect(goldForMatch(73)).toBe(7);
    expect(goldForMatch(99)).toBe(9);
    expect(goldForMatch(100)).toBe(10);
  });

  it('returns 0 for negative / NaN / >100 inputs (defensive)', () => {
    expect(goldForMatch(-5)).toBe(0);
    expect(goldForMatch(NaN)).toBe(0);
    expect(goldForMatch(150)).toBe(10); // clamped to 100 → 10 gold
  });
});

describe('awardGoldForLaunch (persistence wire-up)', () => {
  it('adds gold and returns the new balance', () => {
    const after = awardGoldForLaunch(73);
    expect(after).toBe(7);
    expect(loadGold()).toBe(7);
  });

  it('accumulates across launches', () => {
    awardGoldForLaunch(60); // +6
    awardGoldForLaunch(85); // +8
    expect(loadGold()).toBe(14);
  });

  it('adds 0 when below threshold (no error)', () => {
    awardGoldForLaunch(30);
    expect(loadGold()).toBe(0);
  });
});
