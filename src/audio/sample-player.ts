/// <reference types="vite/client" />
import { loadMuted } from './audio-settings';

/**
 * Sample-bank player that complements the procedural synth in
 * src/audio/procedural.ts. On Launch the orchestration layer first tries
 * playSampleForLaunch — if a manifest is loaded and a matching sample is
 * available, it decodes once + plays an AudioBufferSourceNode. Otherwise
 * the caller falls back to procedural synthesis.
 *
 * Audio rubric coverage: A14 buffer reuse / decode-once cache; A11 single-
 * AudioContext invariant (we accept the ctx from the caller); A3 decode
 * failure routes to fallback; A5 no-immediate-repeat via lastSelectedId.
 */

export interface ManifestEntry {
  id: string;
  name: string;
  prompt: string;
  durationMs: number;
  mood: string;
  file: string;
  bytes: number;
  checksum: string;
  proceduralFallback?: boolean;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  entries: ManifestEntry[];
}

let manifestCache: Manifest | null = null;
let manifestLoadPromise: Promise<Manifest | null> | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let lastSelectedId: string | null = null;

/** Where the bundled manifest lives at runtime. Vite's base is /fart-factory/. */
const MANIFEST_URL = `${import.meta.env.BASE_URL}sfx/manifest.json`;

export async function loadManifest(): Promise<Manifest | null> {
  if (manifestCache) return manifestCache;
  if (manifestLoadPromise) return manifestLoadPromise;
  manifestLoadPromise = (async () => {
    try {
      const res = await fetch(MANIFEST_URL);
      if (!res.ok) return null;
      const json = (await res.json()) as Manifest;
      if (!json || !Array.isArray(json.entries)) return null;
      manifestCache = json;
      return json;
    } catch {
      return null;
    }
  })();
  return manifestLoadPromise;
}

function bucketOf(durationMs: number): 'short' | 'medium' | 'long' {
  if (durationMs <= 800) return 'short';
  if (durationMs <= 1700) return 'medium';
  return 'long';
}

function bucketForLength(length: number): 'short' | 'medium' | 'long' {
  if (length <= 3) return 'short';
  if (length <= 7) return 'medium';
  return 'long';
}

export interface SliderConfig {
  length: number;
  wetness: number;
  volume: number;
  stinkiness: number;
  temp: number;
  musical: number;
}

/**
 * Picks a sample id whose duration bucket matches the requested length and
 * that wasn't the most recently played. Returns null if no shipped sample
 * matches (caller should fall back to procedural).
 */
export function pickSampleId(cfg: SliderConfig, manifest: Manifest): string | null {
  const targetBucket = bucketForLength(cfg.length);
  const candidates = manifest.entries.filter(
    (e) => !e.proceduralFallback && bucketOf(e.durationMs) === targetBucket && e.id !== lastSelectedId,
  );
  if (!candidates.length) {
    // Fall back to ANY non-fallback entry (shuffle-bag exhausted in bucket).
    const any = manifest.entries.filter((e) => !e.proceduralFallback && e.id !== lastSelectedId);
    if (!any.length) return null;
    const pick = any[Math.floor(Math.random() * any.length)]!;
    lastSelectedId = pick.id;
    return pick.id;
  }
  // Within-bucket weighted pick: prefer entries whose mood loosely matches
  // the slider config. This is intentionally simple — variety within bucket
  // is the main effect, weighting just biases toward fitting samples.
  const weighted = candidates.map((e) => ({ entry: e, weight: weightFor(e, cfg) }));
  const totalWeight = weighted.reduce((a, w) => a + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) {
      lastSelectedId = w.entry.id;
      return w.entry.id;
    }
  }
  const pick = weighted[0]!.entry;
  lastSelectedId = pick.id;
  return pick.id;
}

// Mood-based weighting table. Each rule says: "if mood matches AND
// pred(cfg) is true, add `bonus` to the weight." Baseline weight is 1.
// Pulled out of weightFor() to keep that function under complexity 10.
const MOOD_WEIGHTS: ReadonlyArray<{
  mood: ManifestEntry['mood'];
  pred: (c: SliderConfig) => boolean;
  bonus: number;
}> = [
  { mood: 'sneaky',      pred: (c) => c.volume <= 4,                 bonus: 2 },
  { mood: 'sneaky',      pred: (c) => c.stinkiness >= 7,              bonus: 1 },
  { mood: 'triumphant',  pred: (c) => c.volume >= 7,                  bonus: 2 },
  { mood: 'triumphant',  pred: (c) => c.length >= 7,                  bonus: 1 },
  { mood: 'comedic',     pred: () => true,                            bonus: 1 },
  { mood: 'embarrassed', pred: (c) => c.volume <= 4 && c.length <= 4, bonus: 2 },
  { mood: 'exhausted',   pred: (c) => c.length >= 8,                  bonus: 2 },
];

function weightFor(entry: ManifestEntry, cfg: SliderConfig): number {
  let w = 1;
  for (const rule of MOOD_WEIGHTS) {
    if (entry.mood === rule.mood && rule.pred(cfg)) w += rule.bonus;
  }
  return w;
}

async function decodeOnce(ctx: AudioContext, entry: ManifestEntry): Promise<AudioBuffer | null> {
  if (bufferCache.has(entry.id)) return bufferCache.get(entry.id)!;
  try {
    const url = `${import.meta.env.BASE_URL}sfx/${entry.file}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    bufferCache.set(entry.id, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * Plays the named sample through `ctx`. Returns the duration scheduled, or 0
 * if the sample isn't available (caller falls back to procedural). Honors
 * `loadMuted()` and skips entirely when muted.
 *
 * Layered with the procedural anticipation cue: caller schedules the cue
 * first, then `startAtSeconds` delays this sample by the cue offset.
 */
export async function playSample(
  ctx: AudioContext,
  manifest: Manifest,
  id: string,
  startAtSeconds: number,
  volumeSlider: number,
): Promise<number> {
  if (loadMuted()) return 0;
  const entry = manifest.entries.find((e) => e.id === id);
  if (!entry || entry.proceduralFallback) return 0;
  const buf = await decodeOnce(ctx, entry);
  if (!buf) return 0;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  // Map volume slider 1..10 → gain 0.2..0.95 (clamped).
  gain.gain.value = Math.min(0.95, 0.2 + volumeSlider * 0.075);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(startAtSeconds);
  return buf.duration;
}

// Test/debug accessors.
export function _resetLastSelected(): void {
  lastSelectedId = null;
}
export function _getLastSelected(): string | null {
  return lastSelectedId;
}
