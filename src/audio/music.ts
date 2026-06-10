/// <reference types="vite/client" />
/**
 * Background music (sound overhaul) — two ~20s ambient loops through the
 * until-now-unused Music channel:
 *   lab  → the main performance screen (playful, mellow)
 *   boss → the boss arena (tense, still goofy)
 *
 * Design constraints:
 *  - LOW: base gain 0.22 scaled by the Music channel (default 100). Music sets
 *    mood UNDER the comedy; the fart is the readout.
 *  - SILENT during the launch arc: held while the charge sweep plays
 *    (holdMusic/releaseMusic) and ducked to ZERO for the timed
 *    fart → reaction → voice window (duckMusic + performanceWindowMs). Music
 *    plays only between performances / while navigating the UI.
 *  - Manifest-free: loads sfx/<id>.mp3 directly and no-ops on 404/decode
 *    failure, so the game ships safely before the loops are generated.
 *  - Starts only when a context exists (post-gesture; see onAudioUnlocked).
 */

import { getAudioContext } from './procedural';
import { effectiveVolume } from './audio-settings';

export const MUSIC_BASE_GAIN = 0.22;
/** Overhaul v2: music doesn't duck under the performance — it goes SILENT.
 *  The fart launch arc (charge → fart → reaction → voice) owns the room;
 *  music only plays between performances / while navigating the UI. */
export const MUSIC_DUCK_FACTOR = 0;
const FADE_S = 0.4;

export const MUSIC_TRACKS = {
  lab: 'music-lab-loop',
  boss: 'music-boss-loop',
} as const;
export type MusicTrack = keyof typeof MUSIC_TRACKS;

interface Playing {
  track: MusicTrack;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

let playing: Playing | null = null;
let ducked = false;
let holdCount = 0;
let duckTimer: ReturnType<typeof setTimeout> | null = null;
const bufferCache = new Map<string, AudioBuffer>();

/** Current loop gain target: low base × Music channel — and 0 (silent) while
 *  ducked (timed launch window) or held (charge sweep in progress). */
export function musicGainValue(): number {
  const v = MUSIC_BASE_GAIN * (effectiveVolume('music') / 100);
  return ducked || holdCount > 0 ? v * MUSIC_DUCK_FACTOR : v;
}

/**
 * Hold the music silent for as long as a launch-arc sound is live with no
 * fixed end time — the charge sweep (player holds the button). Counted, so
 * overlapping holds can't release each other early; the launch that follows
 * release re-silences via duckMusic for the precise post-launch window.
 */
export function holdMusic(): void {
  holdCount++;
  refreshMusicGain();
}

export function releaseMusic(): void {
  holdCount = Math.max(0, holdCount - 1);
  refreshMusicGain();
}

export function currentMusicTrack(): MusicTrack | null {
  return playing?.track ?? null;
}

async function loadBuffer(ctx: AudioContext, clipId: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(clipId);
  if (cached) return cached;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}sfx/${clipId}.mp3`);
    if (!res.ok) return null;
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    bufferCache.set(clipId, buf);
    return buf;
  } catch {
    return null;
  }
}

function fadeOutAndStop(ctx: AudioContext, p: Playing): void {
  try {
    p.gain.gain.cancelScheduledValues(ctx.currentTime);
    p.gain.gain.setValueAtTime(p.gain.gain.value, ctx.currentTime);
    p.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + FADE_S);
  } catch {
    // fake/teardown contexts may lack scheduling — stopping below still works
  }
  setTimeout(() => {
    try {
      p.source.stop();
    } catch {
      // already stopped
    }
  }, FADE_S * 1000 + 50);
}

/**
 * Start (or switch to) a loop. Resolves true when the loop is playing.
 * False: no context yet (pre-gesture) or the asset isn't shipped/decodable.
 */
export async function startMusic(track: MusicTrack): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (playing?.track === track) {
    refreshMusicGain();
    return true;
  }
  const buf = await loadBuffer(ctx, MUSIC_TRACKS[track]);
  if (!buf) return false;
  if (playing) fadeOutAndStop(ctx, playing);
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = musicGainValue();
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  playing = { track, source, gain };
  return true;
}

export function stopMusic(): void {
  const ctx = getAudioContext();
  if (playing && ctx) fadeOutAndStop(ctx, playing);
  playing = null;
}

/** Re-aim the playing loop at the current settings (call after slider moves). */
export function refreshMusicGain(): void {
  const ctx = getAudioContext();
  if (!playing || !ctx) return;
  try {
    playing.gain.gain.cancelScheduledValues(ctx.currentTime);
    playing.gain.gain.setTargetAtTime(musicGainValue(), ctx.currentTime, 0.05);
  } catch {
    playing.gain.gain.value = musicGainValue();
  }
}

/**
 * Duck the loop for the launch window (seconds), then restore. Re-ducking
 * extends the window — each fart resets the restore timer.
 */
export function duckMusic(durationS: number): void {
  if (!playing) return;
  ducked = true;
  refreshMusicGain();
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    ducked = false;
    duckTimer = null;
    refreshMusicGain();
  }, Math.max(0, durationS * 1000));
}

/** Test-only: drop all module state. */
export function _resetMusicForTests(): void {
  playing = null;
  ducked = false;
  holdCount = 0;
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = null;
  bufferCache.clear();
}
