import { describe, it, expect } from 'vitest';
import { axisCredit, closeness, computeMatchPct, computeAxisFeedback } from '../../src/scoring/match';
import type { FoodProperties } from '../../src/state/food';
import type { Audience } from '../../src/state/audience';

const props = (o: Partial<FoodProperties>): FoodProperties => ({
  wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0, ...o,
});
const aud = (cravings: Partial<FoodProperties>, restrictions: string[] = []): Audience =>
  ({ id: 't', name: 'T', emoji: '🧪', cravings: props(cravings), restrictions } as unknown as Audience);

// User directive: "closest should be better." Giving MORE of a craved axis must
// never hurt — meeting or exceeding a want is full credit; falling short is
// scored by how close you got. Hated ("want none") axes keep less-is-better.

describe('axisCredit — closest-or-better', () => {
  it('gives full credit for meeting the target exactly', () => {
    expect(axisCredit(0.8, 0.8, false)).toBe(1);
  });

  it('gives full credit for OVERSHOOTING a wanted axis (the bug: was penalized)', () => {
    expect(axisCredit(0.8, 1.0, false)).toBe(1);
  });

  it('scores an undershoot by closeness (closer = higher, < 1)', () => {
    const c = axisCredit(0.8, 0.4, false);
    expect(c).toBeCloseTo(closeness(0.8, 0.4), 6);
    expect(c).toBeLessThan(1);
  });

  it('a closer undershoot scores higher than a farther one', () => {
    expect(axisCredit(0.8, 0.6, false)).toBeGreaterThan(axisCredit(0.8, 0.2, false));
  });

  it('keeps less-is-better for a hated axis', () => {
    expect(axisCredit(0, 0, true)).toBe(1);
    expect(axisCredit(0, 1.0, true)).toBeLessThan(1);
  });
});

describe('match % rewards generous plates on craved axes', () => {
  it('overshooting the only craved axis scores 100, not a penalty', () => {
    // craving stink=4 -> target 0.8; plate stink=8 -> got 1.0 (overshoot)
    expect(computeMatchPct(props({ stink: 8 }), props({ stink: 4 }))).toBe(100);
  });

  it('the judge card marks an overshot want as a hit', () => {
    const fb = computeAxisFeedback(props({ stink: 8 }), aud({ stink: 4 }));
    const stink = fb.find((f) => f.axis === 'stink')!;
    expect(stink.status).toBe('hit');
  });
});
