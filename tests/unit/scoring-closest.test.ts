import { describe, it, expect } from 'vitest';
import { axisCredit, closeness, computeMatchPct, computeAxisFeedback } from '../../src/scoring/match';
import type { FoodProperties } from '../../src/state/food';
import type { Audience } from '../../src/state/audience';

const props = (o: Partial<FoodProperties>): FoodProperties => ({
  wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0, ...o,
});
const aud = (cravings: Partial<FoodProperties>, restrictions: string[] = []): Audience =>
  ({ id: 't', name: 'T', emoji: '🧪', cravings: props(cravings), restrictions } as unknown as Audience);

// User directive: a craving is a TARGET, not a floor. Closeness counts BOTH
// ways — giving the audience MORE than they want misses just like giving less.
// Hated ("want none") axes keep less-is-better (target ≈ 0).

describe('axisCredit — symmetric target-matching', () => {
  it('gives full credit for meeting the target exactly', () => {
    expect(axisCredit(0.8, 0.8, false)).toBe(1);
  });

  it('PENALIZES overshooting a wanted axis (closeness, not full credit)', () => {
    const c = axisCredit(0.8, 1.0, false);
    expect(c).toBeCloseTo(closeness(0.8, 1.0), 6);
    expect(c).toBeLessThan(1);
  });

  it('penalizes overshoot and undershoot equally (symmetric around the target)', () => {
    // both 0.2 off the target, opposite sides → identical credit
    expect(axisCredit(0.8, 1.0, false)).toBeCloseTo(axisCredit(0.8, 0.6, false), 6);
  });

  it('scores an undershoot by closeness (closer = higher, < 1)', () => {
    const c = axisCredit(0.8, 0.4, false);
    expect(c).toBeCloseTo(closeness(0.8, 0.4), 6);
    expect(c).toBeLessThan(1);
  });

  it('a closer plate scores higher than a farther one, in EITHER direction', () => {
    expect(axisCredit(0.8, 0.6, false)).toBeGreaterThan(axisCredit(0.8, 0.2, false)); // undershoot
    expect(axisCredit(0.5, 0.7, false)).toBeGreaterThan(axisCredit(0.5, 1.0, false)); // overshoot
  });

  it('keeps less-is-better for a hated axis', () => {
    expect(axisCredit(0, 0, true)).toBe(1);
    expect(axisCredit(0, 1.0, true)).toBeLessThan(1);
  });
});

describe('match % penalizes overshooting a craved axis', () => {
  it('overshooting the only craved axis drops below 100', () => {
    // craving stink=4 → target 0.8; plate stink=8 → got 1.0 (overshoot)
    // → closeness(0.8, 1.0) = 0.618 → 62
    expect(computeMatchPct(props({ stink: 8 }), props({ stink: 4 }))).toBe(62);
  });

  it('hitting the craved level exactly scores 100', () => {
    // craving stink=4 → target 0.8; plate stink = 0.8*AXIS_CAP(8) = 6.4 → got 0.8 (exact)
    expect(computeMatchPct(props({ stink: 6.4 }), props({ stink: 4 }))).toBe(100);
  });

  it('the judge card marks an overshot want as near, not a clean hit', () => {
    const fb = computeAxisFeedback(props({ stink: 8 }), aud({ stink: 4 }));
    const stink = fb.find((f) => f.axis === 'stink')!;
    expect(stink.status).toBe('near'); // closeness 0.618 ∈ [0.55, 0.8)
  });
});

// Regression — punk-show screenshot: craving 3/5 read "wanted LOTS", the
// player maxed the axis, and the symmetric scorer marked it ✗ with no hint
// that the miss was an OVERSHOOT. The feedback layer must (a) bucket a mid
// craving as "some", not "lots", and (b) report the miss direction.
describe('judge-card want labels + miss direction', () => {
  it('buckets cravings: 1-2 little, 3 some, 4-5 lots', () => {
    const fb = computeAxisFeedback(props({}), aud({ wet: 1, dry: 2, stink: 3, loud: 4, temp: 5 }));
    const byAxis = Object.fromEntries(fb.map((f) => [f.axis, f.wantLevel]));
    expect(byAxis['wet']).toBe('little');
    expect(byAxis['dry']).toBe('little');
    expect(byAxis['stink']).toBe('some');
    expect(byAxis['loud']).toBe('lots');
    expect(byAxis['temp']).toBe('lots');
  });

  it('a maxed plate vs a mid craving is an overshoot miss, labelled "some" + over', () => {
    // craving stink=3 → target 0.6; plate stink=8 → got 1.0 → closeness 0.31
    const fb = computeAxisFeedback(props({ stink: 8 }), aud({ stink: 3 }));
    const stink = fb.find((f) => f.axis === 'stink')!;
    expect(stink.status).toBe('miss');
    expect(stink.wantLevel).toBe('some');
    expect(stink.direction).toBe('over');
  });

  it('an underfilled max craving reports direction under', () => {
    // craving loud=5 → target 1.0; plate loud=6 → got 0.75 → closeness ≈ 0.54
    const fb = computeAxisFeedback(props({ loud: 6 }), aud({ loud: 5 }));
    const loud = fb.find((f) => f.axis === 'loud')!;
    expect(loud.direction).toBe('under');
  });

  it('a hated axis with output reports direction over', () => {
    const fb = computeAxisFeedback(props({ wet: 4 }), aud({}, ['no-wet']));
    const wet = fb.find((f) => f.axis === 'wet')!;
    expect(wet.hate).toBe(true);
    expect(wet.direction).toBe('over');
  });

  it('an exact hit reports direction on', () => {
    const fb = computeAxisFeedback(props({ stink: 6.4 }), aud({ stink: 4 }));
    expect(fb.find((f) => f.axis === 'stink')!.direction).toBe('on');
  });
});
