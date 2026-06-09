/**
 * Per-food mastery. Per PLAN_v7 T2.3.
 *
 * Every time a food is included in a launch, its mastery counter ticks.
 * At Master (50+), the food gains +1 to its highest property axis.
 * Provides the "show progress on each food" feel the user asked about.
 */

import type { FoodProperties } from '../state/food';
import { getFood } from '../state/food';

const KEY_PREFIX = 'fart_food_mastery_';

export type MasteryLevel = 'novice' | 'apprentice' | 'adept' | 'master' | 'legendary';

export function loadFoodMastery(foodId: string): number {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${foodId}`);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveFoodMastery(foodId: string, value: number): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${foodId}`, String(Math.max(0, Math.floor(value))));
  } catch {
    // ignore
  }
}

export function recordFoodUse(idOrIds: string | string[]): void {
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  for (const id of ids) {
    saveFoodMastery(id, loadFoodMastery(id) + 1);
  }
}

export function masteryLevel(uses: number): MasteryLevel {
  if (uses >= 100) return 'legendary';
  if (uses >= 50) return 'master';
  if (uses >= 25) return 'adept';
  if (uses >= 10) return 'apprentice';
  return 'novice';
}

export function masteryLabel(level: MasteryLevel): string {
  switch (level) {
    case 'novice':     return '🌱 Novice';
    case 'apprentice': return '⭐ Apprentice';
    case 'adept':      return '⭐⭐ Adept';
    case 'master':     return '⭐⭐⭐ Master';
    case 'legendary':  return '👑 Legendary';
  }
}

const ZERO_BONUS: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };

/**
 * Returns the +1 mastery bonus to apply to the food's properties at launch.
 * Master and above only. The +1 goes to the highest property axis (ties
 * resolved by axis declaration order: wet, dry, stink, loud, musical, length, temp).
 */
export function masteryBonusForFood(foodId: string, level: MasteryLevel): FoodProperties {
  if (level !== 'master' && level !== 'legendary') return { ...ZERO_BONUS };
  const food = getFood(foodId);
  if (!food) return { ...ZERO_BONUS };
  const axes: Array<keyof FoodProperties> = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
  let bestAxis: keyof FoodProperties = 'wet';
  let bestVal = -1;
  for (const a of axes) {
    if (food.properties[a] > bestVal) {
      bestVal = food.properties[a];
      bestAxis = a;
    }
  }
  const out = { ...ZERO_BONUS };
  out[bestAxis] = 1;
  return out;
}

/** Apply the mastery bonus for every food in the plate to the props vector. */
export function applyMasteryBonuses(props: FoodProperties, foodIds: string[]): FoodProperties {
  const out: FoodProperties = { ...props };
  for (const id of foodIds) {
    const lvl = masteryLevel(loadFoodMastery(id));
    const bonus = masteryBonusForFood(id, lvl);
    for (const k of Object.keys(out) as Array<keyof FoodProperties>) {
      // ADD the mastery bonus. Do NOT clamp to 5 — these are SUMMED plate axes
      // (a 4-food plate legitimately reaches ~20), and the scorer measures
      // against AXIS_CAP=8. Capping the sum at 5 made every craving unfillable
      // (5/8 = 0.62 max) and every fart "short" (length pinned ≤5). Saturation
      // is the normalizer's job (÷AXIS_CAP, clamped to 1), not this function's.
      out[k] = out[k] + bonus[k];
    }
  }
  return out;
}
