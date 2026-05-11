/**
 * Boss reward dispatch. Per PLAN_v4.md §A.N item 74.
 *
 * First win: unlocks the legendary food (calls unlockFood) and marks the
 * boss as defeated. Boss 5 first win also flips the GamePlus flag.
 *
 * Subsequent wins: bank gold + research notes (so re-fighting bosses
 * remains worthwhile for currency farming) but the food is already
 * unlocked (unlockFood is idempotent).
 */

import type { Boss } from '../state/bosses';
import { addGold, addResearchNotes, unlockFood, loadPantry } from '../state/persistence';
import {
  markBossDefeated,
  setGamePlusUnlocked,
  loadGamePlusUnlocked,
} from '../state/boss-progress';

const REPEAT_GOLD_REWARD = 25;
const REPEAT_NOTES_REWARD = 10;

export interface BossRewardResult {
  firstWin: boolean;
  foodUnlocked: string | null;
  goldAfter: number;
  notesAfter: number;
  gamePlusUnlocked: boolean;
}

export function dispatchBossReward(boss: Boss): BossRewardResult {
  const { firstWin } = markBossDefeated(boss.id);

  let foodUnlocked: string | null = null;
  let goldAfter = 0;
  let notesAfter = 0;

  if (firstWin) {
    // First win: unlock the legendary food only. No currency on first win —
    // the food IS the reward.
    if (!loadPantry().includes(boss.rewardFoodId)) {
      unlockFood(boss.rewardFoodId);
      foodUnlocked = boss.rewardFoodId;
    }
    // Boss 5: flip the GamePlus flag.
    if (boss.id === 'cosmic-council-judgment') {
      setGamePlusUnlocked(true);
    }
  } else {
    // Repeat win: gold + notes for farming.
    goldAfter = addGold(REPEAT_GOLD_REWARD);
    notesAfter = addResearchNotes(REPEAT_NOTES_REWARD);
  }

  return {
    firstWin,
    foodUnlocked,
    goldAfter,
    notesAfter,
    gamePlusUnlocked: loadGamePlusUnlocked(),
  };
}
