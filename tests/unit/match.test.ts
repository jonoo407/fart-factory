import { describe, it, expect } from 'vitest';
import {
  computeMatchPct,
  checkRestrictions,
  evaluateMatch,
} from '../../src/scoring/match';
import type { FoodProperties } from '../../src/state/food';

const p = (wet = 0, dry = 0, stink = 0, loud = 0, musical = 0, length = 0, temp = 0): FoodProperties => ({
  wet, dry, stink, loud, musical, length, temp,
});

describe('computeMatchPct (closeness curve, PLAN v9 P1)', () => {
  const target = p(3, 1, 4, 2, 3, 2, 2);
  // The scorer normalizes a plate's level by AXIS_CAP(8) and a craving by
  // TARGET_DIV(5), so a plate fully satisfies craving C when its level reaches
  // C*8/5 (= C*1.6). At that point closeness is 1 on every axis → 100%.
  const saturating = p(4.8, 1.6, 6.4, 3.2, 4.8, 3.2, 3.2);

  it('100% when the plate saturates every craved axis (level = craving × 1.6)', () => {
    expect(computeMatchPct(saturating, target)).toBe(100);
  });

  it('a same-scale copy (actual === target) is NOT 100 — you must stack to reach', () => {
    expect(computeMatchPct(target, target)).toBeLessThan(100);
  });

  it('an undershoot scores lower the farther below target it sits', () => {
    // hold every other axis at saturation; only vary wet BELOW its 0.6 target.
    const near = p(4, 1.6, 6.4, 3.2, 4.8, 3.2, 3.2); // wet 4 → got 0.5 (just under)
    const far = p(1, 1.6, 6.4, 3.2, 4.8, 3.2, 3.2); //  wet 1 → got 0.125 (far under)
    expect(computeMatchPct(near, target)).toBeGreaterThan(computeMatchPct(far, target));
  });

  it('overshooting a craved axis does NOT drop the score (closest-or-better)', () => {
    // wet way over its target should be exactly as good as hitting it — no penalty.
    const over = p(8, 1.6, 6.4, 3.2, 4.8, 3.2, 3.2);
    expect(computeMatchPct(over, target)).toBe(computeMatchPct(saturating, target));
  });
});

describe('checkRestrictions', () => {
  it('no-wet violated when actual.wet > 1', () => {
    const v = checkRestrictions(p(3), [], ['no-wet']);
    expect(v).toContain('no-wet');
  });
  it('no-wet passes when actual.wet ≤ 1', () => {
    const v = checkRestrictions(p(1), [], ['no-wet']);
    expect(v).toEqual([]);
  });
  it('no-dairy fires when cheese in plate', () => {
    const v = checkRestrictions(p(), ['cheese', 'beans'], ['no-dairy']);
    expect(v).toContain('no-dairy');
  });
  it('min-foods:3 violated with 2 foods', () => {
    const v = checkRestrictions(p(), ['beans', 'cheese'], ['min-foods:3']);
    expect(v).toContain('min-foods:3');
  });
  it('min-stink:4 passes with stink=5', () => {
    const v = checkRestrictions(p(0, 0, 5), [], ['min-stink:4']);
    expect(v).toEqual([]);
  });
  it('max-loud:2 violated with loud=4', () => {
    const v = checkRestrictions(p(0, 0, 0, 4), [], ['max-loud:2']);
    expect(v).toContain('max-loud:2');
  });
  it('need-cursed-or-rare passes with a rare food', () => {
    const v = checkRestrictions(p(), ['ghost-pepper'], ['need-cursed-or-rare']);
    expect(v).toEqual([]);
  });
  it('need-cursed-or-rare violated with only commons', () => {
    const v = checkRestrictions(p(), ['beans', 'cheese'], ['need-cursed-or-rare']);
    expect(v).toContain('need-cursed-or-rare');
  });
});

describe('evaluateMatch', () => {
  const target = p(3, 1, 4, 2, 3, 2, 2);
  const saturating = p(4.8, 1.6, 6.4, 3.2, 4.8, 3.2, 3.2);

  it('returns 100 + no violations when the plate saturates and no restrictions', () => {
    const r = evaluateMatch(saturating, ['beans', 'cheese'], target, []);
    expect(r.pct).toBe(100);
    expect(r.violations).toEqual([]);
  });

  it('subtracts 25% per violation (off a saturated 100 base → 75)', () => {
    const r = evaluateMatch(saturating, ['beans'], target, ['min-foods:3']);
    expect(r.violations).toEqual(['min-foods:3']);
    expect(r.pct).toBe(75);
  });

  it('floors to 0 when many violations stack on a poor base', () => {
    const wet = p(8, 1, 4, 2, 3, 2, 2);
    const r = evaluateMatch(wet, ['beans'], target, ['no-wet', 'min-foods:3']);
    expect(r.pct).toBeLessThan(50);
    expect(r.violations.length).toBe(2);
  });

  it('charge multiplier scales the final: perfect ≥ tap ≥ weak', () => {
    const partial = p(2, 1, 3, 1, 3, 1, 1);
    const tap = evaluateMatch(partial, ['beans'], target, [], 1.0).pct;
    const perfect = evaluateMatch(partial, ['beans'], target, [], 1.25).pct;
    const weak = evaluateMatch(partial, ['beans'], target, [], 0.85).pct;
    expect(perfect).toBeGreaterThanOrEqual(tap);
    expect(weak).toBeLessThanOrEqual(tap);
  });
});
