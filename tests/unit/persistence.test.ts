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
  loadLastArea,
  loadLastMatch,
  setLastMatch,
  loadBelly,
  spendBelly,
  grantBellyBonus,
  bellyCapacity,
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

describe('Last area + last match (trend)', () => {
  it('defaults: area=outside, match=null', () => {
    expect(loadLastArea()).toBe('outside');
    expect(loadLastMatch()).toBeNull();
  });
  it('loadLastArea honors a stored value from an older save', () => {
    // The v9 UI removed the location picker, so nothing writes this key
    // anymore — but old saves may still carry one and it must be respected.
    localStorage.setItem('fart_area', JSON.stringify('elevator'));
    expect(loadLastArea()).toBe('elevator');
  });
  it('last match persists', () => {
    setLastMatch(73);
    expect(loadLastMatch()).toBe(73);
  });
});

describe('Belly meter (per-encounter, post-PLAN_v5 redesign)', () => {
  it('defaults to BELLY_CAPACITY for the current encounter', () => {
    expect(loadBelly(0)).toBe(BELLY_CAPACITY);
  });

  it('spendBelly deducts when sufficient', () => {
    const r = spendBelly(3, 0);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(BELLY_CAPACITY - 3);
  });

  it('spendBelly refuses when insufficient', () => {
    spendBelly(BELLY_CAPACITY, 0); // exhaust
    const r = spendBelly(1, 0);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('different encounters have independent belly meters', () => {
    spendBelly(10, 5);
    expect(loadBelly(5)).toBe(BELLY_CAPACITY - 10);
    expect(loadBelly(6)).toBe(BELLY_CAPACITY); // independent
  });

  it('belly bonus raises capacity for its encounter only, and spending works against the boosted cap', () => {
    grantBellyBonus(4, 3);
    expect(bellyCapacity(3)).toBe(BELLY_CAPACITY + 4);
    expect(loadBelly(3)).toBe(BELLY_CAPACITY + 4); // fresh meter = boosted cap
    expect(bellyCapacity(4)).toBe(BELLY_CAPACITY); // other encounters unboosted
    const r = spendBelly(BELLY_CAPACITY + 2, 3); // over base, under boosted cap
    expect(r.ok).toBe(true);
    expect(loadBelly(3)).toBe(2);
  });

  it('CHARACTERIZATION: a stored belly above the current cap is discarded → meter resets to FULL', () => {
    // loadBelly's validator rejects stored > cap. Today no in-game path lowers
    // a granted bonus for the same encounter, so this is unreachable in play —
    // but if one ever appears (or the cap constant shrinks), this is the
    // resulting behavior: the spent-down meter silently refills to the new cap
    // instead of clamping (min(stored, cap) would preserve the spend). Pinned
    // here so a future change to this semantics is a conscious one.
    grantBellyBonus(4, 7);
    spendBelly(1, 7); // stored = BELLY_CAPACITY + 3
    grantBellyBonus(0, 7); // bonus revoked → cap back to BELLY_CAPACITY
    expect(loadBelly(7)).toBe(BELLY_CAPACITY); // full again — the spend is forgotten
  });
});
