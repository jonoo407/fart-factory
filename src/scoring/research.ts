/**
 * Research notes meta-progression. Per PLAN.md §D Tier 7 Phase I
 * items 55-57.
 *
 * The "failure is progress" loop (FUN_CRITIC.md P30 — Bushnell Floor):
 *   - match% < 50 → bank research notes = floor((100 - pct) / 20)
 *   - match% ≥ 50 → 0 notes (you got gold instead)
 *
 * Notes are spent in the Research panel to unlock non-legendary foods.
 * This gives stalled players a path forward without RNG (the daily
 * shop's offerings might not include the food they want; research
 * notes guarantee access to ANY uncommon/rare/epic food eventually).
 *
 * Costs are intentionally HIGHER than gold prices, because notes accrue
 * from failure (a free side-channel). Calibration:
 *   - gold uncommon = 12 (~1 day of good play)
 *   - notes uncommon = 8 (~2-3 days of bad play, banking 3-4 notes/day)
 *   - gold rare = 30 (~3 days of good play)
 *   - notes rare = 20 (~5-7 days of bad play)
 *   - gold epic = 70 (~10 days)
 *   - notes epic = 50 (~15 days)
 *
 * So gold is faster IF you can hit ≥50% match, but research notes are
 * the eventual fallback for players who can't crack the audience puzzle.
 */

import { FOODS, type Rarity, getFood } from '../state/food';
import {
  addResearchNotes,
  loadResearchNotes,
  loadPantry,
  unlockFood,
} from '../state/persistence';

export const RESEARCH_COSTS: Partial<Record<Rarity, number>> = {
  uncommon: 8,
  rare: 20,
  epic: 50,
  // common: free (starts unlocked)
  // legendary: quest-only (not research-eligible)
};

export function researchNotesForMatch(pct: number): number {
  if (!Number.isFinite(pct) || pct < 0 || pct >= 50) return 0;
  return Math.floor((100 - pct) / 20);
}

export function awardResearchForLaunch(pct: number): number {
  return addResearchNotes(researchNotesForMatch(pct));
}

export type ResearchPurchaseResult =
  | { ok: true; newBalance: number }
  | { ok: false; reason: 'unknown-food' | 'already-unlocked' | 'not-research-eligible' | 'insufficient-notes' };

export function attemptResearchUnlock(foodId: string): ResearchPurchaseResult {
  const food = getFood(foodId);
  if (!food) return { ok: false, reason: 'unknown-food' };
  if (loadPantry().includes(foodId)) return { ok: false, reason: 'already-unlocked' };
  const cost = RESEARCH_COSTS[food.rarity];
  if (cost === undefined) return { ok: false, reason: 'not-research-eligible' };
  if (loadResearchNotes() < cost) return { ok: false, reason: 'insufficient-notes' };
  const newBalance = addResearchNotes(-cost);
  unlockFood(foodId);
  return { ok: true, newBalance };
}

export interface ResearchListItem {
  foodId: string;
  cost: number;
}

export function researchEligibleFoods(): ResearchListItem[] {
  const unlocked = new Set(loadPantry());
  const out: ResearchListItem[] = [];
  for (const f of FOODS) {
    if (unlocked.has(f.id)) continue;
    const cost = RESEARCH_COSTS[f.rarity];
    if (cost === undefined) continue;
    out.push({ foodId: f.id, cost });
  }
  return out;
}
