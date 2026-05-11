/**
 * Kitchen Mode auto-unlock tracking. Per PLAN_v5.md P9.
 *
 * After 5 launches with match% ≥ 50, the Kitchen Mode toggle gets
 * flipped on automatically + a celebratory toast appears. This
 * surfaces the advanced prep flow organically — Kitchen Mode no
 * longer has zero discoverability.
 */

import { loadKitchenMode } from '../ui/kitchen';

const KEY_GOOD_LAUNCHES = 'fart_good_launches';
export const KITCHEN_AUTO_UNLOCK_THRESHOLD = 5;
const SUCCESS_PCT_THRESHOLD = 50;

export function loadGoodLaunchCount(): number {
  try {
    const raw = localStorage.getItem(KEY_GOOD_LAUNCHES);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Called from onStoryLaunch. If the launch's match% is ≥ 50, increments
 * the good-launch count. Returns the new count.
 */
export function recordGoodLaunch(pct: number): number {
  if (!Number.isFinite(pct) || pct < SUCCESS_PCT_THRESHOLD) return loadGoodLaunchCount();
  const next = loadGoodLaunchCount() + 1;
  try {
    localStorage.setItem(KEY_GOOD_LAUNCHES, String(next));
  } catch {
    // ignore
  }
  return next;
}

export function shouldAutoUnlockKitchen(): boolean {
  if (loadKitchenMode()) return false; // already on
  return loadGoodLaunchCount() >= KITCHEN_AUTO_UNLOCK_THRESHOLD;
}
