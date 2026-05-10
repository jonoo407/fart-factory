import { loadMuted } from './mute';

let audioCtx: AudioContext | null = null;

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

export function playFart(
  length: number,
  wetness: number,
  volume: number,
  stinkiness: number,
  temp: number,
  musical: number,
): number {
  if (loadMuted()) return 0;
  const ctx = ensureAudio();
  if (!ctx) return 0;
  // Comic-timing anticipation cue: a low-amplitude rumble for ~150ms,
  // followed by ~50ms of silence, then the main fart. Per AUDIO_CRITIC.md
  // §A24 (Brooks/Neale/Krutnik on set-up + payoff structure).
  const cueDur = 0.15;
  const cueGap = 0.05;
  const mainOffset = cueDur + cueGap; // 0.20s before the main hit
  const dur = 0.3 + length * 0.25;
  const startedAt = ctx.currentTime;
  const cueStart = startedAt;
  const now = startedAt + mainOffset;

  // Anticipation cue oscillator — quieter, lower frequency than main.
  const cueGain = ctx.createGain();
  cueGain.gain.value = 0.04 + volume * 0.015; // softer than main
  cueGain.connect(ctx.destination);
  const cueOsc = ctx.createOscillator();
  cueOsc.type = 'triangle';
  const cueFreq = 35 + temp * 3; // sits below the main baseFreq
  cueOsc.frequency.setValueAtTime(cueFreq, cueStart);
  // Slight rise during the cue to imply "build-up."
  cueOsc.frequency.linearRampToValueAtTime(cueFreq + 8, cueStart + cueDur);
  cueGain.gain.setValueAtTime(0.001, cueStart);
  cueGain.gain.linearRampToValueAtTime(0.04 + volume * 0.015, cueStart + cueDur * 0.6);
  cueGain.gain.linearRampToValueAtTime(0.001, cueStart + cueDur);
  cueOsc.connect(cueGain);
  cueOsc.start(cueStart);
  cueOsc.stop(cueStart + cueDur);

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
  if (loadMuted()) return 0;
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
