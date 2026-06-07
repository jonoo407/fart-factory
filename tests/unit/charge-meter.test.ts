import { describe, it, expect } from 'vitest';
import { chargeQuality } from '../../src/scoring/charge';

/**
 * PLAN v9 P1 — pure port of the prototype BlastButton release logic
 * (ff-components.jsx:139-153). Evaluation order matters: a sub-200ms release
 * short-circuits to a safe tap regardless of the sweep value.
 */
describe('chargeQuality', () => {
  it('a quick tap (<200ms) is always a safe 1.0, whatever the sweep value', () => {
    expect(chargeQuality(88, 150)).toEqual({ quality: 1.0, label: 'tap' });
    expect(chargeQuality(10, 50)).toEqual({ quality: 1.0, label: 'tap' });
    expect(chargeQuality(83, 199)).toEqual({ quality: 1.0, label: 'tap' });
  });

  it('release in the sweet zone 74-92 is a perfect 1.25', () => {
    expect(chargeQuality(74, 800)).toEqual({ quality: 1.25, label: 'perfect' });
    expect(chargeQuality(83, 800)).toEqual({ quality: 1.25, label: 'perfect' });
    expect(chargeQuality(92, 800)).toEqual({ quality: 1.25, label: 'perfect' });
  });

  it('the near zone 62-98 (outside sweet) is a good 1.10', () => {
    expect(chargeQuality(62, 800)).toEqual({ quality: 1.1, label: 'good' });
    expect(chargeQuality(70, 800)).toEqual({ quality: 1.1, label: 'good' }); // 62..73
    expect(chargeQuality(98, 800)).toEqual({ quality: 1.1, label: 'good' }); // 93..98
  });

  it('a very low release (<28) is a weak 0.85', () => {
    expect(chargeQuality(27, 800)).toEqual({ quality: 0.85, label: 'weak' });
    expect(chargeQuality(0, 800)).toEqual({ quality: 0.85, label: 'weak' });
  });

  it('the dead zone (28-61) is a neutral 1.0 ok', () => {
    expect(chargeQuality(40, 800)).toEqual({ quality: 1.0, label: 'ok' });
    expect(chargeQuality(61, 800)).toEqual({ quality: 1.0, label: 'ok' });
  });

  it('boundaries: 28 is ok (weak is strictly <28); 73 is good not perfect; 99 is ok', () => {
    expect(chargeQuality(28, 800).label).toBe('ok');
    expect(chargeQuality(73, 800).label).toBe('good');
    expect(chargeQuality(99, 800).label).toBe('ok');
  });
});
