import { describe, it, expect, beforeEach } from 'vitest';
import { audienceForEncounter, AUDIENCES } from '../../src/state/audience';
import { setGamePlusUnlocked } from '../../src/state/boss-progress';
import { hotSpotGoldMultiplier } from '../../src/scoring/gameplus';
import { dailyHotLocation } from '../../src/state/location-progress';
import { goldForMatch } from '../../src/scoring/reward';

beforeEach(() => {
  localStorage.clear();
});

describe('GamePlus effects (P12)', () => {
  it('audience rotation steps 2 per encounter when GamePlus is on', () => {
    setGamePlusUnlocked(true);
    const a0 = audienceForEncounter(0);
    const a1 = audienceForEncounter(1);
    // Encounter 1 in GamePlus should be 2 positions ahead of encounter 0,
    // i.e., position 2 in the catalog (not position 1).
    const expected = AUDIENCES[2 % AUDIENCES.length]!.id;
    expect(a1.id).toBe(expected);
    expect(a0.id).not.toBe(a1.id);
  });

  it('audience rotation steps 1 per encounter when GamePlus is OFF', () => {
    setGamePlusUnlocked(false);
    const a0 = audienceForEncounter(0);
    const a1 = audienceForEncounter(1);
    const expected = AUDIENCES[1 % AUDIENCES.length]!.id;
    expect(a1.id).toBe(expected);
    expect(a0.id).not.toBe(a1.id);
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
