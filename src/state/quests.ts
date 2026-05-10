/**
 * Legendary quests — multi-step unlock paths for the 6 legendary foods.
 * Per PLAN.md §D Tier 7 Phase J items 58-60.
 *
 * Quests are evaluated deterministically against the save state — there
 * are no hidden flags or one-shot triggers. As soon as the player meets
 * every step, the Claim button enables in the notebook modal.
 *
 * Per FUN_CRITIC.md Goal Stacking (P16) — quests provide week-long arcs
 * stacked on top of the per-launch loop. Surprise & Delight (P21) when
 * a legendary unlocks (Phase L will add a fanfare animation).
 */

import {
  loadDiscoveredRecipes,
  loadPantry,
  loadBestMatchOverall,
  loadBestHard,
  unlockFood,
} from './persistence';
import { FOODS, getFood } from './food';
import { RECIPES } from './recipes';

export type QuestStepKind =
  | 'discover-recipes'    // current = loadDiscoveredRecipes().length
  | 'unlock-uncommon'     // current = unlocked.filter(rarity=uncommon).length
  | 'unlock-rare'         // current = unlocked.filter(rarity=rare).length
  | 'unlock-epic'         // current = unlocked.filter(rarity=epic).length
  | 'discover-recipes-rare' // discovered recipes whose rarity is rare
  | 'discover-recipes-epic' // discovered recipes whose rarity is epic
  | 'best-overall'        // current = loadBestMatchOverall()
  | 'best-hard';          // current = loadBestHard()

export interface QuestStep {
  kind: QuestStepKind;
  target: number;
  /** Human-readable label shown in the notebook. */
  label: string;
}

export interface Quest {
  foodId: string;
  steps: QuestStep[];
}

export const LEGENDARY_QUESTS: readonly Quest[] = [
  {
    foodId: 'forbidden-burrito',
    steps: [
      { kind: 'discover-recipes', target: 10, label: 'Discover 10 recipes' },
      { kind: 'unlock-epic', target: 3, label: 'Unlock 3 epic foods' },
      { kind: 'best-overall', target: 100, label: 'Score a perfect 100% match' },
    ],
  },
  {
    foodId: 'mystery-casserole',
    steps: [
      { kind: 'unlock-uncommon', target: 6, label: 'Unlock all 6 uncommon foods' },
      { kind: 'discover-recipes', target: 8, label: 'Discover 8 recipes' },
    ],
  },
  {
    foodId: 'glowing-mushroom',
    steps: [
      { kind: 'discover-recipes', target: 15, label: 'Discover 15 recipes' },
      { kind: 'unlock-rare', target: 2, label: 'Unlock 2 rare foods' },
      { kind: 'best-hard', target: 80, label: 'Score ≥80% in Hard Mode' },
    ],
  },
  {
    foodId: 'cursed-egg',
    steps: [
      { kind: 'discover-recipes-rare', target: 3, label: 'Discover 3 rare recipes' },
      { kind: 'best-overall', target: 90, label: 'Score ≥90% match' },
      { kind: 'unlock-epic', target: 2, label: 'Unlock 2 epic foods' },
    ],
  },
  {
    foodId: 'volcano-chili',
    steps: [
      { kind: 'unlock-uncommon', target: 4, label: 'Unlock 4 uncommon foods' },
      { kind: 'unlock-rare', target: 3, label: 'Unlock 3 rare foods' },
      { kind: 'discover-recipes', target: 12, label: 'Discover 12 recipes' },
    ],
  },
  {
    foodId: 'sky-bean',
    steps: [
      { kind: 'discover-recipes', target: 20, label: 'Discover 20 recipes' },
      { kind: 'unlock-rare', target: 3, label: 'Unlock 3 rare foods' },
      { kind: 'best-hard', target: 80, label: 'Score ≥80% in Hard Mode' },
    ],
  },
];

export interface QuestStepProgress {
  kind: QuestStepKind;
  target: number;
  current: number;
  done: boolean;
  label: string;
}

export interface QuestProgress {
  foodId: string;
  steps: QuestStepProgress[];
}

function unlockedByRarity(rarity: 'uncommon' | 'rare' | 'epic'): number {
  const unlocked = new Set(loadPantry());
  return FOODS.filter((f) => f.rarity === rarity && unlocked.has(f.id)).length;
}

function discoveredRecipesByRarity(rarity: 'rare' | 'epic'): number {
  const discovered = new Set(loadDiscoveredRecipes());
  return RECIPES.filter((r) => r.rarity === rarity && discovered.has(r.id)).length;
}

function evalStep(step: QuestStep): QuestStepProgress {
  let current = 0;
  switch (step.kind) {
    case 'discover-recipes':
      current = loadDiscoveredRecipes().length;
      break;
    case 'unlock-uncommon':
      current = unlockedByRarity('uncommon');
      break;
    case 'unlock-rare':
      current = unlockedByRarity('rare');
      break;
    case 'unlock-epic':
      current = unlockedByRarity('epic');
      break;
    case 'discover-recipes-rare':
      current = discoveredRecipesByRarity('rare');
      break;
    case 'discover-recipes-epic':
      current = discoveredRecipesByRarity('epic');
      break;
    case 'best-overall':
      current = loadBestMatchOverall();
      break;
    case 'best-hard':
      current = loadBestHard();
      break;
  }
  return {
    kind: step.kind,
    target: step.target,
    current,
    done: current >= step.target,
    label: step.label,
  };
}

export function questProgress(q: Quest): QuestProgress {
  return {
    foodId: q.foodId,
    steps: q.steps.map(evalStep),
  };
}

export function isQuestComplete(q: Quest): boolean {
  return questProgress(q).steps.every((s) => s.done);
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: 'unknown-food' | 'already-unlocked' | 'incomplete' };

export function attemptClaimLegendary(foodId: string): ClaimResult {
  const food = getFood(foodId);
  if (!food || food.rarity !== 'legendary') return { ok: false, reason: 'unknown-food' };
  if (loadPantry().includes(foodId)) return { ok: false, reason: 'already-unlocked' };
  const quest = LEGENDARY_QUESTS.find((q) => q.foodId === foodId);
  if (!quest || !isQuestComplete(quest)) return { ok: false, reason: 'incomplete' };
  unlockFood(foodId);
  return { ok: true };
}

export function getQuestForFood(foodId: string): Quest | undefined {
  return LEGENDARY_QUESTS.find((q) => q.foodId === foodId);
}
