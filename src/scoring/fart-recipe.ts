/**
 * Fart-property computation from a plate of foods. Per PLAN.md §D Phase D
 * items 38-41 + FUN_CRITIC.md P23 (Cook/Knizia/Persson on combination
 * systems): combinations are meaningful only when (a) ≥30% of pairs
 * produce non-additive results, (b) some recipes are discovered not
 * displayed, (c) wrong combinations have a cost.
 *
 * Pure functions — no DOM, no localStorage. UI integrates via Phase E.
 */

import type { FoodProperties } from '../state/food';
import { getFood } from '../state/food';

const ZERO: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };

const AXES = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'] as const;
type Axis = (typeof AXES)[number];

function addProps(a: FoodProperties, b: FoodProperties): FoodProperties {
  return {
    wet: a.wet + b.wet,
    dry: a.dry + b.dry,
    stink: a.stink + b.stink,
    loud: a.loud + b.loud,
    musical: a.musical + b.musical,
    length: a.length + b.length,
    temp: a.temp + b.temp,
  };
}

function mulProps(p: FoodProperties, axis: Axis, factor: number): FoodProperties {
  return { ...p, [axis]: Math.max(0, p[axis] * factor) };
}

function bumpProp(p: FoodProperties, axis: Axis, delta: number): FoodProperties {
  return { ...p, [axis]: Math.max(0, p[axis] + delta) };
}

// ----- Synergies -----
// Per P23: ≥30% of pairs in catalog produce non-additive results. We
// enumerate named pairs/triples + flag whether they apply to current plate.

export interface Synergy {
  /** Named effect, e.g. "Swamp Beast pattern" — shown if a recipe match also fires. */
  name: string;
  ingredients: string[]; // foodIds; all must be present
  apply: (props: FoodProperties) => FoodProperties;
}

export const SYNERGIES: readonly Synergy[] = [
  { name: 'Beans+Dairy (Swamp)',         ingredients: ['beans', 'cheese'],
    apply: (p) => bumpProp(bumpProp(p, 'stink', 2), 'wet', 2) },
  { name: 'Beans+Garlic (Volcanic floor)',ingredients: ['beans', 'garlic'],
    apply: (p) => bumpProp(bumpProp(p, 'stink', 2), 'temp', 1) },
  { name: 'Garlic+Onion (Triple alpha)',  ingredients: ['garlic', 'onion'],
    apply: (p) => bumpProp(p, 'stink', 2) },
  { name: 'Cabbage+Cheese (Slow burn)',   ingredients: ['cabbage', 'cheese'],
    apply: (p) => bumpProp(bumpProp(p, 'length', 1), 'stink', 1) },
  { name: 'Kimchi+Cabbage (Fermented)',   ingredients: ['kimchi', 'cabbage'],
    apply: (p) => bumpProp(bumpProp(p, 'stink', 3), 'loud', 1) },
  { name: 'Hot Pepper+Beans (Spicy rumble)', ingredients: ['hot-pepper', 'beans'],
    apply: (p) => bumpProp(bumpProp(p, 'loud', 2), 'temp', 2) },
  { name: 'Sardines+Pickle (Salt of earth)', ingredients: ['sardines', 'pickle'],
    apply: (p) => bumpProp(bumpProp(p, 'wet', 2), 'stink', 2) },
  { name: 'Asparagus+Cheese (Symphony)',  ingredients: ['asparagus', 'cheese'],
    apply: (p) => bumpProp(p, 'musical', 2) },
  { name: 'Ghost Pepper+Beans (Thunder)', ingredients: ['ghost-pepper', 'beans'],
    apply: (p) => bumpProp(bumpProp(p, 'loud', 3), 'temp', 2) },
  { name: 'Aged Stilton+Asparagus (Aristocrat)', ingredients: ['aged-stilton', 'asparagus'],
    apply: (p) => bumpProp(bumpProp(p, 'musical', 2), 'dry', 1) },
  { name: 'Triple Greens',                 ingredients: ['broccoli', 'cabbage', 'onion'],
    apply: (p) => bumpProp(bumpProp(p, 'stink', 3), 'length', 1) },
  { name: 'Sky Bean + Glow (Cosmic)',      ingredients: ['sky-bean', 'glowing-mushroom'],
    apply: (p) => bumpProp(bumpProp(p, 'musical', 3), 'length', 2) },
];

// ----- Conflicts (penalties for "wrong" combinations) -----

export interface Conflict {
  name: string;
  ingredients: string[];
  apply: (props: FoodProperties) => FoodProperties;
}

export const CONFLICTS: readonly Conflict[] = [
  // Asparagus + Hot Pepper: heat cancels musicality
  { name: 'Asparagus×Hot Pepper (mute)',  ingredients: ['asparagus', 'hot-pepper'],
    apply: (p) => mulProps(p, 'musical', 0) },
  // Ice / cold (kombucha) + hot pepper: temperature canceling
  { name: 'Kombucha×Hot Pepper (cool)',   ingredients: ['kombucha', 'hot-pepper'],
    apply: (p) => mulProps(p, 'temp', 0.5) },
  // Sardines + cabbage: muddy clash
  { name: 'Sardines×Cabbage (muddy)',     ingredients: ['sardines', 'cabbage'],
    apply: (p) => bumpProp(p, 'wet', -2) },
  // Cursed egg + cheese: ancient flavors fight modern
  { name: 'Cursed Egg×Cheese (clash)',    ingredients: ['cursed-egg', 'cheese'],
    apply: (p) => bumpProp(p, 'musical', -2) },
  // Pickle + Volcano Chili: vinegar douses fire
  { name: 'Pickle×Volcano (douse)',       ingredients: ['pickle', 'volcano-chili'],
    apply: (p) => mulProps(p, 'temp', 0.4) },
];

function ingredientsPresent(needed: string[], plate: string[]): boolean {
  const plateSet = new Set(plate);
  return needed.every((id) => plateSet.has(id));
}

/**
 * Computes the fart properties for a plate of food ids.
 * Sums the foods' raw properties, then applies any active synergies
 * and conflicts. Returns both the final properties and a list of
 * triggered effects (for UI feedback).
 */
export interface RecipeResult {
  props: FoodProperties;
  triggeredSynergies: string[];
  triggeredConflicts: string[];
}

export function computeFartFromPlate(ingredientIds: string[]): RecipeResult {
  if (ingredientIds.length === 0) {
    return { props: { ...ZERO }, triggeredSynergies: [], triggeredConflicts: [] };
  }
  let props = { ...ZERO };
  for (const id of ingredientIds) {
    const food = getFood(id);
    if (!food) continue;
    props = addProps(props, food.properties);
  }
  const triggeredSynergies: string[] = [];
  for (const s of SYNERGIES) {
    if (ingredientsPresent(s.ingredients, ingredientIds)) {
      props = s.apply(props);
      triggeredSynergies.push(s.name);
    }
  }
  const triggeredConflicts: string[] = [];
  for (const c of CONFLICTS) {
    if (ingredientsPresent(c.ingredients, ingredientIds)) {
      props = c.apply(props);
      triggeredConflicts.push(c.name);
    }
  }
  return { props, triggeredSynergies, triggeredConflicts };
}
