import { describe, it, expect, beforeEach } from 'vitest';
import {
  diminishingMultiplier,
  recordLaunch,
  upcomingLaunchIdx,
  isWowed,
  clearEncounterProgress,
  loadEncounterProgress,
  WOW_THRESHOLD,
} from '../../src/state/encounter-progress';

beforeEach(() => {
  localStorage.clear();
});

describe('diminishingMultiplier', () => {
  it('first launch pays in full (×1.0)', () => {
    expect(diminishingMultiplier(1)).toBe(1.0);
  });
  it('curve: 1.0 → 0.6 → 0.3 → 0.1', () => {
    expect(diminishingMultiplier(2)).toBe(0.6);
    expect(diminishingMultiplier(3)).toBeCloseTo(0.3);
    expect(diminishingMultiplier(4)).toBeCloseTo(0.1);
  });
  it('floors at 0.1 for launches past the table', () => {
    expect(diminishingMultiplier(5)).toBeCloseTo(0.1);
    expect(diminishingMultiplier(99)).toBeCloseTo(0.1);
  });
  it('treats 0 / negative as launch 1', () => {
    expect(diminishingMultiplier(0)).toBe(1.0);
    expect(diminishingMultiplier(-5)).toBe(1.0);
  });
});

describe('upcomingLaunchIdx', () => {
  it('returns 1 on a fresh encounter', () => {
    expect(upcomingLaunchIdx('granny-edna', 0)).toBe(1);
  });
  it('increments after a recordLaunch', () => {
    recordLaunch('granny-edna', 0, 50);
    expect(upcomingLaunchIdx('granny-edna', 0)).toBe(2);
  });
  it('resets to 1 when the encounter idx changes', () => {
    recordLaunch('granny-edna', 0, 50);
    recordLaunch('granny-edna', 0, 50);
    expect(upcomingLaunchIdx('granny-edna', 1)).toBe(1);
  });
});

describe('recordLaunch — wowed bookkeeping', () => {
  it('justWowed is true on the first launch that crosses the threshold', () => {
    const r = recordLaunch('granny-edna', 0, WOW_THRESHOLD);
    expect(r.justWowed).toBe(true);
    expect(r.progress.wowed).toBe(true);
  });
  it('justWowed is false on subsequent launches even at higher pct', () => {
    recordLaunch('granny-edna', 0, 90);
    const r = recordLaunch('granny-edna', 0, 95);
    expect(r.justWowed).toBe(false);
    expect(r.progress.wowed).toBe(true);
  });
  it('justWowed stays false below the threshold', () => {
    const r = recordLaunch('granny-edna', 0, 84);
    expect(r.justWowed).toBe(false);
    expect(r.progress.wowed).toBe(false);
  });
  it('tracks bestPct across launches', () => {
    recordLaunch('granny-edna', 0, 50);
    recordLaunch('granny-edna', 0, 90);
    recordLaunch('granny-edna', 0, 60);
    const p = loadEncounterProgress();
    expect(p?.bestPct).toBe(90);
  });
  it('wowed state survives reload via load*()', () => {
    recordLaunch('granny-edna', 0, 88);
    expect(isWowed('granny-edna', 0)).toBe(true);
  });
});

describe('encounter rollover', () => {
  it('a different audience id at the same idx restarts progress', () => {
    recordLaunch('granny-edna', 0, 90);
    expect(isWowed('royal-court', 0)).toBe(false);
    expect(upcomingLaunchIdx('royal-court', 0)).toBe(1);
  });
  it('clearEncounterProgress wipes the persisted record', () => {
    recordLaunch('granny-edna', 0, 90);
    clearEncounterProgress();
    expect(loadEncounterProgress()).toBeNull();
  });
});

describe('corruption recovery', () => {
  it('returns null on garbage', () => {
    localStorage.setItem('fart_encounter_progress', '{not json');
    expect(loadEncounterProgress()).toBeNull();
  });
  it('returns null on shape-invalid object', () => {
    localStorage.setItem('fart_encounter_progress', '{"audienceId":"x"}');
    expect(loadEncounterProgress()).toBeNull();
  });
});
