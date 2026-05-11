import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFoodMastery,
  recordFoodUse,
  masteryLevel,
  masteryLabel,
  masteryBonusForFood,
} from '../../src/scoring/food-mastery';
import { getFood } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('Food mastery counter (T2.3)', () => {
  it('starts at 0 for any food', () => {
    expect(loadFoodMastery('beans')).toBe(0);
  });

  it('recordFoodUse increments + persists', () => {
    recordFoodUse('beans');
    recordFoodUse('beans');
    expect(loadFoodMastery('beans')).toBe(2);
    expect(loadFoodMastery('cheese')).toBe(0);
  });

  it('recordFoodUse can be called with an array of ids', () => {
    recordFoodUse(['beans', 'cheese', 'beans']);
    expect(loadFoodMastery('beans')).toBe(2);
    expect(loadFoodMastery('cheese')).toBe(1);
  });
});

describe('Mastery levels', () => {
  it('thresholds: Novice<10, Apprentice 10-24, Adept 25-49, Master 50-99, Legendary 100+', () => {
    expect(masteryLevel(0)).toBe('novice');
    expect(masteryLevel(9)).toBe('novice');
    expect(masteryLevel(10)).toBe('apprentice');
    expect(masteryLevel(24)).toBe('apprentice');
    expect(masteryLevel(25)).toBe('adept');
    expect(masteryLevel(49)).toBe('adept');
    expect(masteryLevel(50)).toBe('master');
    expect(masteryLevel(99)).toBe('master');
    expect(masteryLevel(100)).toBe('legendary');
  });

  it('masteryLabel returns human-readable label', () => {
    expect(masteryLabel('novice')).toMatch(/Novice/);
    expect(masteryLabel('master')).toMatch(/Master/);
    expect(masteryLabel('legendary')).toMatch(/Legend|Legendary/);
  });
});

describe('Mastery bonus', () => {
  it('returns no bonus below Master', () => {
    const bonus = masteryBonusForFood('beans', 'apprentice');
    expect(Object.values(bonus).every((v) => v === 0)).toBe(true);
  });

  it('Master and above adds +1 to the food\'s highest property axis', () => {
    // Beans properties: wet=3, dry=0, stink=3, loud=2, musical=0, length=3, temp=1
    // Highest is tied between wet/stink/length=3. The function picks
    // deterministically (first one in axis order).
    const bonus = masteryBonusForFood('beans', 'master');
    const sum = Object.values(bonus).reduce((s, v) => s + (v as number), 0);
    expect(sum).toBe(1);
  });

  it('Legendary mastery returns same +1 bonus (no further escalation for v7)', () => {
    const bonus = masteryBonusForFood('beans', 'legendary');
    const sum = Object.values(bonus).reduce((s, v) => s + (v as number), 0);
    expect(sum).toBe(1);
  });

  it('returns zero bonus for unknown food id', () => {
    const bonus = masteryBonusForFood('not-a-food', 'master');
    void getFood;
    expect(Object.values(bonus).every((v) => v === 0)).toBe(true);
  });
});
