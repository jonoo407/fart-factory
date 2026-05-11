import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBossesDefeated,
  markBossDefeated,
  isBossUnlocked,
  loadBossUnlockToastSeen,
  markBossUnlockToastSeen,
  loadGamePlusUnlocked,
  setGamePlusUnlocked,
} from '../../src/state/boss-progress';
import { BOSSES } from '../../src/state/bosses';
import {
  markRecipeDiscovered,
  unlockFood,
  bumpBestMatchOverall,
} from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('Boss-progress persistence (Phase N item 72)', () => {
  it('defaults to empty defeated list', () => {
    expect(loadBossesDefeated()).toEqual([]);
  });

  it('markBossDefeated returns {firstWin: true} on first; false on repeat', () => {
    const a = markBossDefeated('granny-family-reunion');
    expect(a.firstWin).toBe(true);
    expect(loadBossesDefeated()).toContain('granny-family-reunion');
    const b = markBossDefeated('granny-family-reunion');
    expect(b.firstWin).toBe(false);
  });

  it('toast-seen flag tracks per-boss (so notification fires once)', () => {
    expect(loadBossUnlockToastSeen('granny-family-reunion')).toBe(false);
    markBossUnlockToastSeen('granny-family-reunion');
    expect(loadBossUnlockToastSeen('granny-family-reunion')).toBe(true);
    expect(loadBossUnlockToastSeen('royal-court-escalation')).toBe(false);
  });

  it('GamePlus default is false; flips after Boss 5 reward setter', () => {
    expect(loadGamePlusUnlocked()).toBe(false);
    setGamePlusUnlocked(true);
    expect(loadGamePlusUnlocked()).toBe(true);
  });
});

describe('isBossUnlocked — unlock predicate evaluation', () => {
  it('Boss 1 unlocks once 10 recipes are discovered', () => {
    const boss = BOSSES.find((b) => b.id === 'granny-family-reunion')!;
    expect(isBossUnlocked(boss)).toBe(false);
    for (let i = 0; i < 9; i++) markRecipeDiscovered(`recipe-${i}`);
    expect(isBossUnlocked(boss)).toBe(false);
    markRecipeDiscovered('recipe-10');
    expect(isBossUnlocked(boss)).toBe(true);
  });

  it('Boss 2 requires Boss 1 defeated AND best-overall ≥70', () => {
    const boss = BOSSES.find((b) => b.id === 'royal-court-escalation')!;
    // Without Boss 1 defeated → locked.
    bumpBestMatchOverall(90);
    expect(isBossUnlocked(boss)).toBe(false);
    // Defeat Boss 1 but only 60% best → still locked.
    markBossDefeated('granny-family-reunion');
    localStorage.removeItem('fart_best_overall');
    bumpBestMatchOverall(60);
    expect(isBossUnlocked(boss)).toBe(false);
    // Now 80% best.
    bumpBestMatchOverall(80);
    expect(isBossUnlocked(boss)).toBe(true);
  });

  it('Boss 3 requires Boss 2 defeated AND ≥2 epic foods owned', () => {
    const boss = BOSSES.find((b) => b.id === 'haunted-three-ghosts')!;
    expect(isBossUnlocked(boss)).toBe(false);
    markBossDefeated('royal-court-escalation');
    // Owning 1 epic isn't enough.
    unlockFood('stinky-tofu');
    expect(isBossUnlocked(boss)).toBe(false);
    unlockFood('natto');
    expect(isBossUnlocked(boss)).toBe(true);
  });

  it('Boss 5 requires ALL 4 prior bosses defeated', () => {
    const boss = BOSSES.find((b) => b.id === 'cosmic-council-judgment')!;
    expect(isBossUnlocked(boss)).toBe(false);
    markBossDefeated('granny-family-reunion');
    markBossDefeated('royal-court-escalation');
    markBossDefeated('haunted-three-ghosts');
    expect(isBossUnlocked(boss)).toBe(false);
    markBossDefeated('volcano-cult-ritual');
    expect(isBossUnlocked(boss)).toBe(true);
  });
});
