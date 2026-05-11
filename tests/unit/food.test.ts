import { describe, it, expect } from 'vitest';
import {
  FOODS,
  type Rarity,
  getFood,
  foodsByRarity,
} from '../../src/state/food';

describe('FOODS catalog', () => {
  it('contains at least 30 foods', () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(30);
  });

  it('every food has unique id', () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every food has all required fields', () => {
    for (const f of FOODS) {
      expect(typeof f.id).toBe('string');
      expect(f.id.length).toBeGreaterThan(0);
      expect(typeof f.name).toBe('string');
      expect(typeof f.emoji).toBe('string');
      expect(['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[]).toContain(f.rarity);
      expect(typeof f.bellyCost).toBe('number');
      expect(f.bellyCost).toBeGreaterThanOrEqual(1);
      expect(f.bellyCost).toBeLessThanOrEqual(8);
      expect(f.properties).toBeDefined();
      const p = f.properties;
      for (const axis of ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'] as const) {
        expect(typeof p[axis]).toBe('number');
        expect(p[axis]).toBeGreaterThanOrEqual(0);
        expect(p[axis]).toBeLessThanOrEqual(5);
      }
    }
  });

  it('has at least 6 foods per rarity tier', () => {
    const tiers: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const t of tiers) {
      const matching = FOODS.filter((f) => f.rarity === t);
      expect(matching.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('common foods are unlocked by default; higher tiers are not', () => {
    for (const f of FOODS) {
      if (f.rarity === 'common') {
        expect(f.startsUnlocked).toBe(true);
      } else {
        expect(f.startsUnlocked).toBeFalsy();
      }
    }
  });

  it('no single food alone can produce a maxed fart (sum of properties bounded)', () => {
    for (const f of FOODS) {
      const sum = Object.values(f.properties).reduce((a: number, b: number) => a + b, 0);
      // Per PLAN.md §D.A.26 — "sum of properties is bounded so no food dominates alone."
      // Each axis 0-5; 7 axes; max 35; cap individual food at sum ≤ 22 so combinations matter.
      expect(sum).toBeLessThanOrEqual(22);
    }
  });
});

describe('getFood / foodsByRarity', () => {
  it('getFood(id) returns the food with that id', () => {
    const beans = getFood('beans');
    expect(beans).toBeDefined();
    expect(beans?.name).toMatch(/[Bb]ean/);
  });

  it('getFood(unknown) returns undefined', () => {
    expect(getFood('not-a-food')).toBeUndefined();
  });

  it('foodsByRarity returns sorted-by-rarity arrays', () => {
    const grouped = foodsByRarity();
    expect(grouped.common.length).toBeGreaterThanOrEqual(6);
    expect(grouped.legendary.length).toBeGreaterThanOrEqual(6);
    for (const f of grouped.common) {
      expect(f.rarity).toBe('common');
    }
    for (const f of grouped.legendary) {
      expect(f.rarity).toBe('legendary');
    }
  });
});
