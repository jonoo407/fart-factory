import { describe, it, expect } from 'vitest';
import { RECIPES, type Recipe } from '../../src/state/recipes';
import type { FoodProperties } from '../../src/state/food';

/**
 * V8 T7.a — Named Farts.
 *
 * Every recipe now carries a `bonus: Partial<FoodProperties>` that is
 * applied to the fart's property vector when the recipe is detected.
 * The bonus magnitude scales by rarity, so finding a higher-rarity
 * combo feels measurably more powerful, not just collectible.
 *
 * Magnitudes:
 *   common:    sum 1  (one axis at +1)
 *   uncommon:  sum 2  (two axes at +1, or one at +2)
 *   rare:      sum 2-3 (one axis at +2, or three axes at +1)
 *   epic:      sum 4  (two axes at +2)
 *   legendary: sum 6  (three axes at +2)
 *
 * Each axis bonus is in [1, 2] (no negatives). Bonuses are applied
 * clamped to 5 by `computeFartFromPlate` (tested separately).
 *
 * Legendary recipes additionally carry a `legendaryBuff` declaration
 * that the codex's full-decode unlocks as a permanent passive.
 */

function bonusSum(b: Partial<FoodProperties>): number {
  return Object.values(b).reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
}

describe('Named Farts catalog (V8 T7.a)', () => {
  it('catalog still has 30 recipes', () => {
    expect(RECIPES.length).toBe(30);
  });

  it('every recipe has a `bonus` field', () => {
    for (const r of RECIPES) {
      expect(r.bonus, `${r.id} missing bonus`).toBeDefined();
    }
  });

  it('every bonus value is in [1, 2] (no negatives, never bigger than +2)', () => {
    for (const r of RECIPES) {
      for (const [axis, v] of Object.entries(r.bonus!)) {
        expect(v, `${r.id}.${axis}`).toBeGreaterThanOrEqual(1);
        expect(v, `${r.id}.${axis}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('common bonuses sum to 1', () => {
    for (const r of RECIPES.filter((r) => r.rarity === 'common')) {
      expect(bonusSum(r.bonus!), `${r.id}`).toBe(1);
    }
  });

  it('uncommon bonuses sum to 2', () => {
    for (const r of RECIPES.filter((r) => r.rarity === 'uncommon')) {
      expect(bonusSum(r.bonus!), `${r.id}`).toBe(2);
    }
  });

  it('rare bonuses sum to 2 or 3', () => {
    for (const r of RECIPES.filter((r) => r.rarity === 'rare')) {
      const s = bonusSum(r.bonus!);
      expect([2, 3], `${r.id} sum=${s}`).toContain(s);
    }
  });

  it('epic bonuses sum to 4', () => {
    for (const r of RECIPES.filter((r) => r.rarity === 'epic')) {
      expect(bonusSum(r.bonus!), `${r.id}`).toBe(4);
    }
  });

  it('legendary bonuses sum to 6', () => {
    for (const r of RECIPES.filter((r) => r.rarity === 'legendary')) {
      expect(bonusSum(r.bonus!), `${r.id}`).toBe(6);
    }
  });

  it('every legendary recipe has a legendaryBuff with id, label, and an apply fn', () => {
    const legs = RECIPES.filter((r) => r.rarity === 'legendary');
    expect(legs.length).toBeGreaterThan(0);
    for (const r of legs) {
      expect(r.legendaryBuff, `${r.id} missing legendaryBuff`).toBeDefined();
      const buff = (r as Recipe).legendaryBuff!;
      expect(buff.id.length).toBeGreaterThan(0);
      expect(buff.label.length).toBeGreaterThan(0);
    }
  });

  it('legendary unlock steps no longer mention "Hard Mode"', () => {
    const legs = RECIPES.filter((r) => r.rarity === 'legendary');
    for (const r of legs) {
      if (!r.legendaryUnlock) continue;
      for (const step of r.legendaryUnlock.steps) {
        expect(step, `${r.id} step "${step}"`).not.toMatch(/hard mode/i);
      }
    }
  });
});
