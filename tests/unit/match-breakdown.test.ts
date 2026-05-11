import { describe, it, expect } from 'vitest';
import { computeMatchBreakdown } from '../../src/scoring/match';
import type { FoodProperties } from '../../src/state/food';

const zero: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };

describe('computeMatchBreakdown (T1.1)', () => {
  it('returns one entry per axis (7 total)', () => {
    const b = computeMatchBreakdown(zero, zero);
    expect(b).toHaveLength(7);
  });

  it('matched axis has cost=0 + matched=true', () => {
    const b = computeMatchBreakdown({ ...zero, stink: 3 }, { ...zero, stink: 3 });
    const stinkRow = b.find((r) => r.axis === 'stink')!;
    expect(stinkRow.cost).toBe(0);
    expect(stinkRow.matched).toBe(true);
    expect(stinkRow.actual).toBe(3);
    expect(stinkRow.target).toBe(3);
  });

  it('within-1 difference is still matched (tolerant L1)', () => {
    const b = computeMatchBreakdown({ ...zero, stink: 4 }, { ...zero, stink: 3 });
    expect(b.find((r) => r.axis === 'stink')!.matched).toBe(true);
  });

  it('diff > 1 contributes positive cost', () => {
    const b = computeMatchBreakdown({ ...zero, stink: 5 }, { ...zero, stink: 1 });
    const row = b.find((r) => r.axis === 'stink')!;
    expect(row.cost).toBe(3); // |5-1|-1 = 3
    expect(row.matched).toBe(false);
  });

  it('every entry has axis + actual + target + cost + matched', () => {
    const b = computeMatchBreakdown(zero, zero);
    for (const row of b) {
      expect(typeof row.axis).toBe('string');
      expect(typeof row.actual).toBe('number');
      expect(typeof row.target).toBe('number');
      expect(typeof row.cost).toBe('number');
      expect(typeof row.matched).toBe('boolean');
    }
  });
});
