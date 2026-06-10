import { describe, it, expect, beforeEach } from 'vitest';
import {
  chargeToneFrequency,
  chargeReadyCrossing,
  CHARGE_TONE_MIN_HZ,
  CHARGE_TONE_MAX_HZ,
  CHARGE_READY_THRESHOLD,
  CHARGE_READY_COOLDOWN_S,
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

/**
 * Sound overhaul: the meter sweeps 0→100→0 with nothing marking the top. The
 * ready ping is a tiny bright tick when the charge crosses the threshold going
 * UP — a timing cue for releasing at the peak. Pure crossing predicate here;
 * the ping scheduling is exercised through the controller below.
 */
describe('chargeReadyCrossing', () => {
  it('fires only on an upward crossing of the threshold', () => {
    expect(chargeReadyCrossing(90, 96)).toBe(true);
    expect(chargeReadyCrossing(CHARGE_READY_THRESHOLD - 1, CHARGE_READY_THRESHOLD)).toBe(true);
  });

  it('does not fire while staying above, staying below, or crossing downward', () => {
    expect(chargeReadyCrossing(96, 99)).toBe(false);  // already above
    expect(chargeReadyCrossing(50, 80)).toBe(false);  // still below
    expect(chargeReadyCrossing(98, 60)).toBe(false);  // sweeping back down
  });
});

// ---- controller integration: ping scheduling through a fake AudioContext ----

class FakeParam {
  value = 0;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
  setTargetAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = '';
  Q = new FakeParam();
  connect(): void {}
  start(): void {}
  stop(): void {}
}
let oscCount = 0;
class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';
  createGain(): FakeNode { return new FakeNode(); }
  createBiquadFilter(): FakeNode { return new FakeNode(); }
  createOscillator(): FakeNode { oscCount++; return new FakeNode(); }
  resume(): Promise<void> { return Promise.resolve(); }
  suspend(): Promise<void> { return Promise.resolve(); }
}

describe('charge tone ready ping (controller)', () => {
  let ctx: FakeAudioContext;

  beforeEach(async () => {
    localStorage.clear();
    oscCount = 0;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    // Create the module-level context (charge-tone reuses it via getAudioContext).
    const { playCelebrationSting, getAudioContext } = await import('../../src/audio/procedural');
    playCelebrationSting();
    ctx = getAudioContext() as unknown as FakeAudioContext;
    oscCount = 0;
  });

  it('pings once when the sweep crosses the threshold, not again while held above', async () => {
    const { startChargeTone } = await import('../../src/audio/charge-tone');
    const tone = startChargeTone();
    expect(oscCount).toBe(1); // the charge tone itself
    tone.update(50);
    tone.update(90);
    expect(oscCount).toBe(1); // below threshold — no ping
    tone.update(97);
    expect(oscCount).toBe(2); // crossed → ping
    tone.update(99);
    tone.update(100);
    expect(oscCount).toBe(2); // still above — no re-ping
    tone.stop();
  });

  it('re-pings on the next upward sweep only after the cooldown', async () => {
    const { startChargeTone } = await import('../../src/audio/charge-tone');
    const tone = startChargeTone();
    tone.update(97);
    expect(oscCount).toBe(2);
    // Sweep back down and instantly up again — inside the cooldown window.
    tone.update(40);
    tone.update(98);
    expect(oscCount).toBe(2);
    // After the cooldown the next crossing pings again.
    ctx.currentTime += CHARGE_READY_COOLDOWN_S + 0.01;
    tone.update(40);
    tone.update(98);
    expect(oscCount).toBe(3);
    tone.stop();
  });
});
