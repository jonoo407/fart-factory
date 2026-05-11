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

  it('returns null once the player has discovered ≥1 recipe in the region', () => {
    // Pick the first non-hidden recipe in any region (Hometown audiences
    // use the global pool, so this is the simplest path).
    const r = RECIPES.find((x) => !x.hidden)!;
    markRecipeDiscovered(r.id);
    // Hometown hint should now be null because we've discovered a recipe
    // (region-recipes treats discovery in Hometown as covering Hometown).
    const hint = getRegionalRecipeHint('hometown');
    expect(hint).toBeNull();
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

  it('counts discovered recipes (basic — credits to Hometown for now)', () => {
    markRecipeDiscovered('swamp-beast');
    expect(discoveredRecipesByRegion('hometown')).toBeGreaterThanOrEqual(1);
  });
});
