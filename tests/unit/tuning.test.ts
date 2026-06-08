import { describe, it, expect } from 'vitest';
import * as T from '../../src/scoring/tuning';

/**
 * PLAN v9 D1/§1 — every scoring/charge/gate/judge-card module imports these,
 * so the live-balance pass is one file. This contract test pins the values.
 */
describe('scoring tuning constants', () => {
  it('axis normalization: actual /AXIS_CAP=8, target /5, belly /10 (parity only)', () => {
    expect(T.AXIS_CAP).toBe(8);
    expect(T.TARGET_DIV).toBe(5);
    expect(T.BELLY_MAX).toBe(10);
  });

  it('closeness curve pow 0.85 * 1.5', () => {
    expect(T.CURVE.pow).toBe(0.85);
    expect(T.CURVE.mult).toBe(1.5);
  });

  it('weakest-link blend 0.55 avg / 0.45 min sums to 1', () => {
    expect(T.BLEND.avg).toBe(0.55);
    expect(T.BLEND.min).toBe(0.45);
    expect(T.BLEND.avg + T.BLEND.min).toBeCloseTo(1, 10);
  });

  it('hate penalty coefficient 0.65', () => {
    expect(T.HATE_COEFF).toBe(0.65);
  });

  it('charge multipliers 1.25 / 1.10 / 0.85 / 1.0', () => {
    expect(T.CHARGE).toEqual({ perfect: 1.25, good: 1.1, weak: 0.85, ok: 1.0, tap: 1.0 });
  });

  it('charge zones: sweet 74-92, good 62-98, weak <28, tap <200ms', () => {
    expect(T.CHARGE_ZONES.sweetLo).toBe(74);
    expect(T.CHARGE_ZONES.sweetHi).toBe(92);
    expect(T.CHARGE_ZONES.goodLo).toBe(62);
    expect(T.CHARGE_ZONES.goodHi).toBe(98);
    expect(T.CHARGE_ZONES.weakBelow).toBe(28);
    expect(T.CHARGE_ZONES.tapMs).toBe(200);
  });

  it('grade / star / pass thresholds exact (01 §3.6)', () => {
    expect(T.PASS_PCT).toBe(50);
    expect(T.GRADE_CUTS).toEqual({ S: 90, A: 80, B: 68, C: 50 });
    expect(T.STAR_CUTS).toEqual({ three: 80, two: 68, one: 50 });
  });

  it('gold by difficulty tier (D4) — monotone, covers all four tiers', () => {
    expect(Object.keys(T.GOLD_BY_TIER).sort()).toEqual(['boss', 'easy', 'hard', 'medium']);
    expect(T.GOLD_BY_TIER.easy).toBeLessThan(T.GOLD_BY_TIER.medium);
    expect(T.GOLD_BY_TIER.medium).toBeLessThan(T.GOLD_BY_TIER.hard);
    expect(T.GOLD_BY_TIER.hard).toBeLessThan(T.GOLD_BY_TIER.boss);
  });
});
