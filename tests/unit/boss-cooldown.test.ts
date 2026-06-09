import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBossCooldown,
  setBossCooldown,
  decrementAllCooldowns,
  isOnCooldown,
} from '../../src/state/boss-cadence';
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
