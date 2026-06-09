import { describe, it, expect, beforeEach } from 'vitest';
import { loadPantry, savePantry, reconcileStarterFoods } from '../../src/state/persistence';
import { FOODS } from '../../src/state/food';

const STARTERS = FOODS.filter((f) => f.startsUnlocked).map((f) => f.id);

beforeEach(() => localStorage.clear());

describe('reconcileStarterFoods', () => {
  it('adds a starter food missing from an existing save', () => {
    // an old save that predates a newly-added basic food
    savePantry(['beans', 'cheese']);
    reconcileStarterFoods();
    const pantry = loadPantry();
    for (const id of STARTERS) expect(pantry).toContain(id);
    // keeps the foods that were already there
    expect(pantry).toContain('beans');
  });

  it('keeps non-starter (unlocked) foods that are already in the save', () => {
    savePantry(['beans', 'kimchi']); // kimchi is unlocked-but-not-a-starter
    reconcileStarterFoods();
    expect(loadPantry()).toContain('kimchi');
  });

  it('is a no-op when every starter is already present (does not duplicate)', () => {
    savePantry([...STARTERS]);
    reconcileStarterFoods();
    const pantry = loadPantry();
    expect(pantry.length).toBe(STARTERS.length);
    expect(new Set(pantry).size).toBe(pantry.length);
  });

  it('the new basic garnish foods are starters', () => {
    expect(STARTERS).toContain('crumb');
    expect(STARTERS).toContain('zap-pea');
  });
});
