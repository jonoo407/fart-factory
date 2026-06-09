import { describe, it, expect, beforeEach } from 'vitest';
import { renderCodexEntryHtml } from '../../src/ui/codex';
import { getRecipe } from '../../src/state/recipes';
import { testCodexSlot, TEST_GOLD_COST, TEST_NOTES_COST } from '../../src/state/codex';
import { setGold, setResearchNotes, unlockFood } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
  setGold(500);
  setResearchNotes(100);
  unlockFood('forbidden-burrito');
  unlockFood('volcano-chili');
  unlockFood('ghost-pepper');
});

describe('renderCodexEntryHtml (V8 T7.d)', () => {
  it('includes the legendary recipe name and emoji', () => {
    const r = getRecipe('forbidden-blast')!;
    const html = renderCodexEntryHtml(r);
    expect(html).toContain(r.name);
    expect(html).toContain(r.emoji);
  });

  it('renders N slot cells equal to the number of ingredients', () => {
    const r = getRecipe('forbidden-blast')!;
    const html = renderCodexEntryHtml(r);
    const slotMatches = html.match(/data-codex-slot=/g) ?? [];
    expect(slotMatches.length).toBe(r.ingredients.length);
  });

  it('shows ??? for an unrevealed slot', () => {
    const r = getRecipe('forbidden-blast')!;
    const html = renderCodexEntryHtml(r);
    // every slot is hidden initially
    const hiddenMatches = html.match(/codex-slot-hidden/g) ?? [];
    expect(hiddenMatches.length).toBe(r.ingredients.length);
  });

  it('shows the revealed food chip after a successful test', () => {
    const r = getRecipe('forbidden-blast')!;
    testCodexSlot(r.id, 0, 'forbidden-burrito');
    const html = renderCodexEntryHtml(r);
    expect(html).toContain('codex-slot-revealed');
    expect(html).toContain('forbidden-burrito');
  });

  it('emits a fully-decoded badge once every slot is revealed', () => {
    const r = getRecipe('forbidden-blast')!;
    testCodexSlot(r.id, 0, 'forbidden-burrito');
    testCodexSlot(r.id, 1, 'volcano-chili');
    testCodexSlot(r.id, 2, 'ghost-pepper');
    const html = renderCodexEntryHtml(r);
    expect(html).toMatch(/fully decoded|DECODED|complete/i);
    expect(html).toContain(r.legendaryBuff!.label);
  });

  it('renders the per-test cost label derived from the real cost constants', () => {
    const r = getRecipe('forbidden-blast')!;
    const html = renderCodexEntryHtml(r);
    expect(html).toMatch(new RegExp(`${TEST_GOLD_COST}\\s*gold`, 'i'));
    expect(html).toMatch(new RegExp(`${TEST_NOTES_COST}\\s*note`, 'i'));
  });

  it('locked recipes show their legendary quest steps instead of the slot grid', () => {
    // REAL locked state: a fresh save's pantry (commons only) holds none of
    // forbidden-blast's ingredients, so questGateCleared(r) is false. (The
    // old version forced it via a test-only lockedOverride param in the prod
    // signature — that backdoor is gone.)
    localStorage.clear();
    const r = getRecipe('forbidden-blast')!;
    const html = renderCodexEntryHtml(r);
    expect(html).toContain('LOCKED');
    expect(html).toContain('quest');
    for (const step of r.legendaryUnlock!.steps) {
      expect(html).toContain(step);
    }
  });
});
