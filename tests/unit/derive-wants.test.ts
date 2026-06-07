import { describe, it, expect } from 'vitest';
import { deriveWants, getAudience } from '../../src/state/audience';

/**
 * PLAN v9 P0.2 — the scorer (closeness curve + hate penalty) and the Order
 * Ticket craving chips both need a per-axis {target 0-1, weight, hate} model.
 * Real audiences only carry `cravings` (0-5) + `restrictions` (strings), so
 * we derive the judged set. No raw integer ever leaks past this boundary.
 */
describe('deriveWants', () => {
  const AXES = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

  it('maps a non-zero craving to a want with target = craving/5, weight 1, not hated', () => {
    const granny = getAudience('granny-edna')!; // cravings musical:3
    const musical = deriveWants(granny).find((w) => w.axis === 'musical')!;
    expect(musical.target).toBeCloseTo(3 / 5, 10);
    expect(musical.weight).toBe(1);
    expect(musical.hate).toBe(false);
  });

  it('omits axes the audience does not crave (craving 0) unless they are hated', () => {
    const royal = getAudience('royal-court')!; // wet craving 0, restriction no-wet
    const wetWants = deriveWants(royal).filter((w) => w.axis === 'wet');
    expect(wetWants).toHaveLength(1);
    expect(wetWants[0]!.hate).toBe(true);
    expect(wetWants[0]!.target).toBe(0);
  });

  it('derives a hate want (target 0) from a no-<axis> restriction', () => {
    const astronauts = getAudience('astronauts')!; // no-wet
    const wet = deriveWants(astronauts).find((w) => w.axis === 'wet')!;
    expect(wet.hate).toBe(true);
    expect(wet.target).toBe(0);
  });

  it('does not turn ingredient/quantity restrictions into axis wants', () => {
    const haunted = getAudience('haunted-mansion')!; // need-cursed-or-rare (not an axis)
    expect(deriveWants(haunted).every((w) => AXES.includes(w.axis))).toBe(true);
    // need-cursed-or-rare must not invent a phantom axis want
    expect(deriveWants(haunted).some((w) => (w.axis as string) === 'cursed')).toBe(false);
  });

  it('never leaks raw 0-5 integers — every target stays in [0,1]', () => {
    for (const a of ['granny-edna', 'royal-court', 'volcano-cult', 'silent-monks']) {
      for (const w of deriveWants(getAudience(a)!)) {
        expect(w.target).toBeGreaterThanOrEqual(0);
        expect(w.target).toBeLessThanOrEqual(1);
      }
    }
  });
});
