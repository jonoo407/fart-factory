/**
 * Cleanup #3 — the charge-up sings. While the BLAST button is held, the meter
 * sweeps 0→100→0; this module turns that value into a pitch so you HEAR the
 * wind-up rise and fall in your hand. Like pinching a balloon neck: more charge,
 * higher squeak.
 *
 * `chargeToneFrequency` is the pure mapping (unit-tested). `startChargeTone`
 * is the WebAudio glue — a single oscillator whose frequency tracks the meter
 * until release, verified in the browser. Routed through the SFX channel and
 * silent when audio is muted / the context isn't unlocked yet.
 */
import { isChannelAudible, effectiveVolume } from './audio-settings';
import { getAudioContext } from './procedural';

// ~2.4 octaves of travel — a clear, playful sweep without getting shrill.
export const CHARGE_TONE_MIN_HZ = 140;
export const CHARGE_TONE_MAX_HZ = 740;

// Ready ping: the meter sweeps 0→100→0 with nothing marking the top, so a tiny
// bright tick fires when the charge crosses this threshold going UP — a timing
// cue for releasing at the peak. Cooldown stops it from machine-gunning when
// the sweep oscillates around the top.
export const CHARGE_READY_THRESHOLD = 95;
export const CHARGE_READY_COOLDOWN_S = 0.3;

/** True only on an upward crossing of the ready threshold. */
export function chargeReadyCrossing(prev: number, value: number): boolean {
  return prev < CHARGE_READY_THRESHOLD && value >= CHARGE_READY_THRESHOLD;
}

/** Map a 0–100 charge value to a pitch. Exponential so the rise sounds even. */
export function chargeToneFrequency(value: number): number {
  const t = Math.max(0, Math.min(100, value)) / 100;
  return CHARGE_TONE_MIN_HZ * Math.pow(CHARGE_TONE_MAX_HZ / CHARGE_TONE_MIN_HZ, t);
}

export interface ChargeTone {
  /** Re-aim the pitch at the current meter value (call every frame). */
  update(value: number): void;
  /** Fade out and stop (call on release / teardown). Idempotent. */
  stop(): void;
}

const SILENT: ChargeTone = { update: () => {}, stop: () => {} };

/**
 * Begin the charge tone. Returns a controller; if audio is unavailable (muted,
 * SFX channel off, or no unlocked AudioContext) it's a no-op controller so the
 * caller never has to branch.
 */
/** One short bright tick — sits just above the tone's ceiling so it cuts through. */
function playReadyPing(ctx: AudioContext, tonePeak: number): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1568, t); // G6 — bright, not shrill
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(tonePeak * 1.6, t + 0.01);
  g.gain.linearRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}

export function startChargeTone(): ChargeTone {
  const ctx = getAudioContext();
  if (!ctx || !isChannelAudible('sfx')) return SILENT;

  const peak = 0.05 * (effectiveVolume('sfx') / 100);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth'; // buzzy, building-pressure timbre — on theme
  osc.frequency.setValueAtTime(chargeToneFrequency(0), ctx.currentTime);

  // A gentle lowpass keeps the sawtooth from getting harsh as the pitch climbs.
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  lp.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.05); // soft attack, no click

  osc.connect(lp);
  lp.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  let stopped = false;
  let prevValue = 0;
  let lastPingAt = -Infinity;
  return {
    update(value: number): void {
      if (stopped) return;
      // setTargetAtTime glides toward the new pitch so the sweep is smooth, not steppy.
      osc.frequency.setTargetAtTime(chargeToneFrequency(value), ctx.currentTime, 0.02);
      if (chargeReadyCrossing(prevValue, value) && ctx.currentTime - lastPingAt >= CHARGE_READY_COOLDOWN_S) {
        lastPingAt = ctx.currentTime;
        playReadyPing(ctx, peak);
      }
      prevValue = value;
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(peak, t);
      gain.gain.linearRampToValueAtTime(0.0001, t + 0.08); // quick fade — no pop
      osc.stop(t + 0.1);
    },
  };
}
