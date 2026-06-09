import { describe, it, expect, beforeEach } from 'vitest';
import {
  LEGENDARY_QUESTS,
  questProgress,
  isQuestComplete,
  attemptClaimLegendary,
} from '../../src/state/quests';
import {
  markRecipeDiscovered,
  unlockFood,
  loadPantry,
  bumpBestMatch,
  loadBestMatch,
  setBestMatchOverall,
} from '../../src/state/persistence';
import { FOODS } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('LEGENDARY_QUESTS catalog', () => {
  it('has 6 quests, one per legendary food', () => {
    const legendaryFoods = FOODS.filter((f) => f.rarity === 'legendary');
    expect(LEGENDARY_QUESTS).toHaveLength(legendaryFoods.length);
    for (const q of LEGENDARY_QUESTS) {
      const food = FOODS.find((f) => f.id === q.foodId);
      expect(food).toBeDefined();
      expect(food!.rarity).toBe('legendary');
    }
  });

  it('every quest has 2-4 steps', () => {
    for (const q of LEGENDARY_QUESTS) {
      expect(q.steps.length).toBeGreaterThanOrEqual(2);
      expect(q.steps.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('questProgress computes deterministic progress per quest', () => {
  it('all steps are at 0/done=false on a fresh save', () => {
    const q = LEGENDARY_QUESTS[0]!;
    const prog = questProgress(q);
    for (const s of prog.steps) {
      expect(s.done).toBe(false);
    }
  });

  it('discovering recipes advances "discover N recipes" steps', () => {
    // Discover 12 recipes.
    for (let i = 0; i < 12; i++) markRecipeDiscovered(`recipe-${i}`);
    for (const q of LEGENDARY_QUESTS) {
      const prog = questProgress(q);
      for (const s of prog.steps) {
        if (s.kind === 'discover-recipes') {
          expect(s.current).toBe(12);
        }
      }
    }
  });

  it('unlocking rare foods advances "unlock N rare foods" steps', () => {
    // Unlock 2 rares.
    unlockFood('aged-stilton');
    unlockFood('kombucha');
    for (const q of LEGENDARY_QUESTS) {
      const prog = questProgress(q);
      for (const s of prog.steps) {
        if (s.kind === 'unlock-rare') {
          expect(s.current).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('isQuestComplete returns true only when ALL steps are done', () => {
    const q = LEGENDARY_QUESTS[0]!;
    expect(isQuestComplete(q)).toBe(false);
  });
});

describe('attemptClaimLegendary', () => {
  it('refuses to claim when quest is incomplete', () => {
    const q = LEGENDARY_QUESTS[0]!;
    const r = attemptClaimLegendary(q.foodId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('incomplete');
    expect(loadPantry()).not.toContain(q.foodId);
  });

  it('refuses to claim when food is already unlocked', () => {
    const q = LEGENDARY_QUESTS[0]!;
    unlockFood(q.foodId);
    const r = attemptClaimLegendary(q.foodId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('already-unlocked');
  });

  it('refuses unknown food ids', () => {
    const r = attemptClaimLegendary('not-a-quest-food');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown-food');
  });
});

describe('Best-match persistence (foundation for win-condition quest steps)', () => {
  it('bumpBestMatch only ratchets up, never down', () => {
    expect(bumpBestMatch('granny-edna', 60)).toBe(60);
    expect(bumpBestMatch('granny-edna', 50)).toBe(60); // lower → ignored
    expect(bumpBestMatch('granny-edna', 75)).toBe(75);
    expect(loadBestMatch('granny-edna')).toBe(75);
  });

  it('setBestMatchOverall round-trips', () => {
    setBestMatchOverall(95);
    // Re-read via questProgress for any "score 90+" step (if a quest has one).
    for (const q of LEGENDARY_QUESTS) {
      const prog = questProgress(q);
      for (const s of prog.steps) {
        if (s.kind === 'best-overall' && s.target <= 95) {
          expect(s.done).toBe(true);
        }
      }
    }
  });
});
