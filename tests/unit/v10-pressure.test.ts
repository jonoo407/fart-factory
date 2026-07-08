import { describe, it, expect } from 'vitest';
import * as T from '../../src/v10/tuning';
import { zoneFor, zoneMult, biteRisk, isBustLanding } from '../../src/v10/pressure';

/**
 * PLAN v10 P0 / D1-D2 — the pressure ladder and the bite-risk formula.
 * Zone boundaries are structural (the UI zone arc, the demand system, and the
 * sequencing theorem all depend on them); risk COEFFICIENTS are knobs tuned by
 * the v10-gates suite, so here we pin their relationships only.
 */
describe('v10 zones (D1)', () => {
  it('ladder covers 1..SUMMIT with the four zones in order', () => {
    expect(zoneFor(1)).toBe('polite');
    expect(zoneFor(5)).toBe('polite');
    expect(zoneFor(6)).toBe('solid');
    expect(zoneFor(10)).toBe('solid');
    expect(zoneFor(11)).toBe('epic');
    expect(zoneFor(14)).toBe('epic');
    expect(zoneFor(15)).toBe('legendary');
    expect(zoneFor(T.SUMMIT)).toBe('legendary');
  });

  it('zone multipliers strictly escalate and LEGENDARY pays 5x', () => {
    expect(zoneMult('polite')).toBe(1);
    expect(zoneMult('solid')).toBeGreaterThan(zoneMult('polite'));
    expect(zoneMult('epic')).toBeGreaterThan(zoneMult('solid'));
    expect(zoneMult('legendary')).toBe(5);
  });

  it('the summit is absolute: landing past SUMMIT is a guaranteed bust', () => {
    expect(isBustLanding(T.SUMMIT)).toBe(false);
    expect(isBustLanding(T.SUMMIT + 1)).toBe(true);
    expect(biteRisk(T.SUMMIT - 1, 2)).toBe(1); // 17 + 2 = 19 > 18
  });
});

describe('v10 bite risk (D2): risk = ZONE_RISK[zone(after)] × size²', () => {
  it('POLITE and low-SOLID starts are free for small bites (the floor never punishes)', () => {
    expect(biteRisk(0, 3)).toBe(0); // lands 3, polite
    expect(biteRisk(2, 3)).toBe(0); // lands 5, polite
  });

  it('risk is monotone in landing zone for a fixed size', () => {
    const size = 3;
    const solid = biteRisk(5, size); // lands 8
    const epic = biteRisk(10, size); // lands 13
    const legendary = biteRisk(14, size); // lands 17
    expect(solid).toBeGreaterThan(0);
    expect(epic).toBeGreaterThan(solid);
    expect(legendary).toBeGreaterThan(epic);
  });

  it('risk is CONVEX in size (size², D2): one big bite costs more than two halves', () => {
    // Landing zone held constant (legendary) for both paths:
    const oneBig = biteRisk(12, 6); // lands 18, pays rate × 36
    const halfA = biteRisk(12, 3); // lands 15, pays rate × 9
    const halfB = biteRisk(15, 3); // lands 18, pays rate × 9
    expect(oneBig).toBeGreaterThan(halfA + halfB);
  });

  it('exact formula holds for an in-zone example', () => {
    // lands at 16 (legendary): RISK_BY_PRESSURE[16] × 4²
    expect(biteRisk(12, 4)).toBeCloseTo(T.RISK_BY_PRESSURE[16]! * 16, 10);
  });

  it('risk table: polite free, monotone non-decreasing, strictly rising WITHIN legendary', () => {
    expect(T.RISK_BY_PRESSURE.length).toBe(T.SUMMIT + 1);
    for (let p = 0; p <= 5; p++) expect(T.RISK_BY_PRESSURE[p]).toBe(0);
    for (let p = 6; p <= T.SUMMIT; p++) {
      expect(T.RISK_BY_PRESSURE[p]!).toBeGreaterThan(0);
      expect(T.RISK_BY_PRESSURE[p]!).toBeGreaterThanOrEqual(T.RISK_BY_PRESSURE[p - 1]!);
    }
    // The within-legendary slope is load-bearing: with a flat rate, crumb-topping
    // to the summit is free and "always summit" becomes a solved threshold.
    for (let p = 16; p <= T.SUMMIT; p++) {
      expect(T.RISK_BY_PRESSURE[p]!).toBeGreaterThan(T.RISK_BY_PRESSURE[p - 1]!);
    }
  });
});
