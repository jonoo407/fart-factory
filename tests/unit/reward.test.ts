import { describe, it, expect, beforeEach } from 'vitest';
import {
  awardGoldForEncounter,
  baseGoldForAudience,
} from '../../src/scoring/reward';
import { loadGold, loadEarnedGold } from '../../src/state/persistence';
import { getAudience } from '../../src/state/audience';

beforeEach(() => {
  localStorage.clear();
});

// (goldForMatch and awardGoldForLaunch were orphaned parallel gold paths with
// zero production callers. Both deleted in favour of the single live path:
// launchBaseGold -> awardGoldForEncounter, with the multiplier seam covered by
// gold-multipliers-seam.test.ts.)

describe('awardGoldForEncounter (anti-grind, improvement-only — 01 §4.3)', () => {
  it('pays the full gold on first clear and ratchets the ledger', () => {
    const pay = awardGoldForEncounter('granny-edna', 100, 60); // full = round(100*0.60) = 60
    expect(pay).toBe(60);
    expect(loadGold()).toBe(60);
    expect(loadEarnedGold('granny-edna')).toBe(60);
  });

  it('pays only the improvement over the best on a better re-clear', () => {
    awardGoldForEncounter('granny-edna', 100, 60); // +60
    const pay = awardGoldForEncounter('granny-edna', 100, 80); // full 80 - prev 60 = +20
    expect(pay).toBe(20);
    expect(loadGold()).toBe(80);
    expect(loadEarnedGold('granny-edna')).toBe(80);
  });

  it('pays nothing for a worse-or-equal re-clear (no farming)', () => {
    awardGoldForEncounter('granny-edna', 100, 80);
    const pay = awardGoldForEncounter('granny-edna', 100, 50); // full 50 < 80 → 0
    expect(pay).toBe(0);
    expect(loadGold()).toBe(80);
    expect(loadEarnedGold('granny-edna')).toBe(80);
  });

  it('baseGoldForAudience falls back to the difficulty-tier table', () => {
    const granny = getAudience('granny-edna')!; // easy
    expect(baseGoldForAudience(granny)).toBe(24); // GOLD_BY_TIER.easy
  });
});
