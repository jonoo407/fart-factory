import { describe, it, expect, beforeEach } from 'vitest';
import { rollLootDrop, dropChanceForLaunch } from '../../src/scoring/loot-drops';
import { savePantry, unlockFood, loadPantry } from '../../src/state/persistence';
import { FOODS } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('dropChanceForLaunch (T2.1)', () => {
  it('returns 0 for non-critical tiers', () => {
    expect(dropChanceForLaunch('ok', false)).toBe(0);
    expect(dropChanceForLaunch('great', false)).toBe(0);
    expect(dropChanceForLaunch('bad', false)).toBe(0);
    expect(dropChanceForLaunch('disaster', false)).toBe(0);
  });
  it('returns 30% on PERFECT without a legendary', () => {
    expect(dropChanceForLaunch('perfect', false)).toBe(0.30);
  });
  it('returns 60% on PERFECT with a legendary on plate', () => {
    expect(dropChanceForLaunch('perfect', true)).toBe(0.60);
  });
});

describe('rollLootDrop (T2.1)', () => {
  it('returns null when chance is 0', () => {
    expect(rollLootDrop(0, 12345)).toBeNull();
  });

  it('returns a NOT-YET-UNLOCKED food when the roll succeeds', () => {
    // Save pantry so only common foods are unlocked.
    const commons = FOODS.filter((f) => f.startsUnlocked).map((f) => f.id);
    savePantry(commons);
    // Force chance = 1 (always drops). Result is one of the foods NOT in pantry.
    const drop = rollLootDrop(1, 1);
    expect(drop).not.toBeNull();
    expect(commons).not.toContain(drop!.id);
  });

  it('returns null when ALL foods are already unlocked', () => {
    savePantry(FOODS.map((f) => f.id));
    expect(rollLootDrop(1, 1)).toBeNull();
  });

  it('legendary foods are NOT in the loot pool (quest-only)', () => {
    // Unlock everything except legendaries.
    savePantry(FOODS.filter((f) => f.rarity !== 'legendary').map((f) => f.id));
    // Even with chance=1, no legendary should drop.
    const drop = rollLootDrop(1, 42);
    expect(drop).toBeNull();
  });

  it('drop is added to pantry when rollLootDrop is followed by unlockFood', () => {
    const commons = FOODS.filter((f) => f.startsUnlocked).map((f) => f.id);
    savePantry(commons);
    const drop = rollLootDrop(1, 7);
    expect(drop).not.toBeNull();
    unlockFood(drop!.id);
    expect(loadPantry()).toContain(drop!.id);
  });
});
