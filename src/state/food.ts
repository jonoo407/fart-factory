/**
 * Food catalog for Tier 7 Story Mode. 30 foods across 5 rarity tiers,
 * each with fart-properties (wet/dry/stink/loud/musical/length/temp)
 * scaled 0-5 per axis. Per PLAN.md §D.A.26.
 *
 * Per FUN_CRITIC.md §4.5: bounded properties (no single food dominates),
 * combinatorial selection (pick K of N — see plate.ts), synergy/conflict
 * (see recipe.ts), discoverable recipes (see recipes.ts).
 *
 * Kid-safety: every food name + emoji is parent-safe. Outlandish but never
 * gross-for-grossness-sake.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface FoodProperties {
  wet: number;
  dry: number;
  stink: number;
  loud: number;
  musical: number;
  length: number;
  temp: number;
}

export interface Food {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  /** 1-8: belly cost when added to a plate. Common ~2-3, legendary ~5-8. */
  bellyCost: number;
  properties: FoodProperties;
  /** True for tier-1 common foods that start in every player's pantry. */
  startsUnlocked?: boolean;
  /** Optional flavor description shown in food detail view. */
  description?: string;
}

const p = (
  wet: number,
  dry: number,
  stink: number,
  loud: number,
  musical: number,
  length: number,
  temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

export const FOODS: readonly Food[] = [
  // ====== COMMON (6) — always unlocked, low belly cost ======
  { id: 'beans',       name: 'Beans',          emoji: '🫘', rarity: 'common',    bellyCost: 2, properties: p(3, 0, 3, 2, 0, 3, 1), startsUnlocked: true, description: 'The classic. Wet and stinky.' },
  { id: 'cheese',      name: 'Cheese',         emoji: '🧀', rarity: 'common',    bellyCost: 2, properties: p(2, 1, 3, 1, 0, 3, 1), startsUnlocked: true, description: 'Aged for stink, soft for length.' },
  { id: 'onion',       name: 'Onion',          emoji: '🧅', rarity: 'common',    bellyCost: 2, properties: p(1, 2, 4, 1, 0, 2, 2), startsUnlocked: true, description: 'Tears now, vapor later.' },
  { id: 'egg',         name: 'Egg',            emoji: '🥚', rarity: 'common',    bellyCost: 2, properties: p(1, 2, 4, 0, 0, 2, 1), startsUnlocked: true, description: 'Sulfur central.' },
  { id: 'garlic',      name: 'Garlic',         emoji: '🧄', rarity: 'common',    bellyCost: 2, properties: p(0, 2, 5, 1, 0, 3, 3), startsUnlocked: true, description: 'Sharp and aromatic.' },
  { id: 'cabbage',     name: 'Cabbage',        emoji: '🥬', rarity: 'common',    bellyCost: 3, properties: p(2, 1, 3, 2, 0, 4, 1), startsUnlocked: true, description: 'Slow burn. Wet finish.' },

  // ====== UNCOMMON (6) — unlock via gold or research ======
  { id: 'kimchi',      name: 'Kimchi',         emoji: '🥬', rarity: 'uncommon',  bellyCost: 3, properties: p(3, 1, 4, 2, 1, 3, 4), description: 'Fermented thunder.' },
  { id: 'sardines',    name: 'Sardines',       emoji: '🐟', rarity: 'uncommon',  bellyCost: 3, properties: p(4, 0, 4, 1, 0, 3, 2), description: 'The ocean wants out.' },
  { id: 'broccoli',    name: 'Broccoli',       emoji: '🥦', rarity: 'uncommon',  bellyCost: 2, properties: p(1, 1, 2, 1, 3, 2, 1), description: 'Secretly musical 🎺 — a polite little tune.' },
  { id: 'asparagus',   name: 'Asparagus',      emoji: '🌿', rarity: 'uncommon',  bellyCost: 3, properties: p(2, 1, 4, 1, 2, 3, 2), description: 'Musical and pungent.' },
  { id: 'pickle',      name: 'Pickle',         emoji: '🥒', rarity: 'uncommon',  bellyCost: 3, properties: p(4, 0, 3, 2, 1, 2, 0), description: 'Brine in motion.' },
  { id: 'hot-pepper',  name: 'Hot Pepper',     emoji: '🌶️', rarity: 'uncommon',  bellyCost: 4, properties: p(0, 2, 3, 3, 0, 3, 5), description: 'Pressure rises with the heat.' },

  // ====== RARE (6) — unlock via shop or quests, more potent ======
  { id: 'aged-stilton',name: 'Aged Stilton',   emoji: '🧀', rarity: 'rare',      bellyCost: 4, properties: p(3, 1, 5, 2, 0, 4, 2), description: 'Blue veins. Bolder profile.' },
  { id: 'kombucha',    name: 'Kombucha',       emoji: '🫖', rarity: 'rare',      bellyCost: 3, properties: p(4, 0, 3, 3, 2, 3, 2), description: 'Fizz with personality.' },
  { id: 'kohlrabi',    name: 'Kohlrabi',       emoji: '🥬', rarity: 'rare',      bellyCost: 4, properties: p(2, 2, 5, 3, 1, 4, 2), description: 'Roots that mean business.' },
  { id: 'durian',      name: 'Durian',         emoji: '🤢', rarity: 'rare',      bellyCost: 5, properties: p(3, 1, 5, 2, 0, 4, 4), description: 'Banned on certain transit systems.' },
  { id: 'ghost-pepper',name: 'Ghost Pepper',   emoji: '👻', rarity: 'rare',      bellyCost: 5, properties: p(0, 2, 4, 4, 0, 4, 5), description: 'Be careful.' },
  { id: 'pickled-egg', name: 'Pickled Egg',    emoji: '🥚', rarity: 'rare',      bellyCost: 4, properties: p(4, 1, 5, 1, 1, 4, 1), description: 'Vinegar + sulfur.' },

  // ====== EPIC (6) — quest-gated, distinctive flavor profiles ======
  { id: 'stinky-tofu', name: 'Stinky Tofu',    emoji: '🟫', rarity: 'epic',      bellyCost: 5, properties: p(3, 1, 5, 1, 2, 5, 2), description: 'Street-market legend.' },
  { id: 'natto',       name: 'Nattō',          emoji: '🟧', rarity: 'epic',      bellyCost: 5, properties: p(5, 0, 4, 0, 2, 4, 2), description: 'Sticky. Stretchy. Decisive.' },
  { id: 'lutefisk',    name: 'Lutefisk',       emoji: '🐟', rarity: 'epic',      bellyCost: 6, properties: p(5, 0, 5, 1, 0, 5, 1), description: 'Norwegian fish jelly. Yes really.' },
  { id: 'kviek-yogurt',name: "Aunt Edna's Yak Yogurt", emoji: '🐄', rarity: 'epic', bellyCost: 6, properties: p(5, 0, 4, 1, 3, 5, 2), description: 'A grandmother\'s pride.' },
  { id: 'hakarl',      name: 'Hákarl',         emoji: '🦈', rarity: 'epic',      bellyCost: 6, properties: p(3, 1, 5, 2, 1, 5, 3), description: 'Fermented shark. Iceland\'s gift.' },
  { id: 'casu-marzu',  name: 'Casu Marzu',     emoji: '🧀', rarity: 'epic',      bellyCost: 6, properties: p(4, 1, 5, 2, 1, 5, 3), description: 'Cheese with…opinions.' },

  // ====== LEGENDARY (6) — multi-step quest unlocks, world-altering ======
  // Sums kept ≤22 so legendary foods don't solo audiences — combinations still needed.
  { id: 'forbidden-burrito', name: 'The Forbidden Burrito', emoji: '🌯', rarity: 'legendary', bellyCost: 8, properties: p(3, 1, 5, 5, 0, 5, 3), description: 'Speak its name only when ready.' },
  { id: 'mystery-casserole', name: "Aunt Edna's Mystery Casserole", emoji: '🥘', rarity: 'legendary', bellyCost: 7, properties: p(4, 0, 5, 3, 3, 4, 3), description: 'Nobody knows what\'s in it. Don\'t ask.' },
  { id: 'glowing-mushroom',  name: 'Glowing Mushroom',      emoji: '🍄', rarity: 'legendary', bellyCost: 7, properties: p(1, 2, 5, 3, 4, 5, 2), description: 'Foraged on a full moon.' },
  { id: 'cursed-egg',        name: 'Cursed Egg of the Highlands', emoji: '🪺', rarity: 'legendary', bellyCost: 7, properties: p(3, 1, 5, 3, 2, 5, 3), description: 'Older than the hills it was found in.' },
  { id: 'volcano-chili',     name: 'Volcano Chili',         emoji: '🌋', rarity: 'legendary', bellyCost: 8, properties: p(0, 2, 4, 5, 1, 5, 5), description: 'The recipe was written in ash.' },
  { id: 'sky-bean',          name: 'Sky Bean',              emoji: '☁️', rarity: 'legendary', bellyCost: 7, properties: p(3, 1, 4, 4, 4, 5, 1), description: 'Levitates slightly. Sings before launch.' },
];

export function getFood(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}

export function foodsByRarity(): Record<Rarity, Food[]> {
  const out: Record<Rarity, Food[]> = {
    common: [], uncommon: [], rare: [], epic: [], legendary: [],
  };
  for (const f of FOODS) out[f.rarity].push(f);
  return out;
}
