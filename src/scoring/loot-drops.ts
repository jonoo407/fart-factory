/**
 * Random loot drops on critical success. Per PLAN_v7 T2.1.
 *
 * Adds the "loot accumulation" feel the user flagged. On a PERFECT
 * (≥95% match) launch, a random not-yet-unlocked food has a 30%
 * chance to drop (60% if a legendary food was on the plate).
 *
 * Legendary foods are excluded from the loot pool — they remain
 * quest/boss-only.
 */

import { FOODS, type Food } from '../state/food';
import { loadPantry } from '../state/persistence';
import { rngBetween } from '../state/run-state';
import type { CriticalTier } from './critical-tier';

export function dropChanceForLaunch(tier: CriticalTier, hadLegendary: boolean): number {
  if (tier !== 'perfect') return 0;
  return hadLegendary ? 0.60 : 0.30;
}

/**
 * Roll for a random food drop. Returns the dropped food (NOT-yet-unlocked,
 * non-legendary) or null if the roll fails / no eligible food exists.
 */
export function rollLootDrop(chance: number, seed: number): Food | null {
  if (chance <= 0) return null;
  // Roll: succeed if rngBetween(seed, 0, 99) < chance*100.
  const roll = rngBetween(seed, 0, 99);
  if (roll >= chance * 100) return null;
  const unlocked = new Set(loadPantry());
  const eligible = FOODS.filter((f) => f.rarity !== 'legendary' && !unlocked.has(f.id));
  if (eligible.length === 0) return null;
  // Weight: common > uncommon > rare > epic (common most likely).
  const weights: Record<string, number> = { common: 5, uncommon: 3, rare: 2, epic: 1 };
  const pool: Food[] = [];
  for (const f of eligible) {
    const w = weights[f.rarity] ?? 1;
    for (let i = 0; i < w; i++) pool.push(f);
  }
  const idx = rngBetween(seed + 1, 0, pool.length - 1);
  return pool[idx] ?? null;
}

/**
 * The Mystery Unicorn's guaranteed-legendary gift: a random not-yet-owned
 * legendary food (the ONE deliberate exception to the legendary-exclusion rule
 * above). Returns null if the player already owns every legendary.
 */
export function rollLegendaryDrop(seed: number): Food | null {
  const unlocked = new Set(loadPantry());
  const eligible = FOODS.filter((f) => f.rarity === 'legendary' && !unlocked.has(f.id));
  if (eligible.length === 0) return null;
  const idx = rngBetween(seed, 0, eligible.length - 1);
  return eligible[idx] ?? null;
}
