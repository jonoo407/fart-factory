import { describe, it, expect, beforeEach } from 'vitest';
import { FOODS } from '../../src/state/food';
import {
  loadPantryShowLocked,
  setPantryShowLocked,
} from '../../src/state/persistence';
import { buildPantryGridHtml } from '../../src/ui/pantry-grid';

const STARTER_IDS = new Set(FOODS.filter((f) => f.startsUnlocked).map((f) => f.id));

beforeEach(() => {
  localStorage.clear();
});

describe('pantry locked-collapse persistence (V8 T5)', () => {
  it('defaults to false (locked teasers hidden)', () => {
    expect(loadPantryShowLocked()).toBe(false);
  });

  it('round-trips true', () => {
    setPantryShowLocked(true);
    expect(loadPantryShowLocked()).toBe(true);
  });

  it('round-trips false', () => {
    setPantryShowLocked(true);
    setPantryShowLocked(false);
    expect(loadPantryShowLocked()).toBe(false);
  });

  it('returns false on corrupt JSON', () => {
    localStorage.setItem('fart_pantry_show_locked', '{not json');
    expect(loadPantryShowLocked()).toBe(false);
  });
});

describe('buildPantryGridHtml (V8 T5)', () => {
  it('returns the locked count', () => {
    const result = buildPantryGridHtml(FOODS, STARTER_IDS, false);
    expect(result.lockedCount).toBe(FOODS.length - STARTER_IDS.size);
  });

  it('with showLocked=false, only renders unlocked cards', () => {
    const { html } = buildPantryGridHtml(FOODS, STARTER_IDS, false);
    // Every starter id appears
    for (const id of STARTER_IDS) {
      expect(html).toContain(`data-food="${id}"`);
    }
    // No `???` placeholder cards (locked uses the ❓ ??? emoji+name).
    expect(html).not.toMatch(/food-card-locked/);
  });

  it('with showLocked=true, renders ALL cards (unlocked + locked)', () => {
    const { html } = buildPantryGridHtml(FOODS, STARTER_IDS, true);
    for (const f of FOODS) {
      expect(html).toContain(`data-food="${f.id}"`);
    }
    expect(html).toMatch(/food-card-locked/);
  });

  it('preserves the unlocked-first sort order regardless of showLocked', () => {
    const { html } = buildPantryGridHtml(FOODS, STARTER_IDS, true);
    // Find the index of the first locked card and the last unlocked card.
    const firstLocked = html.search(/food-card-locked/);
    // Every starter id must appear before the first locked occurrence.
    for (const id of STARTER_IDS) {
      const idx = html.indexOf(`data-food="${id}"`);
      expect(idx).toBeLessThan(firstLocked);
    }
  });

  it('handles empty unlocked set', () => {
    const { html, lockedCount } = buildPantryGridHtml(FOODS, new Set(), true);
    expect(lockedCount).toBe(FOODS.length);
    // All cards are locked.
    const lockedMatches = (html.match(/food-card-locked/g) ?? []).length;
    expect(lockedMatches).toBe(FOODS.length);
  });

  it('handles fully-unlocked pantry (no locked cards possible)', () => {
    const allIds = new Set(FOODS.map((f) => f.id));
    const { html, lockedCount } = buildPantryGridHtml(FOODS, allIds, false);
    expect(lockedCount).toBe(0);
    expect(html).not.toMatch(/food-card-locked/);
  });
});
