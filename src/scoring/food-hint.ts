/**
 * First-launch difficulty hints. Per PLAN_v5.md P7.
 *
 * For the first 3 launches of a fresh save (OR until the player has
 * scored ≥60% somewhere), surface a recommended-food banner so a new
 * player has a clear starting move.
 *
 * Recommendation algorithm: find the audience's top-2 axes (highest
 * cravings values), then pick UNLOCKED foods whose properties cover
 * those axes best. Score each food = sum over top axes of (food.props[axis]).
 */

import type { Audience } from '../state/audience';
import type { Food, FoodProperties } from '../state/food';
import { FOODS, getFood } from '../state/food';
import { loadBestMatchOverall } from '../state/persistence';

const KEY_LAUNCH_COUNT = 'fart_launch_count';
const HINT_LAUNCH_LIMIT = 3;
const HINT_SCORE_THRESHOLD = 60;

export function getLaunchCount(): number {
  try {
    const raw = localStorage.getItem(KEY_LAUNCH_COUNT);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementLaunchCount(): number {
  const next = getLaunchCount() + 1;
  try {
    localStorage.setItem(KEY_LAUNCH_COUNT, String(next));
  } catch {
    // ignore
  }
  return next;
}

export function shouldShowHint(): boolean {
  if (getLaunchCount() >= HINT_LAUNCH_LIMIT) return false;
  if (loadBestMatchOverall() >= HINT_SCORE_THRESHOLD) return false;
  return true;
}

export function recommendFoodsForAudience(aud: Audience, unlocked: ReadonlySet<string>): Food[] {
  // Identify the top-2 craving axes.
  const axes: (keyof FoodProperties)[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
  const sortedAxes = [...axes].sort((a, b) => aud.cravings[b] - aud.cravings[a]);
  const topAxes = sortedAxes.slice(0, 2);
  // Score each unlocked food by sum of properties on top axes.
  const scored: Array<{ food: Food; score: number }> = [];
  for (const id of unlocked) {
    const f = getFood(id);
    if (!f) continue;
    let s = 0;
    for (const axis of topAxes) s += f.properties[axis];
    scored.push({ food: f, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.food);
}

export { FOODS };
