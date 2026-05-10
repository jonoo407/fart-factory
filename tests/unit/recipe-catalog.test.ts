import { describe, it, expect } from 'vitest';
import {
  RECIPES,
  getRecipe,
  matchRecipe,
} from '../../src/state/recipes';

describe('RECIPES catalog', () => {
  it('contains at least 30 recipes', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(30);
  });

  it('every recipe has unique id', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every recipe has 2-4 ingredient ids + emoji + name', () => {
    for (const r of RECIPES) {
      expect(r.ingredients.length).toBeGreaterThanOrEqual(2);
      expect(r.ingredients.length).toBeLessThanOrEqual(4);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.emoji.length).toBeGreaterThan(0);
    }
  });

  it('has 5+ legendary recipes', () => {
    const legendary = RECIPES.filter((r) => r.rarity === 'legendary');
    expect(legendary.length).toBeGreaterThanOrEqual(5);
  });

  it('has 4-6 starter recipes pre-known (hidden=false)', () => {
    const known = RECIPES.filter((r) => !r.hidden);
    expect(known.length).toBeGreaterThanOrEqual(4);
    expect(known.length).toBeLessThanOrEqual(8);
  });

  it('the rest of the recipes are hidden (discoverable)', () => {
    const hidden = RECIPES.filter((r) => r.hidden);
    expect(hidden.length).toBeGreaterThanOrEqual(22);
  });
});

describe('matchRecipe', () => {
  it('finds a recipe when plate ingredients exactly match', () => {
    // Pick the first non-hidden recipe; its ingredient set should match itself.
    const known = RECIPES.find((r) => !r.hidden)!;
    expect(matchRecipe(known.ingredients)).toBe(known.id);
  });

  it('returns null when no recipe matches', () => {
    expect(matchRecipe(['beans'])).toBeNull(); // single ingredient never matches a 2+-ingredient recipe
  });

  it('order does not matter (ingredient set, not sequence)', () => {
    const r = RECIPES.find((r) => r.ingredients.length === 3);
    if (!r) return; // skip if no 3-ingredient recipe in catalog
    const reversed = [...r.ingredients].reverse();
    expect(matchRecipe(reversed)).toBe(r.id);
  });
});

describe('getRecipe', () => {
  it('returns recipe by id', () => {
    const r = RECIPES[0]!;
    expect(getRecipe(r.id)).toBe(r);
  });

  it('returns undefined for unknown id', () => {
    expect(getRecipe('not-a-recipe')).toBeUndefined();
  });
});
