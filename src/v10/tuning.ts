/**
 * PLAN v10 D1-D8 — every HOLD IT IN constant in one file, so a balance pass
 * is one diff. The three skill gates (tests/unit/v10-gates.test.ts) are the
 * tuner of record: any change here must keep that suite green.
 */

export type Zone = 'polite' | 'solid' | 'epic' | 'legendary';

/** UI meter scale (the belly can bulge to 20; nothing legit banks past SUMMIT). */
export const PRESSURE_MAX = 20;
/** D1 — a bite LANDING past this is a guaranteed bust. "The summit is 18." */
export const SUMMIT = 18;

/** D1 — zone bands over banked pressure (inclusive). */
export const ZONE_RANGES: Record<Zone, readonly [number, number]> = {
  polite: [1, 5],
  solid: [6, 10],
  epic: [11, 14],
  legendary: [15, 18],
};

/** D1 — applause multiplier per banked zone. */
export const ZONE_MULT: Record<Zone, number> = {
  polite: 1,
  solid: 2,
  epic: 3,
  legendary: 5,
};

/**
 * D2 (amended in P0) — bust chance per bite =
 * RISK_BY_PRESSURE[pressureAfter] × size² × venue riskMod.
 *
 * size² is load-bearing (the Pyramid theorem — v10-sequencing.test).
 * The rate rises WITHIN zones, not just between them: with a flat legendary
 * rate, crumb-topping 15→18 was nearly free and "always summit" became a
 * solved threshold (Gate 2 failed at 0% edge on the first run). The slope
 * makes every extra point of altitude a real decision.
 * Values tuned until the three §5.4 gates pass; margins print in CI output.
 */
export const RISK_BY_PRESSURE: readonly number[] = [
  /* 0-5 polite */ 0, 0, 0, 0, 0, 0,
  /* 6-10 solid */ 0.0011, 0.0012, 0.0014, 0.0016, 0.0018,
  /* 11-14 epic */ 0.0042, 0.005, 0.0056, 0.0066,
  /* 15-18 legendary */ 0.009, 0.013, 0.019, 0.027,
];

/** D3 — the clench. */
export const CLENCH_VENT = 2;
export const CLENCHES_PER_SHOW = 2;
export const WOBBLE_WINDOW_MS = 1200;

/**
 * D6 (amended in P0) — applause = bankedPressure × ZONE_MULT × factors.
 * Pressure scales WITHIN a zone so squeezing 18 beats banking 15 — without
 * this, "stop at the zone line" is a solved threshold and Gate 2 fails.
 */
export const LOVED_TAG_BONUS = 0.5;
export const UNMET_DEMAND_MULT = 0.5;
export const SCANDAL_DIVISOR = 4;
/**
 * D5 (amended in P0) — demands come in two kinds: MIN ("EPIC or the Frat Bros
 * boo") and CAP ("keep it UNDER: SOLID" — the Library). Meeting a cap pays a
 * premium (restraint is a skill); blowing past one is a scandal (÷4). Without
 * caps, "always summit" is a solved threshold and Gate 2 fails.
 */
export const CAP_MET_BONUS = 2;
/** A bust always pays at least this — nothing in v10 ever pays zero. */
export const BUST_PITY_APPLAUSE = 2;

/**
 * D6 (amended in P0) — the NUCLEAR bonus: banking at the very top of
 * LEGENDARY (≥ NUCLEAR_FROM) pays ×NUCLEAR_MULT. Without it the expert's
 * EV-optimal play was too cautious (Gate 3 read 9.8%): the excitement band
 * must come from reward steepness at altitude, not from cranking raw risk
 * (which only makes optimal play stop earlier). This also crowns the clench
 * summit-squeeze as the signature expert move.
 */
export const NUCLEAR_FROM = 17;
export const NUCLEAR_MULT = 1.5;

/** D6 — encore economics (replaces the v9 zero-pay anti-grind). */
export const ENCORE_FALLOFF = 0.75;
export const ENCORE_FLOOR = 0.25;
