/**
 * Per-launch gold reward. Per PLAN.md §D Tier 7 Phase G item 48.
 *
 * Rule:
 *   - match% < 50  → 0 gold (no reward for sloppy launches)
 *   - match% ≥ 50  → floor(pct/10) gold
 *
 * 50 is the threshold because the audience-reaction tier "liked" starts
 * at ≥50 (see audienceReaction() in state/challenge.ts). Below "liked"
 * there's no audience demand for gold — they didn't like the show.
 *
 * The award curves up linearly: 50%→5g, 73%→7g, 100%→10g. Capping at
 * 10 gold/launch (the daily belly limit is ~3-5 launches/day, so a perfect
 * day caps at ~50 gold — enough to afford one rare food per ~3 days of
 * good play. See PLAN.md §D Tier 7 Phase G item 50 for shop pricing.)
 */

import { addGold, loadEarnedGold, bumpEarnedGold } from '../state/persistence';
import { hotSpotGoldMultiplier } from './gameplus';
import { legendaryGoldMultiplier } from './legendary-buffs';
import { GOLD_BY_TIER } from './tuning';
import type { Audience } from '../state/audience';

export function goldForMatch(pct: number): number {
  if (!Number.isFinite(pct) || pct < 50) return 0;
  const clamped = Math.min(100, pct);
  return Math.floor(clamped / 10);
}

/**
 * @param pct        match%
 * @param locationId Hot Spot GamePlus multiplier when matching.
 * @param extraMult  additional multiplier (e.g., Watch Comedy buff).
 */
export function awardGoldForLaunch(pct: number, locationId?: string, extraMult = 1): number {
  const base = goldForMatch(pct);
  const hotMult = locationId ? hotSpotGoldMultiplier(locationId) : 1;
  const legendaryMult = legendaryGoldMultiplier();
  return addGold(Math.floor(base * hotMult * extraMult * legendaryMult));
}

/** Base gold paid at a 100% match (D4): the audience's override, else the tier table. */
export function baseGoldForAudience(aud: Audience): number {
  return aud.baseGold ?? GOLD_BY_TIER[aud.difficultyTier];
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
  const full = Math.round(baseGold * (clampedPct / 100));
  const prev = loadEarnedGold(audienceId);
  const payout = Math.max(0, full - prev);
  if (payout > 0) {
    addGold(payout);
    bumpEarnedGold(audienceId, full);
  }
  return payout;
}
