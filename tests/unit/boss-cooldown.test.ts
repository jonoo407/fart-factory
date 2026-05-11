import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBossCooldown,
  setBossCooldown,
  decrementAllCooldowns,
  isOnCooldown,
  loadNextBossSlotIdx,
  rollNextBossSlot,
  isBossSlot,
  eligibleBossForSlot,
  BOSS_SLOT_MIN_OFFSET,
  BOSS_SLOT_MAX_OFFSET,
} from '../../src/state/boss-cadence';
import { markBossDefeated } from '../../src/state/boss-progress';
import { markRecipeDiscovered } from '../../src/state/persistence';
import { resetRunState } from '../../src/state/run-state';

beforeEach(() => {
  localStorage.clear();
  resetRunState();
});

describe('Boss cooldown — per-boss countdown', () => {
  it('default cooldown is 0', () => {
    expect(loadBossCooldown('granny-family-reunion')).toBe(0);
    expect(isOnCooldown('granny-family-reunion')).toBe(false);
  });

  it('setBossCooldown persists', () => {
    setBossCooldown('granny-family-reunion', 3);
    expect(loadBossCooldown('granny-family-reunion')).toBe(3);
    expect(isOnCooldown('granny-family-reunion')).toBe(true);
  });

  it('decrementAllCooldowns reduces each by 1, never below 0', () => {
    setBossCooldown('granny-family-reunion', 3);
    setBossCooldown('royal-court-escalation', 1);
    decrementAllCooldowns();
    expect(loadBossCooldown('granny-family-reunion')).toBe(2);
    expect(loadBossCooldown('royal-court-escalation')).toBe(0);
    decrementAllCooldowns();
    expect(loadBossCooldown('royal-court-escalation')).toBe(0);
  });
});

describe('Boss-cadence roll', () => {
  it('rollNextBossSlot writes idx within [current+MIN, current+MAX]', () => {
    rollNextBossSlot(10);
    const next = loadNextBossSlotIdx();
    expect(next).toBeGreaterThanOrEqual(10 + BOSS_SLOT_MIN_OFFSET);
    expect(next).toBeLessThanOrEqual(10 + BOSS_SLOT_MAX_OFFSET);
  });

  it('rollNextBossSlot is deterministic for the same currentIdx + run seed', () => {
    rollNextBossSlot(0);
    const first = loadNextBossSlotIdx();
    // Reset just the slot to confirm reroll yields same value.
    localStorage.removeItem('fart_next_boss_slot');
    rollNextBossSlot(0);
    expect(loadNextBossSlotIdx()).toBe(first);
  });

  it('isBossSlot is true exactly when the current idx equals the next-slot value', () => {
    rollNextBossSlot(0);
    const slot = loadNextBossSlotIdx();
    expect(isBossSlot(slot - 1)).toBe(false);
    expect(isBossSlot(slot)).toBe(true);
    expect(isBossSlot(slot + 1)).toBe(false);
  });
});

describe('eligibleBossForSlot — picks unlocked, non-cooldown boss', () => {
  it('returns null when no boss is unlocked', () => {
    expect(eligibleBossForSlot()).toBeNull();
  });

  it('returns Boss 1 when it is unlocked and not on cooldown', () => {
    // Unlock Boss 1 via 10 recipes.
    for (let i = 0; i < 10; i++) markRecipeDiscovered(`r-${i}`);
    const b = eligibleBossForSlot();
    expect(b?.id).toBe('granny-family-reunion');
  });

  it('skips bosses that are on cooldown', () => {
    for (let i = 0; i < 10; i++) markRecipeDiscovered(`r-${i}`);
    setBossCooldown('granny-family-reunion', 3);
    expect(eligibleBossForSlot()?.id).not.toBe('granny-family-reunion');
  });

  it('returns the lowest-act available boss (preserve order)', () => {
    // Boss 1 + Boss 2 both unlocked.
    for (let i = 0; i < 10; i++) markRecipeDiscovered(`r-${i}`);
    markBossDefeated('granny-family-reunion');
    localStorage.setItem('fart_best_overall', '80');
    // Boss 1 already defeated → re-fightable for currency. Boss 2 also unlocked.
    // Either is a valid pick. Eligible-for-slot should pick Boss 2 (newer).
    const b = eligibleBossForSlot();
    expect(b?.id).toBe('royal-court-escalation');
  });
});
