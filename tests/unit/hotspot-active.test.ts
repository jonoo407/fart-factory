import { describe, it, expect, beforeEach } from 'vitest';
import { isHotSpotActive } from '../../src/scoring/gameplus';
import { setGamePlusUnlocked } from '../../src/state/boss-progress';
import { dailyHotLocation } from '../../src/state/location-progress';

// The Hot Spot 3x gold is now wired (gold-multipliers-seam), but the player was
// never told WHICH location is hot. This predicate drives the badge.
beforeEach(() => {
  localStorage.clear();
});

describe('isHotSpotActive — surfaces the GamePlus Hot Spot to the UI', () => {
  it('true only at the daily hot location while GamePlus is on', () => {
    setGamePlusUnlocked(true);
    const hot = dailyHotLocation()!;
    expect(isHotSpotActive(hot.id)).toBe(true);
    const cold = hot.id === 'hometown' ? 'city' : 'hometown';
    expect(isHotSpotActive(cold)).toBe(false);
  });

  it('false everywhere when GamePlus is off', () => {
    const hot = dailyHotLocation()!;
    expect(isHotSpotActive(hot.id)).toBe(false);
  });
});
