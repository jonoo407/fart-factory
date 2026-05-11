import { describe, it, expect } from 'vitest';
import {
  bandForUses,
  barCountFor,
  visibleAxes,
  fauxScientificText,
  type Band,
} from '../../src/scoring/field-guide';
import { getFood } from '../../src/state/food';

/**
 * V8 T4 — Field Guide (mastery-gated reveal, Scheme 2).
 *
 * Each food's entry reveals progressively by use count:
 *   - mystery (0 uses):     0 bars — emoji + name only
 *   - hunch (1-9):          1 bar  — highest axis
 *   - apprentice (10-24):   3 bars
 *   - adept (25-49):        5 bars
 *   - master (50+):         7 bars (everything)
 *
 * `visibleAxes` returns the food's top-N axes (sorted by property value,
 * alphabetical tie-break for determinism).
 *
 * `fauxScientificText` returns a faux-scientific blurb appropriate to
 * the band. Empty bands ("mystery") still return a non-empty string —
 * the player should always see *some* text.
 */

describe('field-guide bands (V8 T4)', () => {
  it('bandForUses returns the correct band for thresholds', () => {
    expect(bandForUses(0)).toBe('mystery');
    expect(bandForUses(1)).toBe('hunch');
    expect(bandForUses(9)).toBe('hunch');
    expect(bandForUses(10)).toBe('apprentice');
    expect(bandForUses(24)).toBe('apprentice');
    expect(bandForUses(25)).toBe('adept');
    expect(bandForUses(49)).toBe('adept');
    expect(bandForUses(50)).toBe('master');
    expect(bandForUses(1000)).toBe('master');
  });

  it('barCountFor: mystery=0, hunch=1, apprentice=3, adept=5, master=7', () => {
    expect(barCountFor('mystery')).toBe(0);
    expect(barCountFor('hunch')).toBe(1);
    expect(barCountFor('apprentice')).toBe(3);
    expect(barCountFor('adept')).toBe(5);
    expect(barCountFor('master')).toBe(7);
  });
});

describe('visibleAxes (V8 T4)', () => {
  it('returns N axes sorted by property value (desc), alpha tie-break', () => {
    const beans = getFood('beans')!;
    // beans: wet:3, stink:3, loud:2, length:3, temp:1, dry:0, musical:0
    // Three-way tie at 3 (wet, stink, length) → alpha: length, stink, wet
    const top3 = visibleAxes(beans, 'apprentice');
    expect(top3).toHaveLength(3);
    expect(top3.slice(0, 3).sort()).toEqual(['length', 'stink', 'wet']);
  });

  it('mystery returns empty array', () => {
    const beans = getFood('beans')!;
    expect(visibleAxes(beans, 'mystery')).toEqual([]);
  });

  it('master returns all 7 axes', () => {
    const beans = getFood('beans')!;
    const list = visibleAxes(beans, 'master');
    expect(list).toHaveLength(7);
    expect([...list].sort()).toEqual(['dry', 'length', 'loud', 'musical', 'stink', 'temp', 'wet']);
  });

  it('hunch returns the single highest axis', () => {
    const garlic = getFood('garlic')!;
    // garlic: stink:5 (highest), temp:3, length:3, dry:2, loud:1, wet:0, musical:0
    const top1 = visibleAxes(garlic, 'hunch');
    expect(top1).toEqual(['stink']);
  });
});

describe('fauxScientificText (V8 T4)', () => {
  it('always returns a non-empty string', () => {
    const beans = getFood('beans')!;
    const bands: Band[] = ['mystery', 'hunch', 'apprentice', 'adept', 'master'];
    for (const b of bands) {
      const text = fauxScientificText(beans, b);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('mystery text signals "untested" / "unknown"', () => {
    const beans = getFood('beans')!;
    const text = fauxScientificText(beans, 'mystery');
    expect(text).toMatch(/untested|unknown|mystery|untouched|study|trial/i);
  });

  it('master text uses the food description if present', () => {
    const beans = getFood('beans')!;
    // beans.description: 'The classic. Wet and stinky.'
    const text = fauxScientificText(beans, 'master');
    expect(text.toLowerCase()).toContain('classic');
  });

  it('hunch text mentions trials / observations', () => {
    const beans = getFood('beans')!;
    const text = fauxScientificText(beans, 'hunch');
    expect(text).toMatch(/trial|observ|noticed|study|early/i);
  });
});
