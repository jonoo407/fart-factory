import { describe, it, expect, beforeEach } from 'vitest';
import {
  overchargeMultiplier,
  misfireChance,
  rollMisfire,
  misfireSeed,
} from '../../src/scoring/danger-zone';
import { OVERCHARGE } from '../../src/scoring/tuning';

/**
 * The Live Show — Danger Zone math. The gamble must be exactly what the
 * tuning promises: quality lerps minMult→maxMult by depth, misfire chance
 * ramps superlinearly to maxMisfire, and the roll is deterministic per
 * (encounter, launch index) so replays/tests can pin it.
 */
describe('overchargeMultiplier', () => {
  it('lerps minMult → maxMult across the depth ramp', () => {
    expect(overchargeMultiplier(0)).toBe(OVERCHARGE.minMult);
    expect(overchargeMultiplier(0.5)).toBeCloseTo((OVERCHARGE.minMult + OVERCHARGE.maxMult) / 2, 10);
    expect(overchargeMultiplier(1)).toBe(OVERCHARGE.maxMult);
  });

  it('is monotone in depth and clamps outside 0-1', () => {
    let prev = -Infinity;
    for (let d = 0; d <= 1.001; d += 0.1) {
      const m = overchargeMultiplier(d);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
    expect(overchargeMultiplier(-5)).toBe(OVERCHARGE.minMult);
    expect(overchargeMultiplier(5)).toBe(OVERCHARGE.maxMult);
  });
});

describe('misfireChance', () => {
  it('is zero at depth 0 and maxMisfire at full depth', () => {
    expect(misfireChance(0)).toBe(0);
    expect(misfireChance(1)).toBeCloseTo(OVERCHARGE.maxMisfire, 10);
  });

  it('ramps superlinearly: half depth costs well under half the max risk', () => {
    // 0.35 * 0.5^1.5 ≈ 0.124 — beating the safe ×1.25 perfect (depth 0.5)
    // costs ~12%, not 17.5%. Shallow dips stay cheap; greed gets expensive.
    expect(misfireChance(0.5)).toBeCloseTo(
      OVERCHARGE.maxMisfire * Math.pow(0.5, OVERCHARGE.riskCurve),
      10,
    );
    expect(misfireChance(0.5)).toBeLessThan(OVERCHARGE.maxMisfire / 2);
  });

  it('is monotone in depth and clamps outside 0-1', () => {
    let prev = -Infinity;
    for (let d = 0; d <= 1.001; d += 0.1) {
      const c = misfireChance(d);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
    expect(misfireChance(-1)).toBe(0);
    expect(misfireChance(2)).toBeCloseTo(OVERCHARGE.maxMisfire, 10);
  });
});

describe('rollMisfire — deterministic seeded roll', () => {
  it('never fires at chance 0 and always fires at chance 1', () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(rollMisfire(0, seed)).toBe(false);
      expect(rollMisfire(1, seed)).toBe(true);
    }
  });

  it('is deterministic: the same seed + chance always rolls the same', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(rollMisfire(0.35, seed)).toBe(rollMisfire(0.35, seed));
    }
  });

  it('fires at roughly the requested rate across many seeds', () => {
    const N = 10000;
    let fired = 0;
    for (let seed = 0; seed < N; seed++) {
      if (rollMisfire(0.35, seed)) fired++;
    }
    expect(fired / N).toBeGreaterThan(0.31);
    expect(fired / N).toBeLessThan(0.39);
  });
});

describe('misfireSeed — varies per encounter AND per launch', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fart_run_seed', '7');
  });

  it('is stable for the same encounter + launch index', () => {
    expect(misfireSeed(3, 1)).toBe(misfireSeed(3, 1));
  });

  it('rerolls across launch indices at the same encounter', () => {
    expect(misfireSeed(3, 1)).not.toBe(misfireSeed(3, 2));
  });

  it('rerolls across encounters', () => {
    expect(misfireSeed(3, 1)).not.toBe(misfireSeed(4, 1));
  });
});
