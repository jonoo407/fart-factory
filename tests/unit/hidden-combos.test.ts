import { describe, it, expect, beforeEach } from 'vitest';
import { detectHiddenCombo, HIDDEN_COMBO_CATALOG } from '../../src/scoring/hidden-combos';
import { FOODS } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('detectHiddenCombo — baseline (T4.1)', () => {
  it('returns null for an ordinary plate', () => {
    expect(detectHiddenCombo(['beans', 'cheese'])).toBeNull();
  });

  it('detects CHEESEPOCALYPSE — 4 dairy foods', () => {
    expect(detectHiddenCombo(['cheese', 'cheese', 'aged-stilton', 'casu-marzu'])?.id).toBe('cheesepocalypse');
  });

  it('detects BENDER — single food 4 times', () => {
    expect(detectHiddenCombo(['beans', 'beans', 'beans', 'beans'])?.id).toBe('bender');
  });

  it('detects LEGENDARY ALIGNMENT — only legendaries (≥3)', () => {
    expect(
      detectHiddenCombo(['forbidden-burrito', 'mystery-casserole', 'sky-bean'])?.id,
    ).toBe('legendary-alignment');
  });

  it('does NOT detect LEGENDARY ALIGNMENT for a mixed plate', () => {
    expect(detectHiddenCombo(['forbidden-burrito', 'beans'])).toBeNull();
  });

  it('food catalog presence sanity — referenced ids exist', () => {
    const idSet = new Set(FOODS.map((f) => f.id));
    for (const id of [
      'cheese', 'aged-stilton', 'casu-marzu', 'beans',
      'forbidden-burrito', 'mystery-casserole', 'sky-bean',
      'kviek-yogurt', 'natto',
    ]) {
      expect(idSet.has(id)).toBe(true);
    }
  });

  it('every catalog entry has flavor or at least an emoji/hint pair', () => {
    for (const c of HIDDEN_COMBO_CATALOG) {
      expect(c.emoji.length).toBeGreaterThan(0);
      expect(c.hint.length).toBeGreaterThan(0);
    }
  });
});

describe('detectHiddenCombo — PR4 expanded patterns', () => {
  it('GRANNY-DAIRY-TEA fires when granny audience + 4 dairy (precedes cheesepocalypse)', () => {
    const c = detectHiddenCombo(
      ['cheese', 'cheese', 'aged-stilton', 'casu-marzu'],
      { audienceId: 'granny-edna' },
    );
    expect(c?.id).toBe('granny-dairy-tea');
  });

  it('VOLCANIC-REVELRY fires for ≥3 hot (temp≥4) foods at volcano-rim', () => {
    const c = detectHiddenCombo(
      ['hot-pepper', 'ghost-pepper', 'volcano-chili'],
      { areaId: 'volcano-rim' },
    );
    expect(c?.id).toBe('volcanic-revelry');
  });

  it('VOLCANIC-REVELRY does NOT fire outside volcano-rim', () => {
    expect(
      detectHiddenCombo(['hot-pepper', 'ghost-pepper', 'volcano-chili'], { areaId: 'outside' }),
    ).toBeNull();
  });

  it('LIBRARY-QUIET fires at library + summed-loud ≤ 4', () => {
    const c = detectHiddenCombo(['egg', 'egg', 'egg'], { areaId: 'library' });
    expect(c?.id).toBe('library-quiet');
  });

  it('COSMIC-LONELINESS fires for single legendary in cosmic area', () => {
    const c = detectHiddenCombo(['forbidden-burrito'], { areaId: 'space' });
    expect(c?.id).toBe('cosmic-loneliness');
  });

  it('COSMIC-LONELINESS does NOT fire for a non-cosmic area', () => {
    expect(detectHiddenCombo(['forbidden-burrito'], { areaId: 'covers' })).toBeNull();
  });

  it('MASTERED-PLATE fires when every plate food has ≥25 uses', () => {
    const ids = ['beans', 'cheese', 'onion'];
    const c = detectHiddenCombo(ids, { getMasteryUses: () => 30 });
    expect(c?.id).toBe('mastered-plate');
  });

  it('MASTERED-PLATE does NOT fire if any food is under threshold', () => {
    const c = detectHiddenCombo(['beans', 'cheese', 'onion'], {
      getMasteryUses: (id) => (id === 'onion' ? 5 : 30),
    });
    expect(c?.id).not.toBe('mastered-plate');
  });

  it('RAINBOW-PLATE fires when 4 foods span 4 different rarities', () => {
    // common + uncommon + rare + epic = 4 distinct rarities.
    const c = detectHiddenCombo(['beans', 'kimchi', 'durian', 'natto']);
    expect(c?.id).toBe('rainbow-plate');
  });

  it('ALL-SPICY-QUARTET fires for 4 foods each at temp ≥ 4', () => {
    // hot-pepper (temp 5), ghost-pepper (5), volcano-chili (5), durian (4)
    const c = detectHiddenCombo(['hot-pepper', 'ghost-pepper', 'volcano-chili', 'durian']);
    expect(c?.id).toBe('all-spicy-quartet');
  });

  it('SWAMP-OVERLOAD fires for 4 foods each at wet ≥ 4', () => {
    // sardines (4), pickle (4), kombucha (4), pickled-egg (4)
    const c = detectHiddenCombo(['sardines', 'pickle', 'kombucha', 'pickled-egg']);
    expect(c?.id).toBe('swamp-overload');
  });

  it('STREAK-FINISHER fires when entering with streak ≥ 5', () => {
    const c = detectHiddenCombo(['beans', 'cheese'], { streak: 7 });
    expect(c?.id).toBe('streak-finisher');
  });

  it('STREAK-FINISHER does NOT fire below threshold', () => {
    expect(detectHiddenCombo(['beans', 'cheese'], { streak: 3 })).toBeNull();
  });

  it('returns null for empty plate', () => {
    expect(detectHiddenCombo([])).toBeNull();
  });

  it('HIDDEN_COMBO_CATALOG covers every combo id the detector can return', () => {
    // Cross-check: every catalog id should be returnable; collect detector ids
    // from a few representative invocations.
    const testCases = [
      { ids: ['cheese', 'cheese', 'aged-stilton', 'casu-marzu'], ctx: { audienceId: 'granny-edna' as const } },
      { ids: ['hot-pepper', 'ghost-pepper', 'volcano-chili'], ctx: { areaId: 'volcano-rim' } },
      { ids: ['egg', 'egg', 'egg'], ctx: { areaId: 'library' } },
      { ids: ['forbidden-burrito'], ctx: { areaId: 'space' } },
      { ids: ['cheese', 'cheese', 'aged-stilton', 'casu-marzu'], ctx: {} },
      { ids: ['beans', 'beans', 'beans', 'beans'], ctx: {} },
      { ids: ['forbidden-burrito', 'mystery-casserole', 'sky-bean'], ctx: {} },
      { ids: ['beans', 'cheese', 'onion'], ctx: { getMasteryUses: () => 30 } },
      { ids: ['beans', 'kimchi', 'durian', 'natto'], ctx: {} },
      { ids: ['hot-pepper', 'ghost-pepper', 'volcano-chili', 'durian'], ctx: {} },
      { ids: ['sardines', 'pickle', 'kombucha', 'pickled-egg'], ctx: {} },
      { ids: ['beans', 'cheese'], ctx: { streak: 7 } },
    ];
    const catalogIds = new Set(HIDDEN_COMBO_CATALOG.map((c) => c.id));
    for (const tc of testCases) {
      const c = detectHiddenCombo(tc.ids, tc.ctx);
      if (c) expect(catalogIds.has(c.id)).toBe(true);
    }
  });
});
