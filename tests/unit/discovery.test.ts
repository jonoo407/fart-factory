import { describe, it, expect, beforeEach } from 'vitest';
import { discoverFromPlate, recipeProgress } from '../../src/scoring/discovery';
import { loadDiscoveredRecipes, markRecipeDiscovered } from '../../src/state/persistence';
import { RECIPES } from '../../src/state/recipes';

beforeEach(() => {
  localStorage.clear();
});

describe('discoverFromPlate (Phase H item 52 — recipe matching on launch)', () => {
  it('returns null when plate is empty', () => {
    expect(discoverFromPlate([])).toBeNull();
  });

  it('returns null when plate does not match any recipe', () => {
    // Single ingredient never matches a 2+-recipe.
    expect(discoverFromPlate(['beans'])).toBeNull();
  });

  it('returns {recipeId, freshlyDiscovered: true} on first matching launch', () => {
    // Use a known pre-known recipe for predictability.
    const known = RECIPES.find((r) => !r.hidden)!;
    const r = discoverFromPlate(known.ingredients);
    expect(r).not.toBeNull();
    expect(r!.recipeId).toBe(known.id);
    expect(r!.freshlyDiscovered).toBe(true);
    expect(loadDiscoveredRecipes()).toContain(known.id);
  });

  it('returns {freshlyDiscovered: false} when recipe was already known', () => {
    const known = RECIPES.find((r) => !r.hidden)!;
    markRecipeDiscovered(known.id);
    const r = discoverFromPlate(known.ingredients);
    expect(r!.recipeId).toBe(known.id);
    expect(r!.freshlyDiscovered).toBe(false);
  });

  it('order-insensitive: reversed plate still matches', () => {
    const r3 = RECIPES.find((r) => r.ingredients.length === 3);
    if (!r3) return;
    const reversed = [...r3.ingredients].reverse();
    const r = discoverFromPlate(reversed);
    expect(r!.recipeId).toBe(r3.id);
  });
});

describe('recipeProgress (Phase H item 53 — Lab Notebook X/Y counter)', () => {
  it('returns {discovered: 0, total: RECIPES.length} when nothing has been discovered', () => {
    const p = recipeProgress();
    expect(p.discovered).toBe(0);
    expect(p.total).toBe(RECIPES.length);
  });

  it('increments as recipes are discovered', () => {
    markRecipeDiscovered('swamp-beast');
    markRecipeDiscovered('silent-killer');
    expect(recipeProgress().discovered).toBe(2);
  });

  it('discovered count never exceeds total', () => {
    for (const r of RECIPES) markRecipeDiscovered(r.id);
    expect(recipeProgress().discovered).toBeLessThanOrEqual(recipeProgress().total);
    expect(recipeProgress().discovered).toBe(RECIPES.length);
  });
});
