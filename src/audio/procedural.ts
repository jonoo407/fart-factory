import { isChannelAudible } from './audio-settings';
import {
  loadManifest,
  pickSampleId,
  playSample,
  playGridClip,
  type SliderConfig,
} from './sample-player';
import { resolveFart } from './fart-select';
import type { FoodProperties } from '../state/food';

let audioCtx: AudioContext | null = null;
let samplePathTried = false;
let manifestReady: Awaited<ReturnType<typeof loadManifest>> = null;

// Eagerly start manifest load on module init — so first Launch can use samples
// without a 100-200ms fetch delay. Cache hit on subsequent loads.
function ensureManifestLoading(): void {
  if (manifestReady !== null || samplePathTried) return;
  samplePathTried = true;
  void loadManifest().then((m) => {
    manifestReady = m;
  });
}
ensureManifestLoading();

export interface FartSchedule {
  cuePresent: boolean;
  cueDurationMs: number;
  mainStartOffsetMs: number;
  mainDurationMs: number;
}

let lastSchedule: FartSchedule | null = null;
export function getLastFartSchedule(): FartSchedule | null {
  return lastSchedule;
}

function ensureAudio(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

export function suspendAudio(): void {
  if (audioCtx && audioCtx.state === 'running') void audioCtx.suspend();
}

export function resumeAudio(): void {
  if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume();
}

/**
 * One-time audio unlock on the first user interaction. Browsers create an
 * AudioContext in the 'suspended' state and only allow resume() inside a user
 * gesture; we previously resumed ONLY on tab-visibility and the mute toggle, so
 * on stricter browsers (notably iOS Safari) the context the first Launch
 * created stayed suspended and every scheduled sound — fart included — was
 * silent. Creating the context here also means pre-Launch cues (the audience
 * signature on load, food-eating sounds) are no longer dropped by
 * getAudioContext() returning null. Idempotent: unbinds after the first gesture.
 */
export function wireAudioUnlock(target: Pick<Document, 'addEventListener' | 'removeEventListener'> = document): void {
  const events = ['pointerdown', 'keydown', 'touchstart'] as const;
  const unlock = (): void => {
    const ctx = ensureAudio();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    for (const ev of events) target.removeEventListener(ev, unlock);
  };
  for (const ev of events) target.addEventListener(ev, unlock);
}

/**
 * Anticipation cue oscillator — shared between sample-path and procedural-
 * only paths in playFart. 150ms triangle-wave rumble below the main fart's
 * frequency range, with a soft attack/decay envelope.
 */
function schedulCue(
  ctx: AudioContext,
  cueStart: number,
  cueDur: number,
  temp: number,
  volume: number,
): void {
  const cueGain = ctx.createGain();
  cueGain.gain.value = 0.04 + volume * 0.015;
  cueGain.connect(ctx.destination);
  const cueOsc = ctx.createOscillator();
  cueOsc.type = 'triangle';
  const cueFreq = 35 + temp * 3;
  cueOsc.frequency.setValueAtTime(cueFreq, cueStart);
  cueOsc.frequency.linearRampToValueAtTime(cueFreq + 8, cueStart + cueDur);
  cueGain.gain.setValueAtTime(0.001, cueStart);
  cueGain.gain.linearRampToValueAtTime(0.04 + volume * 0.015, cueStart + cueDur * 0.6);
  cueGain.gain.linearRampToValueAtTime(0.001, cueStart + cueDur);
  cueOsc.connect(cueGain);
  cueOsc.start(cueStart);
  cueOsc.stop(cueStart + cueDur);
}

// QUALITY-LEGACY: playFart is dense procedural-audio scheduling — branching
// reflects per-slider effect toggles rather than business logic. Refactoring
// to ≤10 complexity would shatter the natural fart-anatomy reading order.
// Captured as follow-up; do not let this disable creep further.
// eslint-disable-next-line complexity, max-lines-per-function
export function playFart(
  length: number,
  wetness: number,
  volume: number,
  stinkiness: number,
  temp: number,
  musical: number,
  rawProps?: FoodProperties,
): number {
  if (!isChannelAudible('farts')) return 0;
  const ctx = ensureAudio();
  if (!ctx) return 0;

  // THE fart bank (rebuilt). When the caller supplies the plate's raw props,
  // pick ONE pre-baked grid clip that matches the recipe (no live layering) and
  // play it after the procedural anticipation cue. This is the primary launch
  // path; the sample/procedural branches below are fallbacks for callers
  // that don't pass props (the belly-tap easter egg).
  if (rawProps) {
    const cueDur = 0.15;
    const cueGap = 0.05;
    const cueStart = ctx.currentTime;
    const mainStartAt = cueStart + cueDur + cueGap;
    schedulCue(ctx, cueStart, cueDur, temp, volume);
    const { clipId, gain, durationSeconds } = resolveFart(rawProps);
    void playGridClip(ctx, clipId, mainStartAt, gain);
    lastSchedule = {
      cuePresent: true,
      cueDurationMs: Math.round(cueDur * 1000),
      mainStartOffsetMs: Math.round((cueDur + cueGap) * 1000),
      mainDurationMs: Math.round(durationSeconds * 1000),
    };
    return cueDur + cueGap + durationSeconds;
  }

  // Sample-bank path: if the manifest is loaded, schedule the cue
  // (procedural — keeps comic timing) AND play the sample for the main hit.
  // Falls through to the procedural-only path below if no manifest entry
  // matches or decoding fails.
  if (manifestReady) {
    const cfg: SliderConfig = { length, wetness, volume, stinkiness, temp, musical };
    const id = pickSampleId(cfg, manifestReady);
    if (id) {
      const cueDur = 0.15;
      const cueGap = 0.05;
      const cueStart = ctx.currentTime;
      const mainStartAt = cueStart + cueDur + cueGap;
      // Anticipation cue (procedural — same shape as the no-sample path).
      schedulCue(ctx, cueStart, cueDur, temp, volume);
      void playSample(ctx, manifestReady, id, mainStartAt, volume);
      lastSchedule = {
        cuePresent: true,
        cueDurationMs: Math.round(cueDur * 1000),
        mainStartOffsetMs: Math.round((cueDur + cueGap) * 1000),
        // Estimate from manifest entry; close enough for tests.
        mainDurationMs: manifestReady.entries.find((e) => e.id === id)?.durationMs ?? 1000,
      };
      return (cueDur + cueGap) + (manifestReady.entries.find((e) => e.id === id)?.durationMs ?? 1000) / 1000;
    }
  }

  // Comic-timing anticipation cue + procedural-only main fart path
  // (no sample available). Per AUDIO_CRITIC.md §A24 (Brooks/Neale/Krutnik
  // on set-up + payoff structure).
  const cueDur = 0.15;
  const cueGap = 0.05;
  const mainOffset = cueDur + cueGap; // 0.20s before the main hit
  const dur = 0.3 + length * 0.25;
  const startedAt = ctx.currentTime;
  const now = startedAt + mainOffset;

  schedulCue(ctx, startedAt, cueDur, temp, volume);

  const master = ctx.createGain();
  master.gain.value = 0.15 + volume * 0.07;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const baseFreq = 40 + temp * 8 - wetness * 3;
  osc.frequency.setValueAtTime(baseFreq, now);
  const bends = 2 + Math.floor(musical * 1.5);
  for (let i = 0; i < bends; i++) {
    const t = now + dur * (i / bends);
    const f = baseFreq + Math.random() * 60 - 30 + (musical > 5 ? Math.sin(i * 2) * 30 : 0);
    osc.frequency.linearRampToValueAtTime(Math.max(20, f), t);
  }
  osc.frequency.linearRampToValueAtTime(baseFreq - 20, now + dur);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 200 + volume * 80 + temp * 30;
  lp.Q.value = 2 + wetness * 0.8;
  osc.connect(lp);
  lp.connect(master);
  osc.start(now);
  osc.stop(now + dur);

  if (wetness > 3 || stinkiness > 5) {
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (wetness / 15);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 150 + stinkiness * 40;
    bp.Q.value = 1 + wetness * 0.3;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.1 + wetness * 0.04;
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(master);
    noise.start(now);
    noise.stop(now + dur);
  }

  if (musical > 4) {
    for (let h = 0; h < Math.min(musical - 3, 4); h++) {
      const ho = ctx.createOscillator();
      ho.type = h % 2 === 0 ? 'sine' : 'triangle';
      ho.frequency.value = baseFreq * (h + 2) + (musical > 7 ? Math.sin(h) * 50 : 0);
      const hg = ctx.createGain();
      hg.gain.value = 0.02 + musical * 0.005;
      ho.connect(hg);
      hg.connect(master);
      ho.start(now + h * 0.08);
      ho.stop(now + dur - 0.1);
    }
  }

  if (length > 6) {
    for (let i = 0; i < 3; i++) {
      const sp = ctx.createOscillator();
      sp.type = 'square';
      sp.frequency.value = 60 + Math.random() * 40;
      const sg = ctx.createGain();
      sg.gain.value = 0.05;
      sp.connect(sg);
      sg.connect(master);
      sp.start(now + dur + i * 0.12);
      sp.stop(now + dur + i * 0.12 + 0.08);
    }
  }

  master.gain.linearRampToValueAtTime(0, now + dur + 0.5);

  lastSchedule = {
    cuePresent: true,
    cueDurationMs: Math.round(cueDur * 1000),
    mainStartOffsetMs: Math.round(mainOffset * 1000),
    mainDurationMs: Math.round(dur * 1000),
  };

  return dur + mainOffset;
}

/**
 * Non-diegetic celebration sting (audio principle A27 — Collins/Grimshaw on
 * sound from outside the world commenting on it). Plays a brief major-triad
 * arpeggio when the player nails a 100% match. NOT muted by mute toggle —
 * wait, yes it IS, since mute is a global gesture: if the user is muted,
 * everything is silent. Subject to visibilitychange suspend.
 */
export function playCelebrationSting(): number {
  if (!isChannelAudible('sfx')) return 0;
  const ctx = ensureAudio();
  if (!ctx) return 0;
  const now = ctx.currentTime;
  // Major triad up-arpeggio (C5 / E5 / G5 / C6) at 80ms intervals, 200ms decay.
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const noteDur = 0.25;
  const stride = 0.08;
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    osc.type = i === notes.length - 1 ? 'sine' : 'triangle';
    osc.frequency.value = notes[i]!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + i * stride);
    g.gain.exponentialRampToValueAtTime(0.5, now + i * stride + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * stride + noteDur);
    osc.connect(g);
    g.connect(master);
    osc.start(now + i * stride);
    osc.stop(now + i * stride + noteDur + 0.02);
  }
  return notes.length * stride + noteDur;
}
