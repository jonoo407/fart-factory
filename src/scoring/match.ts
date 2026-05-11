/**
 * Match-against-cravings scoring for Tier 7 Story Mode. Per PLAN.md §D
 * Phase E item 44. Closes the Disjoint Systems gate by giving Story
 * Mode a single grading system (replaces gradeFart() use in the new flow).
 *
 * Inputs:
 *   - fart_props: result of computeFartFromPlate() post-area-modifier
 *   - audience_cravings: target profile from getDailyAudience()
 *   - restrictions: optional rules that auto-zero or penalize the launch
 *
 * Output: 0-100 match percentage + optional applied-penalty notes.
 *
 * Per FUN_CRITIC.md P20 (system integration): this is THE scoring system
 * in Story Mode. The legacy gradeFart() coexists only in Sandbox Mode.
 */

import type { FoodProperties } from '../state/food';
import { getFood } from '../state/food';

const AXES: ReadonlyArray<keyof FoodProperties> = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

export interface MatchResult {
  /** 0-100 closeness to the audience cravings (after area modifiers + restrictions). */
  pct: number;
  /** Restriction violations applied (each zeros or penalizes). */
  violations: string[];
}

export interface AxisBreakdown {
  axis: keyof FoodProperties;
  actual: number;
  target: number;
  /** max(0, |actual-target| - 1) — same per-axis term as computeMatchPct */
  cost: number;
  /** true when within ±1 of target (cost === 0). */
  matched: boolean;
}

/**
 * Per-axis breakdown of why the player got their score. Used by the
 * result panel to surface cause→effect (PLAN_v7 T1.1).
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
 * Tolerant L1 distance: each axis contributes max(0, |actual - target| - 1)
 * so being within ±1 of the target is "perfect" for that axis. Max distance
 * per axis = 14 - 1 = 13 (if actual=14 and target=0). Sum across 7 axes
 * normalized into 0-100 percentage.
 */
export function computeMatchPct(actual: FoodProperties, target: FoodProperties): number {
  let totalDiff = 0;
  let totalMax = 0;
  for (const axis of AXES) {
    const a = actual[axis];
    const t = target[axis];
    const diff = Math.max(0, Math.abs(a - t) - 1);
    totalDiff += diff;
    // Conservative max per axis: assume worst-case absolute diff of 10 (since
    // crafted plates are typically 0-15 per axis after synergies).
    totalMax += 10;
  }
  const normalized = Math.max(0, 1 - totalDiff / totalMax);
  return Math.round(normalized * 100);
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

export function evaluateMatch(
  actual: FoodProperties,
  ingredientIds: string[],
  audienceCravings: FoodProperties,
  audienceRestrictions: string[] | undefined,
): MatchResult {
  const violations = checkRestrictions(actual, ingredientIds, audienceRestrictions);
  let pct = computeMatchPct(actual, audienceCravings);
  // Each violation drops 25%; floor 0.
  if (violations.length > 0) {
    pct = Math.max(0, pct - violations.length * 25);
  }
  return { pct, violations };
}
