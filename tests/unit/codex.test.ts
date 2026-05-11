import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCodex,
  loadCodexSlot,
  testCodexSlot,
  isFullyDecoded,
  TEST_GOLD_COST,
  TEST_NOTES_COST,
  type CodexTestResult,
} from '../../src/state/codex';
import { setGold, loadGold, setResearchNotes, loadResearchNotes, savePantry, unlockFood, loadPantry } from '../../src/state/persistence';
import { discoverAxesFromFart, resetAxisDiscovery } from '../../src/state/axis-discovery';

/**
 * V8 T7.c — Legendary Codex.
 *
 * Each legendary recipe starts with its ingredient list HIDDEN even after
 * the quest gates clear. Players spend a small currency + an ingredient
 * to probe a slot:
 *   - hit → slot revealed forever, ingredient consumed
 *   - miss → ingredient consumed, gold/notes spent, hint returned
 *
 * Hints reference axes that the player has already DISCOVERED (Scheme 1),
 * so early-game players get vaguer feedback.
 *
 * Full decode = every slot revealed → permanent passive buff unlocks.
 */

const FORBIDDEN_BLAST_ID = 'forbidden-blast';

beforeEach(() => {
  localStorage.clear();
  resetAxisDiscovery();
  // Give the player enough resources to test plenty of slots.
  setGold(500);
  setResearchNotes(100);
  // Unlock everything (so consumed-ingredient checks pass).
  for (const id of ['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage',
    'forbidden-burrito', 'volcano-chili', 'ghost-pepper',
    'mystery-casserole', 'sky-bean', 'glowing-mushroom']) {
    unlockFood(id);
  }
});

describe('codex defaults', () => {
  it('codex starts empty', () => {
    expect(loadCodex()).toEqual({});
  });

  it('a fresh slot is unrevealed', () => {
    const slot = loadCodexSlot(FORBIDDEN_BLAST_ID, 0);
    expect(slot.revealed).toBeNull();
    expect(slot.tested).toEqual([]);
  });

  it('a recipe without any tested slots is not fully decoded', () => {
    expect(isFullyDecoded(FORBIDDEN_BLAST_ID)).toBe(false);
  });
});

describe('testCodexSlot — HIT path', () => {
  it('correct guess reveals the slot', () => {
    // forbidden-blast.ingredients = ['forbidden-burrito','volcano-chili','ghost-pepper']
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    expect(r.hit).toBe(true);
    const slot = loadCodexSlot(FORBIDDEN_BLAST_ID, 0);
    expect(slot.revealed).toBe('forbidden-burrito');
  });

  it('consumes gold + research notes on a hit', () => {
    const beforeGold = loadGold();
    const beforeNotes = loadResearchNotes();
    testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    expect(loadGold()).toBe(beforeGold - TEST_GOLD_COST);
    expect(loadResearchNotes()).toBe(beforeNotes - TEST_NOTES_COST);
  });

  it('does not double-charge if testing an already-revealed slot', () => {
    testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    const beforeGold = loadGold();
    const beforeNotes = loadResearchNotes();
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    expect(r.hit).toBe(true);
    expect(loadGold()).toBe(beforeGold);
    expect(loadResearchNotes()).toBe(beforeNotes);
  });
});

describe('testCodexSlot — MISS path', () => {
  it('wrong guess does NOT reveal the slot', () => {
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'beans');
    expect(r.hit).toBe(false);
    const slot = loadCodexSlot(FORBIDDEN_BLAST_ID, 0);
    expect(slot.revealed).toBeNull();
  });

  it('miss records the tested food so it greys out next time', () => {
    testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'beans');
    expect(loadCodexSlot(FORBIDDEN_BLAST_ID, 0).tested).toContain('beans');
  });

  it('returns a hint on miss (when the player has discovered an axis to hint about)', () => {
    // Discover all axes so the hint engine has something to say.
    discoverAxesFromFart({ wet: 5, dry: 5, stink: 5, loud: 5, musical: 5, length: 5, temp: 5 });
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'beans');
    expect(r.hit).toBe(false);
    expect(r.hint).toBeTruthy();
    expect(r.hint!.length).toBeGreaterThan(0);
  });

  it('miss still costs gold + notes', () => {
    const beforeGold = loadGold();
    const beforeNotes = loadResearchNotes();
    testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'beans');
    expect(loadGold()).toBe(beforeGold - TEST_GOLD_COST);
    expect(loadResearchNotes()).toBe(beforeNotes - TEST_NOTES_COST);
  });
});

describe('testCodexSlot — affordability', () => {
  it('refuses to test if gold is insufficient', () => {
    setGold(TEST_GOLD_COST - 1);
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    expect(r.hit).toBe(false);
    expect(r.refused).toBe('insufficient-gold');
    expect(loadCodexSlot(FORBIDDEN_BLAST_ID, 0).revealed).toBeNull();
  });

  it('refuses to test if research notes are insufficient', () => {
    setResearchNotes(TEST_NOTES_COST - 1);
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    expect(r.hit).toBe(false);
    expect(r.refused).toBe('insufficient-notes');
  });

  it('refuses to test if the player does not own the probed food', () => {
    // Wipe pantry so beans is no longer owned.
    savePantry([]);
    const r = testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'beans');
    expect(r.hit).toBe(false);
    expect(r.refused).toBe('not-in-pantry');
    // No gold/notes spent.
    expect(loadGold()).toBe(500);
  });
});

describe('isFullyDecoded', () => {
  it('flips to true once every slot is revealed', () => {
    expect(isFullyDecoded(FORBIDDEN_BLAST_ID)).toBe(false);
    testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    testCodexSlot(FORBIDDEN_BLAST_ID, 1, 'volcano-chili');
    expect(isFullyDecoded(FORBIDDEN_BLAST_ID)).toBe(false);
    testCodexSlot(FORBIDDEN_BLAST_ID, 2, 'ghost-pepper');
    expect(isFullyDecoded(FORBIDDEN_BLAST_ID)).toBe(true);
  });

  it('returns false for non-legendary recipes (Codex is legendary-only)', () => {
    expect(isFullyDecoded('swamp-beast')).toBe(false);
  });
});

describe('persistence', () => {
  it('reveals survive across module reads', () => {
    testCodexSlot(FORBIDDEN_BLAST_ID, 0, 'forbidden-burrito');
    // Codex should be reloaded from localStorage on next call.
    expect(loadCodex()[FORBIDDEN_BLAST_ID]?.revealed[0]).toBe('forbidden-burrito');
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem('fart_legendary_codex', '{not json');
    expect(loadCodex()).toEqual({});
  });

  it('CodexTestResult is exported', () => {
    const _x: CodexTestResult = { hit: true };
    expect(_x).toBeDefined();
  });

  it('pantry helper exists (sanity)', () => {
    expect(loadPantry().length).toBeGreaterThan(0);
  });
});
