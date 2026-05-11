/**
 * Recipe discovery — runs at launch time. Per PLAN.md §D Tier 7 Phase H
 * item 52.
 *
 * When the plate happens to match a known recipe (set-equality), we mark
 * it discovered. The first time this happens for a given recipe, the
 * `freshlyDiscovered` flag tells the UI to surface a "✨ Recipe discovered:
 * NAME!" toast. Repeats just return `freshlyDiscovered: false`.
 *
 * Per FUN_CRITIC.md P31 (Curiosity Gaps) — the recipe catalog IS the
 * gap. Each discovered card fills a slot in the player's mental
 * lab-notebook, giving the long-arc "find them all" goal stacking.
 */

import { matchRecipe, RECIPES } from '../state/recipes';
import { markRecipeDiscovered, loadDiscoveredRecipes } from '../state/persistence';

export interface DiscoveryResult {
  recipeId: string;
  freshlyDiscovered: boolean;
}

export function discoverFromPlate(ingredientIds: string[]): DiscoveryResult | null {
  const id = matchRecipe(ingredientIds);
  if (!id) return null;
  const { added } = markRecipeDiscovered(id);
  return { recipeId: id, freshlyDiscovered: added };
}

export interface RecipeProgress {
  discovered: number;
  total: number;
}

export function recipeProgress(): RecipeProgress {
  return {
    discovered: loadDiscoveredRecipes().length,
    total: RECIPES.length,
  };
}
