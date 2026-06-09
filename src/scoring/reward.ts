/**
 * Launch gold rewards. The live payout path is
 * `launchBaseGold → awardGoldForEncounter` (anti-grind: pay only the
 * improvement over the stored best per crowd, PLAN v9 P2 / 01 §4.3).
 */

import { addGold, loadEarnedGold, bumpEarnedGold } from '../state/persistence';
import { hotSpotGoldMultiplier } from './gameplus';
import { legendaryGoldMultiplier } from './legendary-buffs';
import { GOLD_BY_TIER } from './tuning';
import type { Audience } from '../state/audience';

/** Base gold paid at a 100% match (D4): the audience's override, else the tier table. */
export function baseGoldForAudience(aud: Audience): number {
  return aud.baseGold ?? GOLD_BY_TIER[aud.difficultyTier];
}

/**
 * Base gold for a launch at `locationId`, with the GamePlus Daily Hot Spot
 * multiplier (3x) folded in. This is the LIVE entry point the launch path
 * calls — the Hot Spot 3x used to live in a now-orphaned function and never
 * reached a real payout, so route it through here.
 */
export function launchBaseGold(aud: Audience, locationId: string): number {
  return Math.round(baseGoldForAudience(aud) * hotSpotGoldMultiplier(locationId));
}

/**
 * Apply the legendary "forbidden-gold" passive (+10% gold from every match) to a
 * bonus gold amount (wow / critical / hidden-combo / ultimate). The main match
 * payout applies it inside awardGoldForEncounter; this covers the bonus sources
 * so the "+10% from EVERY match" promise holds across all launch gold.
 */
export function legendaryGold(amount: number): number {
  return Math.round(amount * legendaryGoldMultiplier());
}

/**
 * PLAN v9 P2 / 01 §4.3 — anti-grind encounter payout. The full gold at this
 * match is `round(baseGold * pct/100)`; you are paid only the IMPROVEMENT over
 * your stored best on this crowd (so re-clearing to "Improve" pays the
 * difference, never the full amount again). Caller gates on a pass (pct ≥ 50).
 *
 * @returns the gold actually paid this call (0 if no improvement).
 */
export function awardGoldForEncounter(audienceId: string, baseGold: number, pct: number): number {
  const clampedPct = Math.max(0, Math.min(100, pct));
  // Legendary forbidden-gold passive (+10% from every match) folds into the
  // live payout here so it actually reaches credited gold.
  const full = Math.round(baseGold * (clampedPct / 100) * legendaryGoldMultiplier());
  const prev = loadEarnedGold(audienceId);
  const payout = Math.max(0, full - prev);
  if (payout > 0) {
    addGold(payout);
    bumpEarnedGold(audienceId, full);
  }
  return payout;
}
