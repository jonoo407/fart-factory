import { describe, it, expect } from 'vitest';
import { computeMatchPct, evaluateMatch, gradeForPct } from '../../src/scoring/match';
import { getAudience } from '../../src/state/audience';
import type { FoodProperties } from '../../src/state/food';

const p = (wet = 0, dry = 0, stink = 0, loud = 0, musical = 0, length = 0, temp = 0): FoodProperties => ({
  wet, dry, stink, loud, musical, length, temp,
});

/**
 * PLAN v9 D2 — real content is asserted by GRADE / ORDERING, never by the
 * prototype's exact percentages (real foods differ from the prototype slice).
 * These lock the design's acceptance intent: the "instantly 80%" bug is gone,
 * matching beats random, and hate tanks the score.
 */
describe('real-catalog scoring', () => {
  it('an empty plate vs Granny is a clear F — the "instantly 80%" bug is dead', () => {
    const granny = getAudience('granny-edna')!;
    const pct = computeMatchPct(p(0, 0, 0, 0, 0, 0, 0), granny.cravings);
    expect(pct).toBeLessThan(50);
    expect(gradeForPct(pct)).toBe('F');
  });

  it('a deliberately on-profile plate out-scores a random junk plate', () => {
    const granny = getAudience('granny-edna')!; // headline craving: musical
    const onProfile = computeMatchPct(p(2, 3, 2, 2, 8, 3, 2), granny.cravings); // musical to the cap
    const random = computeMatchPct(p(8, 0, 8, 8, 0, 8, 8), granny.cravings); // loud/stink junk, no musical
    expect(onProfile).toBeGreaterThan(random);
  });

  it('a wet plate vs a no-wet audience is tanked vs the same plate made dry', () => {
    const royal = getAudience('royal-court')!; // restriction: no-wet
    const wet = evaluateMatch(p(8, 3, 1, 1, 8, 6, 2), ['kombucha'], royal.cravings, royal.restrictions);
    const dry = evaluateMatch(p(0, 3, 1, 1, 8, 6, 2), ['asparagus'], royal.cravings, royal.restrictions);
    expect(wet.pct).toBeLessThan(dry.pct);
    expect(wet.violations).toContain('no-wet');
  });

  it('a perfect charge never lowers, and can raise, the final pct', () => {
    const granny = getAudience('granny-edna')!;
    const plate = p(2, 3, 2, 2, 6, 3, 2);
    const tap = evaluateMatch(plate, ['broccoli'], granny.cravings, granny.restrictions, 1.0).pct;
    const perfect = evaluateMatch(plate, ['broccoli'], granny.cravings, granny.restrictions, 1.25).pct;
    expect(perfect).toBeGreaterThanOrEqual(tap);
  });
});
