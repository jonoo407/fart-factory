import { describe, it, expect, beforeEach } from 'vitest';
import {
  launchBaseGold,
  legendaryGold,
  awardGoldForEncounter,
} from '../../src/scoring/reward';
import { getAudience } from '../../src/state/audience';
import { setGamePlusUnlocked } from '../../src/state/boss-progress';
import { dailyHotLocation, unlockedLocations } from '../../src/state/location-progress';
import { testCodexSlot } from '../../src/state/codex';
import { setGold, setResearchNotes, loadGold, unlockFood } from '../../src/state/persistence';

// SEAM test: the audit found that the GamePlus Hot Spot 3x and the legendary
// forbidden-gold +10% were both DEAD — the only code applying them
// (awardGoldForLaunch) had zero production callers, while the unit suite stayed
// green by asserting the multipliers "return 1.1 / 3 in isolation." These tests
// drive the actual LIVE payout entry points and assert the multiplier is
// credited — the coverage that was missing.

beforeEach(() => {
  localStorage.clear();
  // Pin the run seed so the hot-spot pick is reproducible across runs.
  localStorage.setItem('fart_run_seed', '12345');
});

function decodeForbiddenBlast(): void {
  setGold(500);
  setResearchNotes(100);
  unlockFood('forbidden-burrito');
  unlockFood('volcano-chili');
  unlockFood('ghost-pepper');
  testCodexSlot('forbidden-blast', 0, 'forbidden-burrito');
  testCodexSlot('forbidden-blast', 1, 'volcano-chili');
  testCodexSlot('forbidden-blast', 2, 'ghost-pepper');
}

describe('SEAM: gold multipliers reach the live launch payout', () => {
  it('GamePlus Hot Spot 3x is applied at the launch base-gold entry point', () => {
    setGamePlusUnlocked(true);
    const hot = dailyHotLocation()!;
    const granny = getAudience('granny-edna')!; // base gold 24 (easy tier)
    expect(launchBaseGold(granny, hot.id)).toBe(72); // 24 * 3
    // A REAL location id that isn't today's hot spot (the original version used
    // a region id here, which no location ever has — making the 1x assertion
    // vacuously true even if the 3x leaked everywhere).
    const cold = unlockedLocations().find((l) => l.id !== hot.id)!;
    expect(launchBaseGold(granny, cold.id)).toBe(24); // 1x off the hot spot
  });

  it('Hot Spot multiplier is 1x when GamePlus is OFF (no bonus)', () => {
    const hot = dailyHotLocation()!;
    const granny = getAudience('granny-edna')!;
    expect(launchBaseGold(granny, hot.id)).toBe(24);
  });

  it('forbidden-gold +10% is credited by the live encounter payout', () => {
    decodeForbiddenBlast();
    setGold(0); // reset to measure the payout cleanly (decode spent gold)
    const pay = awardGoldForEncounter('granny-edna', 100, 100); // 100 * 1.1
    expect(pay).toBe(110);
    expect(loadGold()).toBe(110);
  });

  it('the +10% applies to bonus gold sources too (wow / critical / combo)', () => {
    expect(legendaryGold(10)).toBe(10); // no buff → unchanged
    decodeForbiddenBlast();
    expect(legendaryGold(10)).toBe(11); // 10 * 1.1
  });
});
