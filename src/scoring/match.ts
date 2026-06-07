/**
 * Match-against-cravings scoring for Story Mode.
 *
 * PLAN v9 P1 — rewritten from the linear ±1-tolerance / flat-70 denominator
 * (which clustered every plate at 75-95%, the "instantly 80%" bug) to the
 * prototype's skill curve (ff-app.jsx computeLaunch §3.4):
 *   - normalize each judged axis: plated sum /AXIS_CAP, craving /TARGET_DIV
 *   - closeness = max(0, 1 - |t-v|^pow * mult)  — being off-target hurts fast
 *   - weakest-link blend: base = 0.55*weightedMean + 0.45*minCloseness
 *   - "no-X" hate penalty: base *= 1 - 0.65*worstHateAxisValue
 *   - charge multiplier folds in as final *= quality
 *
 * Signatures are preserved so callers (ui/result-panel.ts, ui/plate.ts) and
 * tests/unit/match-breakdown.test.ts keep compiling. `computeMatchBreakdown`
 * and `checkRestrictions` are intentionally UNCHANGED; the judge card consumes
 * the new `computeAxisFeedback` instead.
 */

import type { FoodProperties } from '../state/food';
import { getFood } from '../state/food';
import type { Audience } from '../state/audience';
import { deriveWants } from '../state/audience';
import { AXIS_CAP, TARGET_DIV, CURVE, BLEND, HATE_COEFF, PASS_PCT, GRADE_CUTS, STAR_CUTS } from './tuning';

const AXES: ReadonlyArray<keyof FoodProperties> = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

export interface MatchResult {
  /** 0-100 closeness to the audience cravings (after restrictions + charge). */
  pct: number;
  /** Restriction violations applied (each subtracts a flat penalty). */
  violations: string[];
}

export interface AxisBreakdown {
  axis: keyof FoodProperties;
  actual: number;
  target: number;
  /** max(0, |actual-target| - 1) — same per-axis term as the legacy scorer. */
  cost: number;
  /** true when within ±1 of target (cost === 0). */
  matched: boolean;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'F';

/** A single judged axis, all values normalized into 0-1. */
interface JudgedAxis {
  target: number;
  got: number;
  weight: number;
  hate: boolean;
}

/**
 * Steep closeness curve. 1 = dead on; falls off fast as the gap grows, and
 * clamps at 0 once you are more than ~`1/mult` away on the 0-1 scale.
 */
export function closeness(target: number, got: number): number {
  return Math.max(0, 1 - Math.pow(Math.abs(target - got), CURVE.pow) * CURVE.mult);
}

/**
 * Weakest-link blend over a set of judged axes (each already normalized 0-1).
 * You cannot coast by nailing one axis and ignoring another: 55% of the score
 * is the weighted mean closeness, 45% is the single worst axis. A "hate" axis
 * (a "no-X" rule) then multiplicatively tanks the score by how much of X you
 * brought (up to -65%).
 */
export function computeBase(judged: JudgedAxis[]): number {
  if (judged.length === 0) return 0;
  let sum = 0;
  let tot = 0;
  let minClose = 1;
  let worstHate = 0;
  for (const j of judged) {
    const c = closeness(j.target, j.got);
    sum += j.weight * c;
    tot += j.weight;
    if (c < minClose) minClose = c;
    if (j.hate) worstHate = Math.max(worstHate, j.got);
  }
  let base = tot > 0 ? BLEND.avg * (sum / tot) + BLEND.min * minClose : 0;
  base *= 1 - HATE_COEFF * worstHate;
  return base;
}

export function gradeForPct(pct: number): Grade {
  if (pct >= GRADE_CUTS.S) return 'S';
  if (pct >= GRADE_CUTS.A) return 'A';
  if (pct >= GRADE_CUTS.B) return 'B';
  if (pct >= GRADE_CUTS.C) return 'C';
  return 'F';
}

export function starsForPct(pct: number): 0 | 1 | 2 | 3 {
  if (pct >= STAR_CUTS.three) return 3;
  if (pct >= STAR_CUTS.two) return 2;
  if (pct >= STAR_CUTS.one) return 1;
  return 0;
}

export function passedForPct(pct: number): boolean {
  return pct >= PASS_PCT;
}

/** Axes hated via a "no-<axis>" restriction (e.g. no-wet → wet). */
function hateAxesFromRestrictions(restrictions: string[] | undefined): Set<keyof FoodProperties> {
  const out = new Set<keyof FoodProperties>();
  for (const r of restrictions ?? []) {
    const m = /^no-([a-z]+)$/.exec(r);
    if (m && (AXES as readonly string[]).includes(m[1]!)) out.add(m[1] as keyof FoodProperties);
  }
  return out;
}

/** Build the judged set from a raw target profile (positive wants only). */
function judgedFromTarget(actual: FoodProperties, target: FoodProperties): JudgedAxis[] {
  const out: JudgedAxis[] = [];
  for (const axis of AXES) {
    if (target[axis] > 0) {
      out.push({
        target: Math.min(1, target[axis] / TARGET_DIV),
        got: Math.min(1, actual[axis] / AXIS_CAP),
        weight: 1,
        hate: false,
      });
    }
  }
  return out;
}

/**
 * Per-axis breakdown of why the player got their score (UNCHANGED legacy
 * shape — result-panel.ts + match-breakdown.test.ts depend on it).
 */
export function computeMatchBreakdown(actual: FoodProperties, target: FoodProperties): AxisBreakdown[] {
  return AXES.map((axis) => {
    const a = actual[axis];
    const t = target[axis];
    const cost = Math.max(0, Math.abs(a - t) - 1);
    return { axis, actual: a, target: t, cost, matched: cost === 0 };
  });
}

/**
 * Headline match percentage for a plate vs a target craving profile. Judges
 * the audience's positive wants (non-zero target axes) with the closeness
 * curve + weakest-link blend. Hate penalties + charge live in `evaluateMatch`.
 */
export function computeMatchPct(actual: FoodProperties, target: FoodProperties): number {
  return Math.round(computeBase(judgedFromTarget(actual, target)) * 100);
}

export interface AxisFeedback {
  axis: keyof FoodProperties;
  hate: boolean;
  /** target ≥ 0.5 — "wanted LOTS" vs "wanted a little" (vs "wanted NONE" for hate). */
  wantHigh: boolean;
  /** desired level, normalized 0-1. */
  target: number;
  /** the plate's level on this axis, normalized 0-1. */
  got: number;
  closeness: number;
  status: 'hit' | 'near' | 'miss';
}

/**
 * The judge-card data layer (PLAN v9 P2 / 04 §3). One row per judged axis with
 * the wanted/hated label, the bar level + dashed target marker positions, and a
 * ✓ hit (≥0.8) / ~ close (≥0.55) / ✗ miss status. Shares the production
 * `closeness`, so the card lines up with the headline pct.
 */
export function computeAxisFeedback(actual: FoodProperties, audience: Audience): AxisFeedback[] {
  return deriveWants(audience).map((w) => {
    const got = Math.min(1, actual[w.axis] / AXIS_CAP);
    const c = closeness(w.target, got);
    return {
      axis: w.axis,
      hate: w.hate,
      wantHigh: w.target >= 0.5,
      target: w.target,
      got,
      closeness: c,
      status: c >= 0.8 ? 'hit' : c >= 0.55 ? 'near' : 'miss',
    };
  });
}

/**
 * Applies audience restrictions. Each restriction has a string form like:
 *   "no-wet"            → actual.wet must be ≤ 1
 *   "no-dairy"          → none of the ingredients have id matching "cheese" / "aged-stilton" / etc.
 *   "min-foods:3"       → ingredientIds.length ≥ 3
 *   "min-stink:4"       → actual.stink ≥ 4
 *   "max-loud:2"        → actual.loud ≤ 2
 *   "max-stink:2"       → actual.stink ≤ 2
 *   "need-cursed-or-rare" → at least one ingredient with rarity rare/epic/legendary
 *
 * Returns the list of violated restrictions (empty = passes all).
 */
export function checkRestrictions(
  actual: FoodProperties,
  ingredientIds: string[],
  restrictions: string[] | undefined,
): string[] {
  if (!restrictions || restrictions.length === 0) return [];
  const out: string[] = [];
  for (const r of restrictions) {
    if (r === 'no-wet' && actual.wet > 1) out.push(r);
    else if (r === 'no-dairy') {
      const dairy = new Set(['cheese', 'aged-stilton', 'casu-marzu', 'kviek-yogurt', 'natto']);
      if (ingredientIds.some((id) => dairy.has(id))) out.push(r);
    } else if (r.startsWith('min-foods:')) {
      const n = parseInt(r.slice('min-foods:'.length), 10);
      if (ingredientIds.length < n) out.push(r);
    } else if (r.startsWith('min-stink:')) {
      const n = parseInt(r.slice('min-stink:'.length), 10);
      if (actual.stink < n) out.push(r);
    } else if (r.startsWith('max-loud:')) {
      const n = parseInt(r.slice('max-loud:'.length), 10);
      if (actual.loud > n) out.push(r);
    } else if (r.startsWith('max-stink:')) {
      const n = parseInt(r.slice('max-stink:'.length), 10);
      if (actual.stink > n) out.push(r);
    } else if (r === 'need-cursed-or-rare') {
      const valid = new Set(['rare', 'epic', 'legendary']);
      const has = ingredientIds.some((id) => valid.has(getFood(id)?.rarity ?? ''));
      if (!has) out.push(r);
    }
  }
  return out;
}

/**
 * The full Story-Mode launch score: closeness/blend base + the multiplicative
 * "no-X" hate penalty + the flat per-violation penalty + the charge multiplier.
 *
 * @param quality charge multiplier (default 1.0 = a safe tap). 1.25 perfect,
 *                0.85 weak, etc. — see scoring/charge.ts.
 */
export function evaluateMatch(
  actual: FoodProperties,
  ingredientIds: string[],
  audienceCravings: FoodProperties,
  audienceRestrictions: string[] | undefined,
  quality = 1,
): MatchResult {
  const violations = checkRestrictions(actual, ingredientIds, audienceRestrictions);
  const hated = hateAxesFromRestrictions(audienceRestrictions);

  const judged: JudgedAxis[] = [];
  for (const axis of AXES) {
    const got = Math.min(1, actual[axis] / AXIS_CAP);
    if (hated.has(axis)) {
      judged.push({ target: 0, got, weight: 1, hate: true });
    } else if (audienceCravings[axis] > 0) {
      judged.push({ target: Math.min(1, audienceCravings[axis] / TARGET_DIV), got, weight: 1, hate: false });
    }
  }

  let final = computeBase(judged); // includes the multiplicative hate penalty
  // Flat per-violation penalty kept from the legacy scorer (doc 06 §3: "keep
  // that, but also apply" the hate penalty). 0.25 fraction == 25 points.
  final = Math.max(0, final - 0.25 * violations.length);
  // Charge folds in last, exactly like the prototype (final *= quality).
  final = Math.min(1, final * quality);

  return { pct: Math.round(final * 100), violations };
}
