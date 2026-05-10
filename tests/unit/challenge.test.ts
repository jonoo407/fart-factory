import { describe, it, expect } from 'vitest';
import {
  CHALLENGES,
  getDailyChallenge,
  computeMatch,
} from '../../src/state/challenge';

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
