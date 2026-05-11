/**
 * Region-recipe progress hints. Per PLAN_v4.md §B.S item 89.
 *
 * For each region, we count discovered recipes. If the count is 0, we
 * return a "regional specialty awaits" hint string for the UI to surface
 * in the map tooltip OR the notebook.
 *
 * For now (until per-region recipes are tagged in the catalog), all
 * discovered recipes credit to "hometown" since recipes don't yet
 * carry a region field. The infrastructure is here so adding the
 * tagging later is a one-line change.
 */

import { loadDiscoveredRecipes } from '../state/persistence';
import { RECIPES } from '../state/recipes';
import type { Region } from '../state/containment';

/**
 * Until recipes carry a `region` field, we credit each discovered recipe
 * to Hometown (the starter region). Future-tagged recipes will use their
 * declared region.
 */
function regionOfRecipe(_recipeId: string): Region {
  // TODO: when recipes get region tags, return r.region.
  return 'hometown';
}

export function discoveredRecipesByRegion(region: Region): number {
  const discovered = loadDiscoveredRecipes();
  let count = 0;
  for (const id of discovered) {
    if (regionOfRecipe(id) === region) count++;
  }
  return count;
}

const HINTS: Record<Region, string> = {
  hometown:   "There's a homely specialty undiscovered here. Try simple combinations.",
  city:       "An urban concoction awaits discovery in the City.",
  wilderness: "A wild specialty grows here. Combine outdoors-flavored foods.",
  royal:      "A refined recipe undiscovered. The Court has its preferences.",
  cosmic:     "Something otherworldly exists here. Reach beyond convention.",
};

export function getRegionalRecipeHint(region: Region): string | null {
  if (discoveredRecipesByRegion(region) > 0) return null;
  return HINTS[region];
}

// Re-export RECIPES so tests can import a single module for region-recipe utilities.
export { RECIPES };
