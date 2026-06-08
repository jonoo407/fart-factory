import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveEquippedLaunch,
  equippedToTreatments,
} from '../../src/scoring/launch-resolver';
import { savePantry } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
  savePantry(['beans', 'cheese']);
});

/**
 * PLAN v9 Phase 6 — single-equip Kitchen. ONE equipped treatment applies to
 * EVERY plated food at launch (replacing the old per-slot prep-table model).
 * `resolveEquippedLaunch(ids, equipped)` is the single seam the launch handler
 * uses; it expands the one equipped id to a per-food array and delegates to
 * the existing `resolveLaunchProps`.
 */

describe('equippedToTreatments — expand one equipped id to a per-food array', () => {
  it('null equipped → empty array (raw launch)', () => {
    expect(equippedToTreatments(null, 3)).toEqual([]);
  });

  it("'raw' equipped → empty array (identity = no treatment)", () => {
    expect(equippedToTreatments('raw', 3)).toEqual([]);
  });

  it('unknown id → empty array (safety fallback)', () => {
    expect(equippedToTreatments('bogus', 2)).toEqual([]);
  });

  it('a real treatment → that id repeated once per food', () => {
    expect(equippedToTreatments('roast', 3)).toEqual(['roast', 'roast', 'roast']);
  });

  it('count 0 → empty array even for a real treatment', () => {
    expect(equippedToTreatments('roast', 0)).toEqual([]);
  });
});

describe('resolveEquippedLaunch — equipped treatment reaches scoring (P6)', () => {
  it('no equipped treatment → raw path, usedTreatments false', () => {
    const result = resolveEquippedLaunch(['beans', 'cheese'], null);
    expect(result.usedTreatments).toBe(false);
    expect(result.props.stink).toBeGreaterThan(0);
  });

  it("'raw' equipped is treated as no treatment", () => {
    const result = resolveEquippedLaunch(['beans', 'cheese'], 'raw');
    expect(result.usedTreatments).toBe(false);
  });

  it('unknown equipped id falls back to raw (safety)', () => {
    const result = resolveEquippedLaunch(['beans'], 'bogus');
    expect(result.usedTreatments).toBe(false);
  });

  it('roast equipped raises stink vs raw (single food, unsaturated axis)', () => {
    const raw = resolveEquippedLaunch(['beans'], null);
    const roasted = resolveEquippedLaunch(['beans'], 'roast');
    expect(roasted.usedTreatments).toBe(true);
    expect(roasted.props.stink).toBeGreaterThan(raw.props.stink);
  });

  it('applies to EVERY plated food, not just the first', () => {
    // resolveLaunchProps only takes the prepped (treated) path when the
    // treatments array length === ingredient count. So usedTreatments===true on
    // a 2-food plate proves the equipped treatment was expanded to BOTH foods
    // (a single-treatment array would length-mismatch and fall back to raw).
    const roasted = resolveEquippedLaunch(['beans', 'cheese'], 'roast');
    expect(roasted.usedTreatments).toBe(true);
  });

  it('chill equipped raises loud vs raw', () => {
    const raw = resolveEquippedLaunch(['beans'], null);
    const chilled = resolveEquippedLaunch(['beans'], 'chill');
    expect(chilled.usedTreatments).toBe(true);
    expect(chilled.props.loud).toBeGreaterThan(raw.props.loud);
  });

  it('empty plate returns zero properties', () => {
    const result = resolveEquippedLaunch([], 'roast');
    expect(result.props.stink).toBe(0);
    expect(result.usedTreatments).toBe(false);
  });
});
