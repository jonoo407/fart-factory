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

describe('computeMatchPct', () => {
  it('100% when actual === target', () => {
    const target = p(3, 1, 4, 2, 3, 2, 2);
    expect(computeMatchPct(target, target)).toBe(100);
  });

  it('100% when actual within ±1 on every axis (tolerance band)', () => {
    const target = p(3, 1, 4, 2, 3, 2, 2);
    const actual = p(4, 0, 5, 1, 4, 3, 1); // each axis ±1
    expect(computeMatchPct(actual, target)).toBe(100);
  });

  it('drops monotonically as actual moves away from target', () => {
    const target = p(3, 1, 4, 2, 3, 2, 2);
    const close = computeMatchPct(p(4, 1, 4, 2, 3, 2, 2), target); // wet +1
    const farther = computeMatchPct(p(8, 1, 4, 2, 3, 2, 2), target); // wet +5
    expect(close).toBeGreaterThan(farther);
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
  it('returns 100 + no violations when actual matches and no restrictions', () => {
    const target = p(3, 1, 4, 2, 3, 2, 2);
    const r = evaluateMatch(target, ['beans', 'cheese'], target, []);
    expect(r.pct).toBe(100);
    expect(r.violations).toEqual([]);
  });

  it('subtracts 25% per violation', () => {
    const target = p(3, 1, 4, 2, 3, 2, 2);
    const r = evaluateMatch(target, ['beans'], target, ['min-foods:3']);
    expect(r.violations).toEqual(['min-foods:3']);
    expect(r.pct).toBe(75);
  });

  it('floors to 0 when many violations', () => {
    const target = p(3, 1, 4, 2, 3, 2, 2);
    const wet = p(8, 1, 4, 2, 3, 2, 2);
    const r = evaluateMatch(wet, ['beans'], target, ['no-wet', 'min-foods:3']);
    expect(r.pct).toBeLessThan(50);
    expect(r.violations.length).toBe(2);
  });
});
