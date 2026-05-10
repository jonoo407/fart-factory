import { describe, it, expect, beforeEach } from 'vitest';
import {
  ACHIEVEMENTS,
  loadUnlocked,
  saveUnlocked,
  evaluateLaunch,
  type LaunchContext,
} from '../../src/state/achievements';

beforeEach(() => {
  localStorage.clear();
});

describe('ACHIEVEMENTS catalog', () => {
  it('has at least 6 badges', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(6);
  });

  it('every badge has a unique id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every badge has non-empty name and emoji', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(2);
      expect(a.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('loadUnlocked / saveUnlocked', () => {
  it('returns empty Set when storage is empty', () => {
    expect(loadUnlocked().size).toBe(0);
  });

  it('survives malformed JSON', () => {
    localStorage.setItem('fart_achievements', '{{not json');
    expect(loadUnlocked().size).toBe(0);
  });

  it('survives non-array', () => {
    localStorage.setItem('fart_achievements', '"hello"');
    expect(loadUnlocked().size).toBe(0);
  });

  it('round-trips a Set', () => {
    saveUnlocked(new Set(['first-toot', 's-tier']));
    const reloaded = loadUnlocked();
    expect(reloaded.has('first-toot')).toBe(true);
    expect(reloaded.has('s-tier')).toBe(true);
    expect(reloaded.size).toBe(2);
  });
});

describe('evaluateLaunch', () => {
  const baseCtx: LaunchContext = {
    sliders: [5, 5, 5, 5, 5, 5],
    total: 30,
    grade: 'B',
    hallSize: 0,
    launchesThisSession: 1,
  };

  it('first ever launch unlocks "first-toot"', () => {
    const newly = evaluateLaunch(baseCtx, new Set());
    expect(newly).toContain('first-toot');
  });

  it('does NOT re-unlock first-toot on second launch', () => {
    const already = new Set(['first-toot']);
    const newly = evaluateLaunch(
      { ...baseCtx, launchesThisSession: 2 },
      already,
    );
    expect(newly).not.toContain('first-toot');
  });

  it('S+ grade unlocks "s-tier"', () => {
    const newly = evaluateLaunch(
      { ...baseCtx, sliders: [10, 10, 10, 10, 10, 10], total: 60, grade: 'S+' },
      new Set(['first-toot']),
    );
    expect(newly).toContain('s-tier');
  });

  it('stink slider = 10 unlocks "stink-lord"', () => {
    const newly = evaluateLaunch(
      { ...baseCtx, sliders: [5, 5, 5, 10, 5, 5] },
      new Set(['first-toot']),
    );
    expect(newly).toContain('stink-lord');
  });

  it('musical slider = 10 unlocks "symphony"', () => {
    const newly = evaluateLaunch(
      { ...baseCtx, sliders: [5, 5, 5, 5, 5, 10] },
      new Set(['first-toot']),
    );
    expect(newly).toContain('symphony');
  });

  it('total ≥ 50 unlocks "loud-and-proud"', () => {
    const newly = evaluateLaunch(
      { ...baseCtx, sliders: [9, 9, 9, 9, 9, 9], total: 54, grade: 'S+' },
      new Set(['first-toot']),
    );
    expect(newly).toContain('loud-and-proud');
  });

  it('hallSize === 5 unlocks "hall-filler"', () => {
    const newly = evaluateLaunch(
      { ...baseCtx, hallSize: 5 },
      new Set(['first-toot']),
    );
    expect(newly).toContain('hall-filler');
  });

  it('returns only NEWLY unlocked badges, not already-owned', () => {
    const owned = new Set(['first-toot', 'stink-lord']);
    const newly = evaluateLaunch(
      { ...baseCtx, sliders: [5, 5, 5, 10, 5, 5] },
      owned,
    );
    expect(newly).not.toContain('first-toot');
    expect(newly).not.toContain('stink-lord');
  });
});
