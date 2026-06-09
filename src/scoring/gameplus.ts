/**
 * GamePlus mode effects. Per PLAN_v5.md P12.
 *
 * After defeating Boss 5, the flag `fart_gameplus` flips on. This
 * module exposes the effects that other code can query:
 *
 * 1. Audience rotation cycles 2× faster (handled in src/state/audience.ts
 *    by inspecting loadGamePlusUnlocked()).
 * 2. Daily Hot Spot pays 3× gold instead of 1×.
 * 3. Notebook badge "🌌 New Game+" appears (handled in src/ui/notebook.ts).
 *
 * Restriction-rate doubling is deferred — implementing it would require
 * a generation pass that injects restrictions per-launch, and the
 * tolerance for stacking restrictions hasn't been tuned. Documented as
 * a future-PLAN_v6 follow-up.
 */

import { loadGamePlusUnlocked } from '../state/boss-progress';
import { dailyHotLocation } from '../state/location-progress';

/**
 * Returns the gold-reward multiplier for the given launch location.
 * 3× when (GamePlus is on AND location is today's Hot Spot); else 1×.
 */
export function hotSpotGoldMultiplier(locationId: string): number {
  if (!loadGamePlusUnlocked()) return 1;
  const hot = dailyHotLocation();
  if (!hot || hot.id !== locationId) return 1;
  return 3;
}

/** True when launching at `locationId` earns the GamePlus Hot Spot 3x gold. */
export function isHotSpotActive(locationId: string): boolean {
  return hotSpotGoldMultiplier(locationId) > 1;
}
