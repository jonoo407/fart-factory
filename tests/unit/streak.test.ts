import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadStreak,
  recordLaunchForStreak,
  streakGoldMultiplier,
  STREAK_THRESHOLD,
} from '../../src/scoring/streak';

beforeEach(() => {
  localStorage.clear();
});

describe('Streak counter (T2.2)', () => {
  it('starts at 0', () => {
    expect(loadStreak()).toBe(0);
  });

  it('increments on launch ≥75%', () => {
    recordLaunchForStreak(80);
    expect(loadStreak()).toBe(1);
    recordLaunchForStreak(75);
    expect(loadStreak()).toBe(2);
  });

  it('resets to 0 on launch <75%', () => {
    recordLaunchForStreak(90);
    recordLaunchForStreak(90);
    expect(loadStreak()).toBe(2);
    recordLaunchForStreak(60);
    expect(loadStreak()).toBe(0);
  });

  it('survives malformed storage', () => {
    localStorage.setItem('fart_streak_count', '{junk');
    expect(loadStreak()).toBe(0);
  });
});

describe('Streak gold multipliers', () => {
  it('returns 1 for streak < STREAK_THRESHOLD (no bonus)', () => {
    expect(streakGoldMultiplier(0)).toBe(1);
    expect(streakGoldMultiplier(STREAK_THRESHOLD - 1)).toBe(1);
  });

  it('returns 1.5 for streak >= STREAK_THRESHOLD', () => {
    expect(streakGoldMultiplier(STREAK_THRESHOLD)).toBe(1.5);
    expect(streakGoldMultiplier(STREAK_THRESHOLD + 1)).toBe(1.5);
  });

  it('returns 2.0 for streak >= 5', () => {
    expect(streakGoldMultiplier(5)).toBe(2.0);
    expect(streakGoldMultiplier(8)).toBe(2.0);
  });

  it('returns 3.0 for streak >= 10', () => {
    expect(streakGoldMultiplier(10)).toBe(3.0);
    expect(streakGoldMultiplier(100)).toBe(3.0);
  });
});
