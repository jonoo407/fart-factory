import { describe, it, expect, beforeEach } from 'vitest';
import { detectHiddenCombo } from '../../src/scoring/hidden-combos';
import { FOODS } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('detectHiddenCombo (T4.1)', () => {
  it('returns null for an ordinary plate', () => {
    expect(detectHiddenCombo(['beans', 'cheese'])).toBeNull();
  });

  it('detects CHEESEPOCALYPSE — 4 dairy foods on the plate', () => {
    expect(detectHiddenCombo(['cheese', 'cheese', 'aged-stilton', 'casu-marzu'])?.id).toBe('cheesepocalypse');
  });

  it('detects BENDER — single food repeated 4 times', () => {
    expect(detectHiddenCombo(['beans', 'beans', 'beans', 'beans'])?.id).toBe('bender');
  });

  it('detects LEGENDARY ALIGNMENT — only legendary foods (≥3)', () => {
    expect(detectHiddenCombo(['forbidden-burrito', 'mystery-casserole', 'sky-bean'])?.id).toBe('legendary-alignment');
  });

  it('does NOT detect LEGENDARY ALIGNMENT for a mixed plate', () => {
    expect(detectHiddenCombo(['forbidden-burrito', 'beans'])).toBeNull();
  });

  it('every hidden combo has flavor text + at least one effect', () => {
    const all = [
      detectHiddenCombo(['cheese', 'cheese', 'aged-stilton', 'casu-marzu'])!,
      detectHiddenCombo(['beans', 'beans', 'beans', 'beans'])!,
      detectHiddenCombo(['forbidden-burrito', 'mystery-casserole', 'sky-bean'])!,
    ];
    for (const c of all) {
      expect(c.flavor.length).toBeGreaterThan(0);
      expect(c.bonusGold > 0 || c.bonusNotes > 0 || c.guaranteedDrop || c.guaranteedPerfect).toBeTruthy();
    }
  });

  it('food catalog presence sanity — referenced ids exist', () => {
    const idSet = new Set(FOODS.map((f) => f.id));
    for (const id of ['cheese', 'aged-stilton', 'casu-marzu', 'beans', 'forbidden-burrito', 'mystery-casserole', 'sky-bean']) {
      expect(idSet.has(id)).toBe(true);
    }
  });
});
