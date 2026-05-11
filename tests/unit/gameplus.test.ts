import { describe, it, expect, beforeEach } from 'vitest';
import { getDailyAudience } from '../../src/state/audience';
import { setGamePlusUnlocked } from '../../src/state/boss-progress';
import { hotSpotGoldMultiplier } from '../../src/scoring/gameplus';
import { dailyHotLocation } from '../../src/state/location-progress';
import { goldForMatch } from '../../src/scoring/reward';

beforeEach(() => {
  localStorage.clear();
});

describe('GamePlus effects (P12)', () => {
  it('audience rotation cycles 2× faster when GamePlus is on (same day, AM vs PM differs)', () => {
    setGamePlusUnlocked(true);
    const morning = new Date('2026-05-12T03:00:00Z');
    const afternoon = new Date('2026-05-12T15:00:00Z');
    const amAud = getDailyAudience(morning);
    const pmAud = getDailyAudience(afternoon);
    // GamePlus splits the day at 12:00 UTC → AM and PM audiences differ.
    expect(amAud.id).not.toBe(pmAud.id);
  });

  it('audience rotation stays normal (one per UTC day) when GamePlus is OFF', () => {
    setGamePlusUnlocked(false);
    const morning = new Date('2026-05-12T03:00:00Z');
    const afternoon = new Date('2026-05-12T15:00:00Z');
    expect(getDailyAudience(morning).id).toBe(getDailyAudience(afternoon).id);
  });

  it('hotSpotGoldMultiplier returns 3 when launching at the daily hot spot AND GamePlus is on', () => {
    setGamePlusUnlocked(true);
    // Find today's hot spot.
    const hot = dailyHotLocation();
    expect(hot).toBeDefined();
    expect(hotSpotGoldMultiplier(hot!.id)).toBe(3);
  });

  it('hotSpotGoldMultiplier returns 1 when not at the hot spot', () => {
    setGamePlusUnlocked(true);
    // Pick any unlocked non-hot location.
    const hot = dailyHotLocation();
    expect(hotSpotGoldMultiplier(hot!.id === 'outside' ? 'library' : 'outside')).toBe(1);
  });

  it('hotSpotGoldMultiplier returns 1 when GamePlus is OFF (no bonus)', () => {
    setGamePlusUnlocked(false);
    const hot = dailyHotLocation();
    expect(hotSpotGoldMultiplier(hot!.id)).toBe(1);
  });
});

describe('goldForMatch (existing) integration with GamePlus', () => {
  it('baseline reward unchanged when GamePlus is OFF', () => {
    setGamePlusUnlocked(false);
    expect(goldForMatch(80)).toBe(8);
  });
});
