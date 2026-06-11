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
  // The Danger Zone's ×1.0–1.5 range OVERLAPS the perfect threshold, so the
  // zone label must come from the meter, not be inferred from the multiplier.
  it('a survived overcharge reads "Overcharged!" at any depth', () => {
    expect(chargeBreakdownLine(1.5, 'overcharge')?.label).toBe('Overcharged!');
    expect(chargeBreakdownLine(1.0, 'overcharge')?.label).toBe('Overcharged!');
  });
  it('without the meter label, x1.5 would read as a Perfect charge (overlap proof)', () => {
    expect(chargeBreakdownLine(1.5)?.label).toBe('Perfect charge');
  });
});
