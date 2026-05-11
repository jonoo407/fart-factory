import { describe, it, expect, beforeEach } from 'vitest';
import {
  currentEncounterIdx,
  incrementEncounter,
  loadRunSeed,
  encounterSeed,
  rngBetween,
  resetRunState,
} from '../../src/state/run-state';

beforeEach(() => {
  localStorage.clear();
});

describe('Run state: encounter index (Phase 1)', () => {
  it('starts at 0 on a fresh save', () => {
    expect(currentEncounterIdx()).toBe(0);
  });

  it('incrementEncounter is monotonic + persisted', () => {
    expect(incrementEncounter()).toBe(1);
    expect(incrementEncounter()).toBe(2);
    expect(currentEncounterIdx()).toBe(2);
  });

  it('resetRunState wipes to 0', () => {
    incrementEncounter();
    incrementEncounter();
    resetRunState();
    expect(currentEncounterIdx()).toBe(0);
  });

  it('survives malformed storage value', () => {
    localStorage.setItem('fart_encounter_idx', '{not a number');
    expect(currentEncounterIdx()).toBe(0); // safe default
  });
});

describe('Run state: seed', () => {
  it('loadRunSeed defaults to a stable per-save number', () => {
    const s = loadRunSeed();
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBeGreaterThan(0);
  });

  it('loadRunSeed returns the same value across calls (persisted)', () => {
    const a = loadRunSeed();
    const b = loadRunSeed();
    expect(a).toBe(b);
  });
});

describe('Run state: deterministic seeded RNG', () => {
  it('encounterSeed(idx) is deterministic per save', () => {
    const a = encounterSeed(5);
    const b = encounterSeed(5);
    expect(a).toBe(b);
  });

  it('encounterSeed differs across indices', () => {
    expect(encounterSeed(1)).not.toBe(encounterSeed(2));
  });

  it('rngBetween produces values within [min, max]', () => {
    const seed = encounterSeed(0);
    for (let i = 0; i < 50; i++) {
      const v = rngBetween(seed + i, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
    }
  });

  it('rngBetween is deterministic for a given seed', () => {
    expect(rngBetween(42, 3, 8)).toBe(rngBetween(42, 3, 8));
  });
});
