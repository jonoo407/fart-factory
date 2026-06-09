import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadStreak,
  recordLaunchForStreak,
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

// (streakGoldMultiplier was an orphaned remnant of the pre-v9 gold stack —
// zero production callers; the anti-grind encounter payout replaced it.
// Deleted along with its tests. The counter above is live: it feeds
// hidden-combo detection and the streak UI.)
