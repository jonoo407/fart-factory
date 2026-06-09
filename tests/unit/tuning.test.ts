import { describe, it, expect } from 'vitest';
import * as T from '../../src/scoring/tuning';

/**
 * PLAN v9 D1/§1 — every scoring/charge/gate/judge-card module imports these,
 * so the live-balance pass is one file.
 *
 * This contract test pins the RELATIONSHIPS between knobs, not their exact
 * values. (The old version restated every constant verbatim, so any intended
 * balance pass had to edit the test in lockstep — meaning it could never catch
 * an unintended change, only re-state an intended one. The invariants below
 * hold across balance passes and DO catch real mistakes: inverted zones,
 * blends that don't sum to 1, non-monotone payout tiers…)
 */
describe('scoring tuning invariants', () => {
  it('axis normalization saturates: plate cap exceeds craving divisor (C×(AXIS_CAP/TARGET_DIV) reachable)', () => {
    expect(T.AXIS_CAP).toBeGreaterThan(0);
    expect(T.TARGET_DIV).toBeGreaterThan(0);
    // The v9 model: a craving C is satisfied at C * AXIS_CAP/TARGET_DIV plate
    // sum — that only works as a skill curve if the ratio is > 1.
    expect(T.AXIS_CAP / T.TARGET_DIV).toBeGreaterThan(1);
    expect(T.BELLY_MAX).toBeGreaterThan(0);
  });

  it('closeness curve is a decreasing penalty (pow in (0,1], positive mult)', () => {
    expect(T.CURVE.pow).toBeGreaterThan(0);
    expect(T.CURVE.pow).toBeLessThanOrEqual(1);
    expect(T.CURVE.mult).toBeGreaterThan(0);
  });

  it('weakest-link blend sums to 1 and both terms count', () => {
    expect(T.BLEND.avg + T.BLEND.min).toBeCloseTo(1, 10);
    expect(T.BLEND.avg).toBeGreaterThan(0);
    expect(T.BLEND.min).toBeGreaterThan(0);
  });

  it('hate penalty coefficient is a real penalty in (0, 1]', () => {
    expect(T.HATE_COEFF).toBeGreaterThan(0);
    expect(T.HATE_COEFF).toBeLessThanOrEqual(1);
  });

  it('charge multipliers reward skill: weak < tap = ok ≤ good < perfect, weak punishes, perfect rewards', () => {
    expect(T.CHARGE.weak).toBeLessThan(1);
    expect(T.CHARGE.tap).toBe(1.0); // a safe tap must never punish (kid-friendly floor)
    expect(T.CHARGE.ok).toBe(T.CHARGE.tap);
    expect(T.CHARGE.good).toBeGreaterThanOrEqual(T.CHARGE.ok);
    expect(T.CHARGE.perfect).toBeGreaterThan(T.CHARGE.good);
  });

  it('charge zones nest: weakBelow < goodLo < sweetLo < sweetHi < goodHi ≤ 100', () => {
    const z = T.CHARGE_ZONES;
    expect(z.weakBelow).toBeGreaterThan(0);
    expect(z.weakBelow).toBeLessThan(z.goodLo);
    expect(z.goodLo).toBeLessThan(z.sweetLo);
    expect(z.sweetLo).toBeLessThan(z.sweetHi);
    expect(z.sweetHi).toBeLessThan(z.goodHi);
    expect(z.goodHi).toBeLessThanOrEqual(100);
    expect(z.tapMs).toBeGreaterThan(0);
  });

  it('grade cuts are strictly ordered and the pass line is the C grade', () => {
    expect(T.GRADE_CUTS.S).toBeGreaterThan(T.GRADE_CUTS.A);
    expect(T.GRADE_CUTS.A).toBeGreaterThan(T.GRADE_CUTS.B);
    expect(T.GRADE_CUTS.B).toBeGreaterThan(T.GRADE_CUTS.C);
    expect(T.PASS_PCT).toBe(T.GRADE_CUTS.C); // passing == earning at least a C
  });

  it('star cuts align with the A/B/C grade cuts (stars and grades agree)', () => {
    expect(T.STAR_CUTS.three).toBe(T.GRADE_CUTS.A);
    expect(T.STAR_CUTS.two).toBe(T.GRADE_CUTS.B);
    expect(T.STAR_CUTS.one).toBe(T.GRADE_CUTS.C);
  });

  it('gold by difficulty tier (D4) — monotone, covers all four tiers', () => {
    expect(Object.keys(T.GOLD_BY_TIER).sort()).toEqual(['boss', 'easy', 'hard', 'medium']);
    expect(T.GOLD_BY_TIER.easy).toBeLessThan(T.GOLD_BY_TIER.medium);
    expect(T.GOLD_BY_TIER.medium).toBeLessThan(T.GOLD_BY_TIER.hard);
    expect(T.GOLD_BY_TIER.hard).toBeLessThan(T.GOLD_BY_TIER.boss);
  });
});
