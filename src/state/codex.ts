/**
 * V8 T7.c — Legendary Fart Codex.
 *
 * Legendary recipes keep their ingredient list sealed even after the
 * quest gates open. Players probe each slot by spending a small currency
 * (gold + research notes) and a food from their pantry — a correct guess
 * reveals the slot permanently, a wrong one returns a hint and remembers
 * the failed guess so future attempts can grey it out.
 *
 * Full decode of all slots → the recipe's `legendaryBuff` becomes a
 * permanent passive (applied in plate.ts via applyCodexBuffs).
 */

import { RECIPES, type Recipe } from './recipes';
import { getFood, type FoodProperties } from './food';
import {
  loadGold, setGold,
  loadResearchNotes, setResearchNotes,
  loadPantry,
} from './persistence';
import { loadDiscoveredAxes, type AxisName } from './axis-discovery';

const KEY = 'fart_legendary_codex';

export const TEST_GOLD_COST = 5;
export const TEST_NOTES_COST = 1;

export interface CodexSlotState {
  /** Food id that was confirmed at this slot, or null if still hidden. */
  revealed: string | null;
  /** Foods that have been tested at this slot and missed (greyed out). */
  tested: string[];
}

export interface CodexEntryState {
  /** Map slotIdx → foodId once revealed. */
  revealed: Record<number, string>;
  /** Map slotIdx → array of food ids that missed at that slot. */
  tested: Record<number, string[]>;
  /** True once every slot is revealed. */
  fullyUnlocked: boolean;
  /** True once the legendary buff has been claimed (anti-double-grant). */
  buffClaimed: boolean;
}

export type LegendaryCodexState = Record<string, CodexEntryState>;

export type CodexRefusal = 'insufficient-gold' | 'insufficient-notes' | 'not-in-pantry' | 'not-legendary' | 'slot-out-of-range';

export interface CodexTestResult {
  hit: boolean;
  /** Short text shown to the player on a miss. */
  hint?: string;
  /** If set, the test was refused with this reason; nothing was spent. */
  refused?: CodexRefusal;
  /** True if this test completed the decode and unlocked the passive buff. */
  unlockedBuff?: boolean;
}

// ----- Persistence -----

function emptyEntry(): CodexEntryState {
  return { revealed: {}, tested: {}, fullyUnlocked: false, buffClaimed: false };
}

export function loadCodex(): LegendaryCodexState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as LegendaryCodexState;
  } catch {
    return {};
  }
}

function saveCodex(state: LegendaryCodexState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getEntry(state: LegendaryCodexState, recipeId: string): CodexEntryState {
  if (!state[recipeId]) state[recipeId] = emptyEntry();
  return state[recipeId];
}

export function loadCodexSlot(recipeId: string, slotIdx: number): CodexSlotState {
  const entry = loadCodex()[recipeId];
  if (!entry) return { revealed: null, tested: [] };
  const revealed = entry.revealed[slotIdx] ?? null;
  const tested = entry.tested[slotIdx] ?? [];
  return { revealed, tested };
}

export function isFullyDecoded(recipeId: string): boolean {
  const entry = loadCodex()[recipeId];
  return entry?.fullyUnlocked === true;
}

// ----- Hint engine -----

const AXIS_LABEL: Record<AxisName, string> = {
  wet: 'wet', dry: 'dry', stink: 'stinky', loud: 'loud',
  musical: 'musical', length: 'long', temp: 'hot',
};

/** Return the food's highest property axis that the player has already discovered. */
function dominantDiscoveredAxis(foodId: string, discovered: AxisName[]): AxisName | null {
  const food = getFood(foodId);
  if (!food) return null;
  const set = new Set(discovered);
  let best: AxisName | null = null;
  let bestVal = -1;
  for (const a of Object.keys(food.properties) as (keyof FoodProperties)[]) {
    if (!set.has(a)) continue;
    if (food.properties[a] > bestVal) {
      bestVal = food.properties[a];
      best = a;
    }
  }
  return best;
}

function hintForMiss(actualFoodAtSlot: string, slotIdx: number): string {
  const discovered = loadDiscoveredAxes();
  const axis = dominantDiscoveredAxis(actualFoodAtSlot, discovered);
  const slotLabel = slotIdx + 1;
  if (axis) {
    return `Not in this recipe. But something **${AXIS_LABEL[axis]}** would fit slot ${slotLabel}.`;
  }
  // Player hasn't discovered enough axes to give a specific hint.
  return `Not in this recipe. Slot ${slotLabel} expects something you haven't quite figured out yet.`;
}

// ----- Probe -----

export function testCodexSlot(
  recipeId: string,
  slotIdx: number,
  foodId: string,
): CodexTestResult {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe || recipe.rarity !== 'legendary') {
    return { hit: false, refused: 'not-legendary' };
  }
  if (slotIdx < 0 || slotIdx >= recipe.ingredients.length) {
    return { hit: false, refused: 'slot-out-of-range' };
  }
  // If the slot is already revealed, treat the test as a no-op hit (no charge).
  const state = loadCodex();
  const entry = getEntry(state, recipeId);
  if (entry.revealed[slotIdx]) {
    return { hit: entry.revealed[slotIdx] === foodId };
  }
  if (!loadPantry().includes(foodId)) {
    return { hit: false, refused: 'not-in-pantry' };
  }
  if (loadGold() < TEST_GOLD_COST) {
    return { hit: false, refused: 'insufficient-gold' };
  }
  if (loadResearchNotes() < TEST_NOTES_COST) {
    return { hit: false, refused: 'insufficient-notes' };
  }
  // Spend currency BEFORE checking hit/miss — gold/notes are consumed
  // regardless of outcome (the spec's "ingredient consumed regardless"
  // intent, adapted to the flag-based pantry).
  setGold(loadGold() - TEST_GOLD_COST);
  setResearchNotes(loadResearchNotes() - TEST_NOTES_COST);

  const expected = recipe.ingredients[slotIdx]!;
  if (foodId === expected) {
    entry.revealed[slotIdx] = foodId;
    // Check for full decode.
    const allRevealed = recipe.ingredients.every((_, i) => entry.revealed[i]);
    let unlockedBuff = false;
    if (allRevealed && !entry.fullyUnlocked) {
      entry.fullyUnlocked = true;
      unlockedBuff = true;
    }
    saveCodex(state);
    return { hit: true, unlockedBuff };
  }
  // Miss: record the test, return a hint.
  const list = entry.tested[slotIdx] ?? [];
  if (!list.includes(foodId)) list.push(foodId);
  entry.tested[slotIdx] = list;
  saveCodex(state);
  return { hit: false, hint: hintForMiss(expected, slotIdx) };
}

// ----- Passive buff utilities (T7.d wires these into onStoryLaunch) -----

export function unlockedLegendaryBuffs(): Recipe[] {
  const state = loadCodex();
  return RECIPES.filter((r) => r.rarity === 'legendary' && state[r.id]?.fullyUnlocked === true);
}

export function hasUnlockedBuff(buffId: string): boolean {
  return unlockedLegendaryBuffs().some((r) => r.legendaryBuff?.id === buffId);
}
