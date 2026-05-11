import { describe, it, expect } from 'vitest';
import {
  CHALLENGES,
  getDailyChallenge,
  computeMatch,
  axisHints,
  loadBestMatch,
  recordMatch,
  matchKeyForDate,
  audienceReaction,
} from '../../src/state/challenge';

import { beforeEach } from 'vitest';

describe('CHALLENGES catalog', () => {
  it('contains at least 12 named challenges', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(12);
  });

  it('every challenge has a name and 6-slot target profile in 1..10 range', () => {
    for (const c of CHALLENGES) {
      expect(c.name).toMatch(/.+/);
      expect(c.profile).toHaveLength(6);
      for (const v of c.profile) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    }
  });

  it('challenge names are unique', () => {
    const names = new Set(CHALLENGES.map((c) => c.name));
    expect(names.size).toBe(CHALLENGES.length);
  });
});

describe('getDailyChallenge', () => {
  it('is deterministic for the same date', () => {
    const a = getDailyChallenge(new Date('2026-05-10T00:00:00Z'));
    const b = getDailyChallenge(new Date('2026-05-10T23:59:59Z'));
    expect(a.name).toBe(b.name);
    expect(a.profile).toEqual(b.profile);
  });

  it('produces different challenges across consecutive days', () => {
    const days = Array.from({ length: 12 }, (_, i) =>
      getDailyChallenge(new Date(`2026-05-${10 + i < 10 ? '0' + (10 + i) : 10 + i}T12:00:00Z`)),
    );
    const uniqueNames = new Set(days.map((c) => c.name));
    // 12 days should hit at least 6 distinct challenges out of 12.
    expect(uniqueNames.size).toBeGreaterThanOrEqual(6);
  });
});

describe('computeMatch', () => {
  it('is 100 when actual exactly equals target', () => {
    expect(computeMatch([5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5])).toBe(100);
  });

  it('is 0 when actual is maximally distant from target (every slider 9 away)', () => {
    expect(computeMatch([10, 10, 10, 10, 10, 10], [1, 1, 1, 1, 1, 1])).toBe(0);
  });

  it('is monotonic: closer actual produces higher match', () => {
    const target = [5, 5, 5, 5, 5, 5];
    const close = computeMatch([5, 5, 5, 5, 5, 6], target);
    const far = computeMatch([5, 5, 5, 5, 5, 10], target);
    expect(close).toBeGreaterThan(far);
  });

  it('returns an integer in 0..100', () => {
    const m = computeMatch([3, 7, 2, 8, 5, 6], [5, 5, 5, 5, 5, 5]);
    expect(Number.isInteger(m)).toBe(true);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(100);
  });
});

describe('best-match persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when no match has been recorded for the day', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    expect(loadBestMatch(date)).toBe(0);
  });

  it('persists the highest match value across calls', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    recordMatch(50, date);
    expect(loadBestMatch(date)).toBe(50);
    recordMatch(90, date);
    expect(loadBestMatch(date)).toBe(90);
    // Lower match does not overwrite.
    recordMatch(40, date);
    expect(loadBestMatch(date)).toBe(90);
  });

  it('separates best matches per-date', () => {
    const a = new Date('2026-05-10T12:00:00Z');
    const b = new Date('2026-05-11T12:00:00Z');
    recordMatch(80, a);
    recordMatch(60, b);
    expect(loadBestMatch(a)).toBe(80);
    expect(loadBestMatch(b)).toBe(60);
  });

  it('matchKeyForDate is stable across times-of-day', () => {
    const morning = new Date('2026-05-10T03:00:00Z');
    const evening = new Date('2026-05-10T22:00:00Z');
    expect(matchKeyForDate(morning)).toBe(matchKeyForDate(evening));
  });

  it('survives corrupt localStorage value', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    localStorage.setItem(matchKeyForDate(date), 'not-a-number');
    expect(loadBestMatch(date)).toBe(0);
  });
});

describe('audienceReaction', () => {
  it('tiers match% into 5 named bands', () => {
    expect(audienceReaction(95, null).tier).toBe('loved');
    expect(audienceReaction(80, null).tier).toBe('liked');
    expect(audienceReaction(60, null).tier).toBe('meh');
    expect(audienceReaction(40, null).tier).toBe('disliked');
    expect(audienceReaction(15, null).tier).toBe('evacuated');
  });

  it('tier boundaries are inclusive at the lower bound', () => {
    expect(audienceReaction(90, null).tier).toBe('loved');
    expect(audienceReaction(70, null).tier).toBe('liked');
    expect(audienceReaction(50, null).tier).toBe('meh');
    expect(audienceReaction(30, null).tier).toBe('disliked');
    expect(audienceReaction(29, null).tier).toBe('evacuated');
  });

  it("trend is 'first' when no prior match exists", () => {
    expect(audienceReaction(50, null).trend).toBe('first');
  });

  it("trend is 'warmer' when match% increased vs prior", () => {
    expect(audienceReaction(80, 60).trend).toBe('warmer');
  });

  it("trend is 'colder' when match% decreased vs prior", () => {
    expect(audienceReaction(40, 80).trend).toBe('colder');
  });

  it("trend is 'same' when match% unchanged", () => {
    expect(audienceReaction(50, 50).trend).toBe('same');
  });
});

describe('axisHints', () => {
  it('returns 6 hints with dir "ok" when actual === target', () => {
    const hints = axisHints([5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5]);
    expect(hints).toHaveLength(6);
    for (const h of hints) {
      expect(h.dir).toBe('ok');
      expect(h.diff).toBe(0);
    }
  });

  it('returns dir "down" when actual > target (needs to come down)', () => {
    const hints = axisHints([10, 5, 5, 5, 5, 5], [3, 5, 5, 5, 5, 5]);
    expect(hints[0].dir).toBe('down');
    expect(hints[0].diff).toBe(7);
  });

  it('returns dir "up" when actual < target (needs to go up)', () => {
    const hints = axisHints([2, 5, 5, 5, 5, 5], [9, 5, 5, 5, 5, 5]);
    expect(hints[0].dir).toBe('up');
    expect(hints[0].diff).toBe(7);
  });

  it('marks small diffs (≤1) as "ok" tolerance band', () => {
    const hints = axisHints([6, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5]);
    expect(hints[0].dir).toBe('ok');
    expect(hints[0].diff).toBe(1);
  });

  it('intensity scales with diff magnitude', () => {
    const hints = axisHints([10, 1, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5]);
    expect(hints[0].intensity).toBeGreaterThan(0);
    expect(hints[1].intensity).toBeGreaterThan(0);
    // ≥3 difference is significant; both should show at least medium intensity.
    expect(hints[0].intensity).toBeGreaterThanOrEqual(2);
    expect(hints[1].intensity).toBeGreaterThanOrEqual(2);
  });
});
