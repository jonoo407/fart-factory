import { describe, it, expect, beforeEach } from 'vitest';
import { loadTrophies, addTrophy, clearTrophies } from '../../src/state/trophies';

beforeEach(() => {
  localStorage.clear();
});

describe('Boss trophies (T3.2)', () => {
  it('starts empty', () => {
    expect(loadTrophies()).toEqual([]);
  });

  it('addTrophy appends + persists', () => {
    addTrophy({
      bossId: 'granny-family-reunion',
      defeatedAt: '2026-05-11T10:00:00Z',
      plateUsed: ['beans', 'cheese'],
      matchPct: 87,
    });
    expect(loadTrophies()).toHaveLength(1);
    expect(loadTrophies()[0]!.bossId).toBe('granny-family-reunion');
  });

  it('addTrophy stores multiple wins (re-fights count)', () => {
    addTrophy({ bossId: 'granny-family-reunion', defeatedAt: '2026-05-11T10:00:00Z', plateUsed: ['beans'], matchPct: 75 });
    addTrophy({ bossId: 'granny-family-reunion', defeatedAt: '2026-05-11T11:00:00Z', plateUsed: ['cheese'], matchPct: 90 });
    expect(loadTrophies()).toHaveLength(2);
  });

  it('clearTrophies wipes the list', () => {
    addTrophy({ bossId: 'royal-court-escalation', defeatedAt: '', plateUsed: [], matchPct: 100 });
    clearTrophies();
    expect(loadTrophies()).toEqual([]);
  });

  it('filters malformed rows out of a corrupted store (keeps the valid ones)', () => {
    localStorage.setItem('fart_trophies', JSON.stringify([
      { bossId: 'granny-family-reunion', defeatedAt: '2026-05-11T10:00:00Z', plateUsed: ['beans'], matchPct: 80 },
      { bossId: 42 }, // wrong types
      null,
      'junk',
    ]));
    const list = loadTrophies();
    expect(list).toHaveLength(1);
    expect(list[0]!.bossId).toBe('granny-family-reunion');
  });

  it('returns [] on corrupt JSON', () => {
    localStorage.setItem('fart_trophies', '{not json');
    expect(loadTrophies()).toEqual([]);
  });

  it('survives malformed storage', () => {
    localStorage.setItem('fart_trophies', '{not array');
    expect(loadTrophies()).toEqual([]);
  });
});
