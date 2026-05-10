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

import { addGold } from '../state/persistence';

export function goldForMatch(pct: number): number {
  if (!Number.isFinite(pct) || pct < 50) return 0;
  const clamped = Math.min(100, pct);
  return Math.floor(clamped / 10);
}

export function awardGoldForLaunch(pct: number): number {
  const gain = goldForMatch(pct);
  return addGold(gain);
}
