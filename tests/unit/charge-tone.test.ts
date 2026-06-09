import { describe, it, expect } from 'vitest';
import {
  chargeToneFrequency,
  CHARGE_TONE_MIN_HZ,
  CHARGE_TONE_MAX_HZ,
} from '../../src/audio/charge-tone';

/**
 * Cleanup #3 — the charge-up now sings. The meter sweeps 0→100→0 while held, so
 * the tone pitch must track the meter value: low when slack, high when wound up.
 * This is the pure mapping; the WebAudio oscillator that consumes it is verified
 * in the browser.
 */
describe('chargeToneFrequency', () => {
  it('maps an empty charge to the floor and a full charge to the ceiling', () => {
    expect(chargeToneFrequency(0)).toBeCloseTo(CHARGE_TONE_MIN_HZ);
    expect(chargeToneFrequency(100)).toBeCloseTo(CHARGE_TONE_MAX_HZ);
  });

  it('rises monotonically as the charge climbs (so it falls as it sweeps back down)', () => {
    expect(chargeToneFrequency(25)).toBeLessThan(chargeToneFrequency(50));
    expect(chargeToneFrequency(50)).toBeLessThan(chargeToneFrequency(75));
    expect(chargeToneFrequency(75)).toBeLessThan(chargeToneFrequency(100));
  });

  it('clamps out-of-range input to the floor/ceiling', () => {
    expect(chargeToneFrequency(-20)).toBeCloseTo(CHARGE_TONE_MIN_HZ);
    expect(chargeToneFrequency(140)).toBeCloseTo(CHARGE_TONE_MAX_HZ);
  });
});
