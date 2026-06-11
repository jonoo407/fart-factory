/**
 * PLAN v9 §1 / 05 §3 — centralized scoring + charge + gate tuning knobs.
 *
 * Every scoring/charge/gate/judge-card module imports from here so the
 * live-balance pass is a single file. Values are ported from the prototype
 * (`design_reference/prototype/ff-app.jsx` computeLaunch + ff-components.jsx
 * BlastButton) and pinned by tests/unit/tuning.test.ts.
 *
 * Normalization (D1): the player's plated axis sums are normalized by
 * AXIS_CAP=8; an audience's 0-5 cravings are normalized by TARGET_DIV=5.
 * BELLY_MAX is only used by the synthetic prototype-parity suite, which
 * replays the prototype's belly-derived `length` axis. The real scorer
 * treats `length` as an ordinary food axis (doc 06 correction #1).
 */

/** Denominator that normalizes a summed plate axis into 0-1. */
export const AXIS_CAP = 8;
/** Denominator that normalizes an audience craving (0-5) into a 0-1 target. */
export const TARGET_DIV = 5;
/** Prototype belly→length normalization (parity suite only). */
export const BELLY_MAX = 10;

/** Closeness curve: `closeness = max(0, 1 - |t-v|^pow * mult)`. */
export const CURVE = { pow: 0.85, mult: 1.5 } as const;

/** Weakest-link blend: `base = avg*weightedMean(closeness) + min*minCloseness`. */
export const BLEND = { avg: 0.55, min: 0.45 } as const;

/** Multiplicative "hate" penalty: `base *= 1 - HATE_COEFF * worstHateValue`. */
export const HATE_COEFF = 0.65;

/** Charge multipliers applied to the final match before rounding. */
export const CHARGE = {
  perfect: 1.25,
  good: 1.1,
  weak: 0.85,
  ok: 1.0,
  tap: 1.0,
} as const;

/**
 * Charge meter zones. The meter sweeps 0→100→0; on release `value` is the
 * sweep position and `heldMs` the press duration. `held < tapMs` short-circuits
 * to a safe tap (no bonus/penalty) regardless of `value`.
 */
export const CHARGE_ZONES = {
  sweetLo: 74,
  sweetHi: 92,
  goodLo: 62,
  goodHi: 98,
  weakBelow: 28,
  tapMs: 200,
} as const;

/**
 * Danger Zone (overcharge) — push-your-luck extension past the meter top.
 * Holding once the sweep pins at 100 ramps `depth` 0→1 over `rampMs`; release
 * pays `minMult→maxMult` by depth but risks a misfire with chance
 * `maxMisfire * depth^riskCurve` (so beating the safe ×1.25 perfect costs
 * real risk: depth 0.5 ≈ ×1.25 at ~12% misfire; full depth ×1.5 at 35%).
 */
export const OVERCHARGE = {
  rampMs: 1400,
  minMult: 1.0,
  maxMult: 1.5,
  maxMisfire: 0.35,
  riskCurve: 1.5,
} as const;

/** Research notes consoled on a misfire flop (science is also failure). */
export const MISFIRE_CONSOLATION_NOTES = 1;

/**
 * Live crowd read — the coarse mood preview while plating. `jitterPct` is the
 * ± fuzz added to the provisional pct BEFORE tier bucketing (anti-oracle: tier
 * only, and stable per plate composition so re-checking can't reroll it).
 * `debounceMs` paces the strip's animation/SFX, not the scoring itself.
 */
export const CROWD_READ = {
  jitterPct: 4,
  debounceMs: 300,
} as const;

/** A launch passes (can advance) at or above this match percentage. */
export const PASS_PCT = 50;

/** Grade letter boundaries (inclusive lower bounds), 01 §3.6. */
export const GRADE_CUTS = { S: 90, A: 80, B: 68, C: 50 } as const;

/** Star boundaries (inclusive lower bounds): 3★≥80, 2★≥68, 1★≥50, else 0. */
export const STAR_CUTS = { three: 80, two: 68, one: 50 } as const;

/**
 * Base gold paid at a 100% match, keyed by the audience's `difficultyTier`
 * (D4). Used when an audience does not declare an explicit `baseGold`. The
 * anti-grind rule pays only the improvement over the stored best (01 §4.3).
 */
export const GOLD_BY_TIER = {
  easy: 24,
  medium: 50,
  hard: 100,
  boss: 175,
} as const;
