/**
 * PLAN v10 P0 / D1-D2 — pure pressure math: zones, the summit rule, and the
 * bite-risk formula. No state, no RNG — the show state machine (show.ts) and
 * the policy simulators (policies.ts) both build on these.
 */
import { RISK_BY_PRESSURE, SUMMIT, ZONE_MULT, ZONE_RANGES, type Zone } from './tuning';

/** Zone for a banked/current pressure. Pressure ≤ 0 reads as polite (the squeak). */
export function zoneFor(pressure: number): Zone {
  if (pressure > SUMMIT) {
    throw new Error(`zoneFor(${pressure}): past the summit — that's a bust, not a zone`);
  }
  for (const zone of Object.keys(ZONE_RANGES) as Zone[]) {
    const [lo, hi] = ZONE_RANGES[zone];
    if (pressure >= lo && pressure <= hi) return zone;
  }
  return 'polite'; // pressure < 1
}

export function zoneMult(zone: Zone): number {
  return ZONE_MULT[zone];
}

/** D1 — landing past the summit is a guaranteed bust. */
export function isBustLanding(pressureAfter: number): boolean {
  return pressureAfter > SUMMIT;
}

/**
 * D2 — bust chance for one bite: RISK_BY_PRESSURE[after] × size² × riskMod.
 * size² is the Pyramid pin (§5.2.1): hauling a boulder to altitude is
 * disproportionately dangerous, so big-early ordering genuinely matters; the
 * within-zone slope makes every extra point of altitude a priced decision.
 */
export function biteRisk(pressureBefore: number, size: number, riskMod = 1): number {
  const after = pressureBefore + size;
  if (isBustLanding(after)) return 1;
  return Math.min(1, RISK_BY_PRESSURE[after]! * size * size * riskMod);
}

/** Bust probability of eating `bites` in order from empty: 1 − Π(1 − risk). */
export function pathBustProbability(bites: readonly number[], riskMod = 1): number {
  let survive = 1;
  let pressure = 0;
  for (const size of bites) {
    const risk = biteRisk(pressure, size, riskMod);
    if (risk >= 1) return 1;
    survive *= 1 - risk;
    pressure += size;
  }
  return 1 - survive;
}
