/**
 * Pantry shop — daily-rolled offerings. Per PLAN.md §D Tier 7 Phase G
 * items 49-51.
 *
 * Rules:
 *   - Daily roll: 3 uncommon + 1 rare + 0-1 epic, deterministic per UTC day.
 *   - Legendary is NOT in the shop (quest-unlocked — see Phase J).
 *   - Already-unlocked foods are filtered out so a player who buys an item
 *     on day N doesn't see it on day N+1 (their next roll has substitutes
 *     from the same rarity tier).
 *   - Pricing per rarity:
 *       uncommon = 12 gold  (~2-3 good launches)
 *       rare     = 30 gold  (~1 week of decent play)
 *       epic     = 70 gold  (a stretch goal — many days of saving)
 *
 * Pricing intuition: per-launch gold caps at 10 (perfect 100% match).
 * Daily belly budget = 20, average plate = 2-4 belly → 5-10 launches/day
 * theoretical max. Realistic engaged play yields ~30-50g per active day.
 * So uncommon is "afford one tomorrow", rare is "save for a few days",
 * epic is "save for a week". This sets the progression-arc cadence.
 */

import { FOODS, type Food, type Rarity, getFood } from './food';
import { loadGold, addGold, loadPantry, unlockFood } from './persistence';

export const PRICES: Partial<Record<Rarity, number>> = {
  uncommon: 12,
  rare: 30,
  epic: 70,
  // common: not sold (starts unlocked)
  // legendary: not sold (quest-unlocked)
};

export interface ShopOffer {
  foodId: string;
  price: number;
}

// ---------- deterministic seeded RNG (mulberry32) ----------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function utcDaySeed(d: Date): number {
  const yyyy = d.getUTCFullYear();
  const mm = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();
  return yyyy * 10_000 + mm * 100 + dd;
}

function pickK<T>(arr: T[], k: number, rng: () => number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  const take = Math.min(k, pool.length);
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

// ---------- daily roll ----------

export function getShopOffers(d: Date = new Date()): ShopOffer[] {
  const seed = utcDaySeed(d);
  const rng = mulberry32(seed);
  const unlocked = new Set(loadPantry());

  const eligible = (rarity: Rarity): Food[] =>
    FOODS.filter((f) => f.rarity === rarity && !unlocked.has(f.id));

  const out: ShopOffer[] = [];
  for (const u of pickK(eligible('uncommon'), 3, rng)) {
    out.push({ foodId: u.id, price: PRICES.uncommon! });
  }
  for (const r of pickK(eligible('rare'), 1, rng)) {
    out.push({ foodId: r.id, price: PRICES.rare! });
  }
  // Epic appears ~50% of days (seeded coin flip).
  if (rng() < 0.5) {
    for (const e of pickK(eligible('epic'), 1, rng)) {
      out.push({ foodId: e.id, price: PRICES.epic! });
    }
  }
  return out;
}

// ---------- purchase ----------

export type PurchaseResult =
  | { ok: true; newBalance: number }
  | { ok: false; reason: 'insufficient-gold' | 'already-unlocked' | 'unknown-food' };

export function attemptPurchase(foodId: string, price: number): PurchaseResult {
  const food = getFood(foodId);
  if (!food) return { ok: false, reason: 'unknown-food' };
  if (loadPantry().includes(foodId)) return { ok: false, reason: 'already-unlocked' };
  if (loadGold() < price) return { ok: false, reason: 'insufficient-gold' };
  const newBalance = addGold(-price);
  unlockFood(foodId);
  return { ok: true, newBalance };
}
