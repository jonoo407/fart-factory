import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { chargeBreakdownLine } from '../../src/ui/plate';
import { CHARGE } from '../../src/scoring/tuning';

// Bug: the reaction breakdown labeled ANY quality > 1 as "Perfect charge", so a
// GOOD release (x1.10) read identical to a true sweet-zone PERFECT (x1.25) —
// erasing the skill signal the charge meter teaches.
describe('chargeBreakdownLine labels by charge zone, not just >1', () => {
  it('a sweet-zone PERFECT charge reads "Perfect charge"', () => {
    expect(chargeBreakdownLine(CHARGE.perfect)?.label).toBe('Perfect charge');
  });
  it('a GOOD charge reads "Good charge" (was mislabeled Perfect)', () => {
    expect(chargeBreakdownLine(CHARGE.good)?.label).toBe('Good charge');
  });
  it('a WEAK charge reads "Weak charge"', () => {
    expect(chargeBreakdownLine(CHARGE.weak)?.label).toBe('Weak charge');
  });
  it('a safe tap / ok (x1.0) adds no charge line', () => {
    expect(chargeBreakdownLine(CHARGE.ok)).toBeNull();
    expect(chargeBreakdownLine(CHARGE.tap)).toBeNull();
  });
});
