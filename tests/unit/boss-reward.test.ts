import { describe, it, expect, beforeEach } from 'vitest';
import { dispatchBossReward } from '../../src/scoring/boss-reward';
import { BOSSES } from '../../src/state/bosses';
import {
  loadBossesDefeated,
  loadGamePlusUnlocked,
} from '../../src/state/boss-progress';
import { loadPantry, loadGold, loadResearchNotes } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('dispatchBossReward (Phase N item 74)', () => {
  it('first win unlocks the legendary food reward', () => {
    const boss = BOSSES.find((b) => b.id === 'granny-family-reunion')!;
    expect(loadPantry()).not.toContain(boss.rewardFoodId);
    const result = dispatchBossReward(boss);
    expect(result.firstWin).toBe(true);
    expect(loadPantry()).toContain(boss.rewardFoodId);
  });

  it('first win records the boss as defeated', () => {
    const boss = BOSSES[0]!;
    dispatchBossReward(boss);
    expect(loadBossesDefeated()).toContain(boss.id);
  });

  it('subsequent wins grant gold + notes but no food re-unlock', () => {
    const boss = BOSSES[0]!;
    dispatchBossReward(boss); // first win → unlocks food
    const goldBefore = loadGold();
    const notesBefore = loadResearchNotes();
    const result = dispatchBossReward(boss);
    expect(result.firstWin).toBe(false);
    expect(loadGold()).toBeGreaterThan(goldBefore);
    expect(loadResearchNotes()).toBeGreaterThan(notesBefore);
    // Food remains unlocked (already in pantry, idempotent).
    expect(loadPantry()).toContain(boss.rewardFoodId);
  });

  it('Boss 5 first win flips the GamePlus flag', () => {
    expect(loadGamePlusUnlocked()).toBe(false);
    const finalBoss = BOSSES.find((b) => b.id === 'cosmic-council-judgment')!;
    dispatchBossReward(finalBoss);
    expect(loadGamePlusUnlocked()).toBe(true);
  });

  it('non-Boss-5 wins do NOT flip GamePlus', () => {
    for (const b of BOSSES) {
      if (b.id === 'cosmic-council-judgment') continue;
      dispatchBossReward(b);
    }
    expect(loadGamePlusUnlocked()).toBe(false);
  });
});
