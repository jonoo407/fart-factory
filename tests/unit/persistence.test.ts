import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadPantry,
  unlockFood,
  loadGold,
  setGold,
  addGold,
  loadResearchNotes,
  addResearchNotes,
  loadDiscoveredRecipes,
  markRecipeDiscovered,
  loadMode,
  setMode,
  loadLastArea,
  setLastArea,
  loadLastMatch,
  setLastMatch,
  loadBelly,
  spendBelly,
  BELLY_CAPACITY,
} from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('Pantry persistence', () => {
  it('defaults to starter-unlocked foods (all common)', () => {
    const pantry = loadPantry();
    expect(pantry.length).toBeGreaterThanOrEqual(6); // 6 commons
    expect(pantry).toContain('beans');
    expect(pantry).toContain('cheese');
  });

  it('unlockFood adds to pantry and persists', () => {
    unlockFood('kimchi');
    expect(loadPantry()).toContain('kimchi');
  });

  it('unlockFood is idempotent', () => {
    unlockFood('kimchi');
    unlockFood('kimchi');
    const count = loadPantry().filter((id) => id === 'kimchi').length;
    expect(count).toBe(1);
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem('fart_pantry', '{not json');
    const pantry = loadPantry();
    expect(pantry).toContain('beans'); // returns defaults
  });
});

describe('Gold currency', () => {
  it('defaults to 0', () => {
    expect(loadGold()).toBe(0);
  });

  it('addGold increases balance', () => {
    addGold(50);
    expect(loadGold()).toBe(50);
    addGold(25);
    expect(loadGold()).toBe(75);
  });

  it('setGold floors to integer and clamps to 0', () => {
    setGold(42.7);
    expect(loadGold()).toBe(42);
    setGold(-10);
    expect(loadGold()).toBe(0);
  });
});

describe('Research notes', () => {
  it('defaults to 0', () => {
    expect(loadResearchNotes()).toBe(0);
  });

  it('addResearchNotes accumulates', () => {
    addResearchNotes(3);
    addResearchNotes(2);
    expect(loadResearchNotes()).toBe(5);
  });
});

describe('Discovered recipes', () => {
  it('defaults to empty', () => {
    expect(loadDiscoveredRecipes()).toEqual([]);
  });

  it('markRecipeDiscovered returns {added: true} on first; {added: false} on repeat', () => {
    const a = markRecipeDiscovered('swamp-beast');
    expect(a.added).toBe(true);
    expect(a.list).toContain('swamp-beast');
    const b = markRecipeDiscovered('swamp-beast');
    expect(b.added).toBe(false);
  });
});

describe('Mode toggle', () => {
  it('defaults to sandbox during food-mvp build phases (test-preserving)', () => {
    expect(loadMode()).toBe('sandbox');
  });
  it('round-trips story and sandbox', () => {
    setMode('story');
    expect(loadMode()).toBe('story');
    setMode('sandbox');
    expect(loadMode()).toBe('sandbox');
  });
  it('returns default on corrupt value', () => {
    localStorage.setItem('fart_mode', '"weird"');
    expect(loadMode()).toBe('sandbox');
  });
});

describe('Last area + last match (trend)', () => {
  it('defaults: area=outside, match=null', () => {
    expect(loadLastArea()).toBe('outside');
    expect(loadLastMatch()).toBeNull();
  });
  it('persists', () => {
    setLastArea('elevator');
    setLastMatch(73);
    expect(loadLastArea()).toBe('elevator');
    expect(loadLastMatch()).toBe(73);
  });
});

describe('Belly meter (per-UTC-day)', () => {
  it('defaults to BELLY_CAPACITY for the date', () => {
    expect(loadBelly(new Date('2026-05-10T12:00:00Z'))).toBe(BELLY_CAPACITY);
  });

  it('spendBelly deducts when sufficient', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    const r = spendBelly(3, date);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(BELLY_CAPACITY - 3);
  });

  it('spendBelly refuses when insufficient', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    spendBelly(BELLY_CAPACITY, date); // exhaust
    const r = spendBelly(1, date);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('different days have independent belly meters', () => {
    const d1 = new Date('2026-05-10T12:00:00Z');
    const d2 = new Date('2026-05-11T12:00:00Z');
    spendBelly(10, d1);
    expect(loadBelly(d1)).toBe(BELLY_CAPACITY - 10);
    expect(loadBelly(d2)).toBe(BELLY_CAPACITY); // independent
  });
});
