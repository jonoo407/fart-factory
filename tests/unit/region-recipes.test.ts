import { describe, it, expect, beforeEach } from 'vitest';
import { getRegionalRecipeHint, discoveredRecipesByRegion } from '../../src/scoring/region-recipes';
import { markRecipeDiscovered } from '../../src/state/persistence';
import { RECIPES } from '../../src/state/recipes';

beforeEach(() => {
  localStorage.clear();
});

describe('getRegionalRecipeHint (Phase S item 89)', () => {
  it('returns a hint when player has discovered 0 recipes in the region', () => {
    const hint = getRegionalRecipeHint('hometown');
    expect(hint).toBeTruthy();
    expect(hint).toMatch(/specialty|undiscovered|here/i);
  });

  it('returns null once the player has discovered ≥1 recipe in the region (P11)', () => {
    // Discover a Hometown-tagged recipe.
    markRecipeDiscovered('swamp-beast');
    expect(getRegionalRecipeHint('hometown')).toBeNull();
    // But other regions still have hints.
    expect(getRegionalRecipeHint('royal')).toBeTruthy();
  });

  it('returns a hint per region (each region has its own hint state)', () => {
    expect(getRegionalRecipeHint('cosmic')).toBeTruthy();
    expect(getRegionalRecipeHint('royal')).toBeTruthy();
    expect(getRegionalRecipeHint('wilderness')).toBeTruthy();
  });
});

describe('discoveredRecipesByRegion (count tracker)', () => {
  it('starts at 0 for every region', () => {
    for (const r of ['hometown', 'city', 'wilderness', 'royal', 'cosmic'] as const) {
      expect(discoveredRecipesByRegion(r)).toBe(0);
    }
  });

  it('counts discovered recipes against their declared region (P11)', () => {
    markRecipeDiscovered('swamp-beast');         // hometown
    markRecipeDiscovered('asparagus-symphony'); // royal
    markRecipeDiscovered('aristocrat');          // royal
    expect(discoveredRecipesByRegion('hometown')).toBe(1);
    expect(discoveredRecipesByRegion('royal')).toBe(2);
    expect(discoveredRecipesByRegion('cosmic')).toBe(0);
  });
});

describe('Recipe.region tagging (P11)', () => {
  it('every non-legendary recipe carries a region tag', () => {
    const untagged = RECIPES.filter((r) => r.rarity !== 'legendary' && !r.region);
    expect(untagged).toEqual([]);
  });

  it('legendary recipes are intentionally region-less (cross-region)', () => {
    const legendaries = RECIPES.filter((r) => r.rarity === 'legendary');
    for (const r of legendaries) {
      expect(r.region).toBeUndefined();
    }
  });

  it('every region has at least one tagged recipe', () => {
    for (const region of ['hometown', 'city', 'wilderness', 'royal', 'cosmic'] as const) {
      const count = RECIPES.filter((r) => r.region === region).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});
