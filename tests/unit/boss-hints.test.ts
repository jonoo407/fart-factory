import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBossHints,
  recordFirstLoss,
  revealedCravingsForBoss,
  loadBossLossCount,
  recordBossLoss,
} from '../../src/state/boss-hints';
import { BOSSES } from '../../src/state/bosses';

beforeEach(() => {
  localStorage.clear();
});

describe('boss-hints — first-loss reveal', () => {
  it('returns a craving label the first time the boss loses', () => {
    const hint = recordFirstLoss('granny-family-reunion');
    expect(hint).not.toBeNull();
    expect(typeof hint).toBe('string');
    expect(hint!.length).toBeGreaterThan(0);
  });

  it('returns null on the second loss (same boss already revealed)', () => {
    recordFirstLoss('granny-family-reunion');
    const second = recordFirstLoss('granny-family-reunion');
    expect(second).toBeNull();
  });

  it('reveal is deterministic by boss-audience cravings (same boss → same axis)', () => {
    const a = recordFirstLoss('royal-court-escalation');
    localStorage.clear();
    const b = recordFirstLoss('royal-court-escalation');
    expect(a).toBe(b);
  });

  it('revealedCravingsForBoss returns axis after a recorded first loss', () => {
    recordFirstLoss('haunted-three-ghosts');
    expect(revealedCravingsForBoss('haunted-three-ghosts').length).toBeGreaterThan(0);
  });

  it('revealedCravingsForBoss returns empty array when none recorded', () => {
    expect(revealedCravingsForBoss('granny-family-reunion')).toEqual([]);
  });

  it('returns null for unknown boss id', () => {
    expect(recordFirstLoss('not-a-real-boss')).toBeNull();
  });
});

describe('boss-hints — per-boss loss counter', () => {
  it('starts at zero', () => {
    expect(loadBossLossCount('granny-family-reunion')).toBe(0);
  });

  it('increments on each recordBossLoss call', () => {
    recordBossLoss('granny-family-reunion');
    recordBossLoss('granny-family-reunion');
    recordBossLoss('granny-family-reunion');
    expect(loadBossLossCount('granny-family-reunion')).toBe(3);
  });

  it('recordFirstLoss also increments the counter', () => {
    recordFirstLoss('volcano-cult-ritual');
    expect(loadBossLossCount('volcano-cult-ritual')).toBe(1);
    recordFirstLoss('volcano-cult-ritual');
    expect(loadBossLossCount('volcano-cult-ritual')).toBe(2);
  });

  it('counters are scoped per boss', () => {
    recordBossLoss('granny-family-reunion');
    recordBossLoss('granny-family-reunion');
    recordBossLoss('royal-court-escalation');
    expect(loadBossLossCount('granny-family-reunion')).toBe(2);
    expect(loadBossLossCount('royal-court-escalation')).toBe(1);
  });

  it('every boss in the catalog has at least one audience to draw a hint from', () => {
    for (const b of BOSSES) {
      expect(b.audiences.length).toBeGreaterThan(0);
    }
  });
});

describe('boss-hints — corruption safety', () => {
  it('loadBossHints returns {} on corrupt JSON', () => {
    localStorage.setItem('fart_boss_hints_revealed', '{not json');
    expect(loadBossHints()).toEqual({});
  });

  it('loadBossLossCount returns 0 on corrupt value', () => {
    localStorage.setItem('fart_boss_losses_granny-family-reunion', 'banana');
    expect(loadBossLossCount('granny-family-reunion')).toBe(0);
  });
});
