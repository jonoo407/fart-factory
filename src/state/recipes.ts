/**
 * Recipe catalog for Tier 7 Story Mode. 30+ named ingredient-combinations
 * that the player discovers by experimentation. Per PLAN.md §D.A.28.
 *
 * Per FUN_CRITIC.md §4 axes:
 * - Curiosity Gaps (P19, P31): hidden recipes are discoverable info gaps.
 * - Decision Quality (P1): finding a recipe rewards experimentation.
 * - Progression (P22): unlocked recipes become tap-to-fill presets.
 * - Goal Stacking (P16): "find all 30 recipes" is a long-arc objective.
 */

import type { Rarity } from './food';

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
}

export const RECIPES: readonly Recipe[] = [
  // ====== Pre-known recipes (tutorial / shown in notebook from day 1) ======
  { id: 'swamp-beast',    name: 'Swamp Beast',    emoji: '🐊', rarity: 'common',   hidden: false, ingredients: ['beans', 'cheese'],                                description: 'The classic wet stinker.' },
  { id: 'silent-killer',  name: 'Silent Killer',  emoji: '🥷', rarity: 'common',   hidden: false, ingredients: ['egg', 'garlic'],                                  description: 'Quiet but devastating.' },
  { id: 'mouse-squeak',   name: 'Mouse Squeak',   emoji: '🐭', rarity: 'common',   hidden: false, ingredients: ['onion', 'cabbage'],                               description: 'Brief and surprising.' },
  { id: 'trumpet-blast',  name: 'Trumpet Blast',  emoji: '🎺', rarity: 'common',   hidden: false, ingredients: ['beans', 'cabbage'],                               description: 'Loud and proud.' },
  { id: 'sad-trombone',   name: 'Sad Trombone',   emoji: '🎷', rarity: 'common',   hidden: false, ingredients: ['cheese', 'onion'],                                description: 'Womp womp.' },

  // ====== Hidden uncommon recipes ======
  { id: 'sulfur-bomb',    name: 'Sulfur Bomb',    emoji: '💣', rarity: 'uncommon', hidden: true,  ingredients: ['egg', 'pickle'],                                  description: 'Vinegar + sulfur.' },
  { id: 'fermented-fury', name: 'Fermented Fury', emoji: '⚡', rarity: 'uncommon', hidden: true,  ingredients: ['kimchi', 'cabbage'],                              description: 'The Korean classic.' },
  { id: 'ocean-deep',     name: 'Ocean Deep',     emoji: '🌊', rarity: 'uncommon', hidden: true,  ingredients: ['sardines', 'pickle'],                             description: 'Salt of the earth.' },
  { id: 'asparagus-symphony', name: 'Asparagus Symphony', emoji: '🎼', rarity: 'uncommon', hidden: true, ingredients: ['asparagus', 'cheese'],                     description: 'Musical and surprising.' },
  { id: 'spicy-rumble',   name: 'Spicy Rumble',   emoji: '🔥', rarity: 'uncommon', hidden: true,  ingredients: ['hot-pepper', 'beans'],                            description: 'The slow burn.' },
  { id: 'green-thunder',  name: 'Green Thunder',  emoji: '🥬', rarity: 'uncommon', hidden: true,  ingredients: ['broccoli', 'cabbage', 'onion'],                   description: 'Triple-green concentrate.' },

  // ====== Hidden rare recipes (need 3 ingredients usually) ======
  { id: 'volcano',        name: 'Volcano',        emoji: '🌋', rarity: 'rare',     hidden: true,  ingredients: ['hot-pepper', 'beans', 'cheese'],                  description: 'Hot, sustained, smelly.' },
  { id: 'aristocrat',     name: 'The Aristocrat', emoji: '🎩', rarity: 'rare',     hidden: true,  ingredients: ['aged-stilton', 'asparagus', 'kombucha'],          description: 'Refined and musical.' },
  { id: 'champagne-pop',  name: 'Champagne Pop',  emoji: '🍾', rarity: 'rare',     hidden: true,  ingredients: ['kombucha', 'pickle'],                             description: 'Brief, fizzy, bright.' },
  { id: 'tiny-toot',      name: 'Tiny Toot',      emoji: '🤏', rarity: 'rare',     hidden: true,  ingredients: ['onion', 'garlic', 'pickle'],                      description: 'Restrained excellence.' },
  { id: 'thunder-roll',   name: 'Thunder Roll',   emoji: '⛈️', rarity: 'rare',     hidden: true,  ingredients: ['ghost-pepper', 'beans', 'cabbage'],               description: 'Big rumble.' },
  { id: 'dragon-belch',   name: 'Dragon Belch',   emoji: '🐉', rarity: 'rare',     hidden: true,  ingredients: ['ghost-pepper', 'kohlrabi'],                       description: 'Hot, loud, brassy.' },
  { id: 'duck-quack',     name: 'Duck Quack',     emoji: '🦆', rarity: 'rare',     hidden: true,  ingredients: ['durian', 'cabbage'],                              description: 'Brassy with raspberry.' },

  // ====== Hidden epic recipes (3-4 ingredients, often need uncommon/rare) ======
  { id: 'skunk-whisper',  name: 'Skunk Whisper',  emoji: '🦨', rarity: 'epic',     hidden: true,  ingredients: ['stinky-tofu', 'pickled-egg', 'garlic'],           description: 'Wet, quiet, biohazard-grade.' },
  { id: 'never-ending',   name: 'Never Ending',   emoji: '♾️', rarity: 'epic',     hidden: true,  ingredients: ['natto', 'cabbage', 'beans'],                      description: 'Slowly running out of breath.' },
  { id: 'machine-gun',    name: 'Machine Gun',    emoji: '🔫', rarity: 'epic',     hidden: true,  ingredients: ['hakarl', 'pickled-egg', 'kimchi'],                description: 'Rapid staccato.' },
  { id: 'symphony',       name: 'Symphony',       emoji: '🎻', rarity: 'epic',     hidden: true,  ingredients: ['asparagus', 'kombucha', 'casu-marzu'],            description: 'Harmonized fart movements.' },
  { id: 'haunted-howl',   name: 'Haunted Howl',   emoji: '👻', rarity: 'epic',     hidden: true,  ingredients: ['lutefisk', 'durian', 'aged-stilton'],             description: 'Spirits of dinners past.' },
  { id: 'royal-finale',   name: 'The Royal Finale', emoji: '👑', rarity: 'epic',  hidden: true,  ingredients: ['kviek-yogurt', 'asparagus', 'aged-stilton'],        description: 'Long, musical, untouchable.' },

  // ====== Hidden legendary recipes (quest-gated for unlock; multi-step) ======
  { id: 'forbidden-blast', name: 'The Forbidden Blast', emoji: '☠️', rarity: 'legendary', hidden: true,
    ingredients: ['forbidden-burrito', 'volcano-chili', 'ghost-pepper'],
    description: 'They wrote songs about this one.',
    legendaryUnlock: { steps: ['Discover ≥10 recipes', 'Own ≥3 legendary foods', 'Win 3 matches in a row'] } },
  { id: 'cosmic-symphony', name: 'Cosmic Symphony', emoji: '🌌', rarity: 'legendary', hidden: true,
    ingredients: ['sky-bean', 'glowing-mushroom', 'kombucha'],
    description: 'Felt as much as heard.',
    legendaryUnlock: { steps: ['Discover ≥15 recipes', 'Win match with Alien Tourists', 'Reach Hard Mode 100%'] } },
  { id: 'grandmas-secret', name: "Grandma's Secret",  emoji: '🍲', rarity: 'legendary', hidden: true,
    ingredients: ['mystery-casserole', 'kviek-yogurt', 'cabbage', 'beans'],
    description: 'Passed down for generations. We never asked.',
    legendaryUnlock: { steps: ['Own all common foods', "Own Aunt Edna's Yak Yogurt", 'Discover ≥5 epic recipes'] } },
  { id: 'cursed-emanation', name: 'Cursed Emanation', emoji: '🪦', rarity: 'legendary', hidden: true,
    ingredients: ['cursed-egg', 'hakarl', 'durian'],
    description: 'Best deployed alone in a sealed room.',
    legendaryUnlock: { steps: ['Win match with Haunted Mansion', 'Discover ≥10 recipes', 'Own ≥2 epic foods'] } },
  { id: 'apocalypse-class', name: 'Apocalypse Class', emoji: '🌪️', rarity: 'legendary', hidden: true,
    ingredients: ['forbidden-burrito', 'mystery-casserole', 'cursed-egg'],
    description: 'Use only in emergencies. Or final exams.',
    legendaryUnlock: { steps: ['Discover ≥20 recipes', 'Own all legendary foods', 'Win match with Silent Monks'] } },
  { id: 'whisper-of-the-void', name: 'Whisper of the Void', emoji: '🕳️', rarity: 'legendary', hidden: true,
    ingredients: ['sky-bean', 'glowing-mushroom', 'lutefisk', 'casu-marzu'],
    description: 'A fart with theological implications.',
    legendaryUnlock: { steps: ['Reach 100% match in Hard Mode', 'Win with Silent Monks AND Volcano Cult', 'Own ≥4 legendary foods'] } },
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
