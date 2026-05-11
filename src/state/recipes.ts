/**
 * Recipe catalog for Tier 7 Story Mode. 30 named ingredient-combinations
 * that the player discovers by experimentation. Per PLAN.md §D.A.28.
 *
 * V8 T7 — Recipes are now "Named Farts": each carries a `bonus` vector
 * that boosts the fart properties when the combo is detected (scaled by
 * rarity). Legendary recipes additionally declare a `legendaryBuff`
 * passive that unlocks when the player decodes the entire recipe via
 * the Legendary Codex.
 *
 * Per FUN_CRITIC.md §4 axes:
 * - Curiosity Gaps (P19, P31): hidden recipes are discoverable info gaps.
 * - Decision Quality (P1): finding a recipe rewards experimentation.
 * - Progression (P22): unlocked recipes become tap-to-fill presets + bonus.
 * - Goal Stacking (P16): "find all 30 recipes" is a long-arc objective.
 */

import type { FoodProperties, Rarity } from './food';
import type { Region } from './containment';

export interface LegendaryBuffDecl {
  id: string;
  label: string;
  /** Optional short description shown in the codex panel. */
  description?: string;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  /** Ingredient ids from FOODS. 2-4 entries. Order doesn't matter. */
  ingredients: string[];
  rarity: Rarity;
  /** True = must be discovered by experimentation. False = pre-known (tutorial). */
  hidden: boolean;
  /** Optional flavor description. */
  description?: string;
  /** Optional quest requirement spec for legendary recipes. */
  legendaryUnlock?: {
    steps: string[]; // human-readable requirements
  };
  /** V8 T7.a — Named Fart bonus applied when this recipe is detected.
   * Magnitudes scale by rarity. Each axis bonus is in [1, 2]. */
  bonus: Partial<FoodProperties>;
  /** V8 T7.d — Legendary recipes declare a permanent passive that
   * unlocks when the codex's full slot grid has been decoded. */
  legendaryBuff?: LegendaryBuffDecl;
  /** Per PLAN_v5 P11: which region this recipe thematically belongs to.
   * Legendary recipes leave this off (cross-region by design). */
  region?: Region;
}

export const RECIPES: readonly Recipe[] = [
  // ====== Pre-known recipes (tutorial / shown in notebook from day 1) ======
  // Common: +1 to 1 axis (sum 1)
  { id: 'swamp-beast',    name: 'Swamp Beast',    emoji: '🐊', rarity: 'common',   hidden: false, region: 'hometown', ingredients: ['beans', 'cheese'],
    bonus: { stink: 1 },
    description: 'The bog stands up and walks.' },
  { id: 'silent-killer',  name: 'Silent Killer',  emoji: '🥷', rarity: 'common',   hidden: false, region: 'hometown', ingredients: ['egg', 'garlic'],
    bonus: { stink: 1 },
    description: 'Quiet but devastating.' },
  { id: 'mouse-squeak',   name: 'Mouse Squeak',   emoji: '🐭', rarity: 'common',   hidden: false, region: 'hometown', ingredients: ['onion', 'cabbage'],
    bonus: { loud: 1 },
    description: 'One pip. One regret.' },
  { id: 'trumpet-blast',  name: 'Trumpet Blast',  emoji: '🎺', rarity: 'common',   hidden: false, region: 'hometown', ingredients: ['beans', 'cabbage'],
    bonus: { loud: 1 },
    description: 'Loud and proud.' },
  { id: 'sad-trombone',   name: 'Sad Trombone',   emoji: '🎷', rarity: 'common',   hidden: false, region: 'hometown', ingredients: ['cheese', 'onion'],
    bonus: { musical: 1 },
    description: 'Three notes, all of them disappointed.' },

  // ====== Hidden uncommon recipes (mixed regions) ======
  // Uncommon: +1 to 2 axes (sum 2)
  { id: 'sulfur-bomb',    name: 'Sulfur Bomb',    emoji: '💣', rarity: 'uncommon', hidden: true, region: 'city',       ingredients: ['egg', 'pickle'],
    bonus: { stink: 1, temp: 1 },
    description: 'Lab goggles recommended.' },
  { id: 'fermented-fury', name: 'Fermented Fury', emoji: '⚡', rarity: 'uncommon', hidden: true, region: 'city',       ingredients: ['kimchi', 'cabbage'],
    bonus: { stink: 1, length: 1 },
    description: 'The Korean classic.' },
  { id: 'ocean-deep',     name: 'The Brine Reckoning', emoji: '🌊', rarity: 'uncommon', hidden: true, region: 'wilderness', ingredients: ['sardines', 'pickle'],
    bonus: { wet: 1, stink: 1 },
    description: 'The ocean filed a grievance.' },
  { id: 'asparagus-symphony', name: 'Asparagus Symphony', emoji: '🎼', rarity: 'uncommon', hidden: true, region: 'royal',  ingredients: ['asparagus', 'cheese'],
    bonus: { musical: 1, length: 1 },
    description: 'Three movements. No intermission.' },
  { id: 'spicy-rumble',   name: 'Spicy Rumble',   emoji: '🔥', rarity: 'uncommon', hidden: true, region: 'wilderness', ingredients: ['hot-pepper', 'beans'],
    bonus: { temp: 1, loud: 1 },
    description: 'Geothermal in the gut.' },
  { id: 'green-thunder',  name: 'Green Thunder',  emoji: '🥬', rarity: 'uncommon', hidden: true, region: 'wilderness', ingredients: ['broccoli', 'cabbage', 'onion'],
    bonus: { stink: 1, length: 1 },
    description: 'Triple-green concentrate.' },

  // ====== Hidden rare recipes ======
  // Rare: +2 to 1 axis OR +1 to 3 (sum 2 or 3)
  { id: 'volcano',        name: 'Volcano',        emoji: '🌋', rarity: 'rare',     hidden: true, region: 'wilderness', ingredients: ['hot-pepper', 'beans', 'cheese'],
    bonus: { temp: 2 },
    description: 'Hot, sustained, smelly.' },
  { id: 'aristocrat',     name: 'Brimstone Sonata', emoji: '🎩', rarity: 'rare',   hidden: true, region: 'royal',      ingredients: ['aged-stilton', 'asparagus', 'kombucha'],
    bonus: { musical: 1, stink: 1, length: 1 },
    description: 'The Aristocrat, raised by wolves.' },
  { id: 'champagne-pop',  name: 'Champagne Pop',  emoji: '🍾', rarity: 'rare',     hidden: true, region: 'city',       ingredients: ['kombucha', 'pickle'],
    bonus: { musical: 2 },
    description: 'A toast nobody asked for.' },
  { id: 'tiny-toot',      name: "The Goblin's Whistle", emoji: '🤏', rarity: 'rare', hidden: true, region: 'hometown', ingredients: ['onion', 'garlic', 'pickle'],
    bonus: { stink: 2 },
    description: 'Small mouth. Enormous opinion.' },
  { id: 'thunder-roll',   name: 'Thunder Roll',   emoji: '⛈️', rarity: 'rare',     hidden: true, region: 'wilderness', ingredients: ['ghost-pepper', 'beans', 'cabbage'],
    bonus: { loud: 2 },
    description: 'Big rumble.' },
  { id: 'dragon-belch',   name: 'Dragon Belch',   emoji: '🐉', rarity: 'rare',     hidden: true, region: 'wilderness', ingredients: ['ghost-pepper', 'kohlrabi'],
    bonus: { loud: 2 },
    description: 'Roar first. Apologize never.' },
  { id: 'duck-quack',     name: 'Duck Quack',     emoji: '🦆', rarity: 'rare',     hidden: true, region: 'wilderness', ingredients: ['durian', 'cabbage'],
    bonus: { musical: 2 },
    description: 'Brassy with raspberry.' },

  // ====== Hidden epic recipes ======
  // Epic: +2 to 2 axes (sum 4)
  { id: 'skunk-whisper',  name: 'The Forbidden Vespers', emoji: '🦨', rarity: 'epic', hidden: true, region: 'city', ingredients: ['stinky-tofu', 'pickled-egg', 'garlic'],
    bonus: { stink: 2, wet: 2 },
    description: 'Sung in the key of regret.' },
  { id: 'never-ending',   name: 'Operatic Marshcough', emoji: '♾️', rarity: 'epic', hidden: true, region: 'cosmic', ingredients: ['natto', 'cabbage', 'beans'],
    bonus: { length: 2, wet: 2 },
    description: 'Encore. Encore. Please stop.' },
  { id: 'machine-gun',    name: 'Machine Gun',    emoji: '🔫', rarity: 'epic',     hidden: true, region: 'city',       ingredients: ['hakarl', 'pickled-egg', 'kimchi'],
    bonus: { loud: 2, stink: 2 },
    description: 'Rapid staccato.' },
  { id: 'symphony',       name: 'Decommissioned Brass Choir', emoji: '🎻', rarity: 'epic', hidden: true, region: 'royal', ingredients: ['asparagus', 'kombucha', 'casu-marzu'],
    bonus: { musical: 2, loud: 2 },
    description: 'Section by section, they retire.' },
  { id: 'haunted-howl',   name: 'Haunted Howl',   emoji: '👻', rarity: 'epic',     hidden: true, region: 'cosmic',     ingredients: ['lutefisk', 'durian', 'aged-stilton'],
    bonus: { stink: 2, length: 2 },
    description: 'Spirits of dinners past.' },
  { id: 'royal-finale',   name: 'Wet Velvet Curtain Call', emoji: '👑', rarity: 'epic', hidden: true, region: 'royal', ingredients: ['kviek-yogurt', 'asparagus', 'aged-stilton'],
    bonus: { musical: 2, length: 2 },
    description: 'Standing ovation. Sliding exit.' },

  // ====== Hidden legendary recipes (quest-gated for unlock; multi-step) ======
  // Legendary: +2 to 3 axes (sum 6) + a permanent passive on full codex decode.
  { id: 'forbidden-blast', name: 'The Forbidden Blast', emoji: '☠️', rarity: 'legendary', hidden: true,
    ingredients: ['forbidden-burrito', 'volcano-chili', 'ghost-pepper'],
    bonus: { temp: 2, loud: 2, stink: 2 },
    description: 'They wrote songs about this one.',
    legendaryUnlock: { steps: ['Discover ≥10 recipes', 'Own ≥3 legendary foods', 'Win 3 matches in a row'] },
    legendaryBuff: { id: 'forbidden-gold', label: '+10% gold from every match', description: 'The reward for surviving a forbidden blast.' } },
  { id: 'cosmic-symphony', name: 'Cosmic Symphony', emoji: '🌌', rarity: 'legendary', hidden: true,
    ingredients: ['sky-bean', 'glowing-mushroom', 'kombucha'],
    bonus: { musical: 2, length: 2, stink: 2 },
    description: 'Felt as much as heard.',
    legendaryUnlock: { steps: ['Discover ≥15 recipes', 'Win match with Alien Tourists', 'Score ≥95% match'] },
    legendaryBuff: { id: 'cosmic-musical', label: '+1 musical to every plate', description: 'You hum without realizing it. The plate hums with you.' } },
  { id: 'grandmas-secret', name: "Grandma's Secret",  emoji: '🍲', rarity: 'legendary', hidden: true,
    ingredients: ['mystery-casserole', 'kviek-yogurt', 'cabbage', 'beans'],
    bonus: { wet: 2, stink: 2, length: 2 },
    description: 'Passed down for generations. We never asked.',
    legendaryUnlock: { steps: ['Own all common foods', "Own Aunt Edna's Yak Yogurt", 'Discover ≥5 epic recipes'] },
    legendaryBuff: { id: 'grandmas-belly', label: '+5 belly capacity each encounter', description: "There's always room for one more bite." } },
  { id: 'cursed-emanation', name: 'Cursed Emanation', emoji: '🪦', rarity: 'legendary', hidden: true,
    ingredients: ['cursed-egg', 'hakarl', 'durian'],
    bonus: { stink: 2, wet: 2, temp: 2 },
    description: 'Best deployed alone in a sealed room.',
    legendaryUnlock: { steps: ['Win match with Haunted Mansion', 'Discover ≥10 recipes', 'Own ≥2 epic foods'] },
    legendaryBuff: { id: 'cursed-fortune', label: '+25 gold per encounter that you survive', description: 'The curse pays its respects.' } },
  { id: 'apocalypse-class', name: 'Apocalypse Class', emoji: '🌪️', rarity: 'legendary', hidden: true,
    ingredients: ['forbidden-burrito', 'mystery-casserole', 'cursed-egg'],
    bonus: { stink: 2, wet: 2, length: 2 },
    description: 'Use only in emergencies. Or final exams.',
    legendaryUnlock: { steps: ['Discover ≥20 recipes', 'Own all legendary foods', 'Win match with Silent Monks'] },
    legendaryBuff: { id: 'apocalypse-reroll', label: 'One free intermission re-roll per encounter', description: 'You can always start a different ending.' } },
  { id: 'whisper-of-the-void', name: 'Whisper of the Void', emoji: '🕳️', rarity: 'legendary', hidden: true,
    ingredients: ['sky-bean', 'glowing-mushroom', 'lutefisk', 'casu-marzu'],
    bonus: { musical: 2, length: 2, stink: 2 },
    description: 'A fart with theological implications.',
    legendaryUnlock: { steps: ['Score 100% match in any encounter', 'Win with Silent Monks AND Volcano Cult', 'Own ≥4 legendary foods'] },
    legendaryBuff: { id: 'void-whisper', label: '+1 to every discovered axis on every launch', description: 'The void blesses your output.' } },
];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/**
 * Matches a plate of ingredient ids against the recipe catalog.
 * Returns the matched recipe's id, or null if no match.
 * Set-based comparison (order doesn't matter).
 */
export function matchRecipe(ingredientIds: string[]): string | null {
  if (ingredientIds.length < 2) return null;
  const plateSet = new Set(ingredientIds);
  for (const r of RECIPES) {
    if (r.ingredients.length !== ingredientIds.length) continue;
    const recipeSet = new Set(r.ingredients);
    if (recipeSet.size !== plateSet.size) continue;
    let allMatch = true;
    for (const i of recipeSet) {
      if (!plateSet.has(i)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return r.id;
  }
  return null;
}
