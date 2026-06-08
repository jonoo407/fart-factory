/**
 * PLAN v9 P6 / 02 §2-§4 — the axis-driven fart readout selector. THE core of
 * "the fart is the readout": a normalized 0-1 axis object (the same one the
 * scorer produces, §3.3) maps to a set of pre-baked stems to layer + a master
 * gain, so wet squelches, musical recipes play notes, hot ones sizzle, stinky
 * ones linger. This is the pure selection logic (unit-tested here).
 *
 * NOTE: the layered PLAYBACK + the ~50 new ElevenLabs stem assets
 * (base rips × wet/dry × short/med/long, a melodic octave, sizzles, hazes) are
 * the remaining step — they require API generation (run via the sfx pipeline)
 * and are intentionally NOT generated autonomously. Until the stems exist,
 * playFart falls back to the existing whole-clip bank. This module is the
 * contract the generator + player build against.
 */

import type { FoodProperties } from '../state/food';
import { AXIS_CAP } from '../scoring/tuning';

export interface AxisLevels {
  wet: number;
  dry: number;
  stink: number;
  loud: number;
  musical: number;
  length: number;
  temp: number;
}

/** Normalize raw plate axis sums (0..N) into the 0-1 levels the readout uses. */
export function normalizeAxes(props: FoodProperties): AxisLevels {
  const n = (v: number): number => Math.min(1, Math.max(0, v / AXIS_CAP));
  return {
    wet: n(props.wet),
    dry: n(props.dry),
    stink: n(props.stink),
    loud: n(props.loud),
    musical: n(props.musical),
    length: n(props.length),
    temp: n(props.temp),
  };
}

export type LengthBucket = 'short' | 'med' | 'long';

export function lengthBucket(length: number): LengthBucket {
  if (length < 0.33) return 'short';
  if (length < 0.66) return 'med';
  return 'long';
}

export interface FartLayers {
  /** the base rip stem id: rip-(wet|dry)-(short|med|long). */
  base: string;
  /** a pitched melody stem when musical is high, else null. */
  melody: string | null;
  /** a sizzle/crackle layer when hot, else null. */
  sizzle: string | null;
  /** a lingering stink-haze tail when stinky, else null. */
  haze: string | null;
  /** master gain for the assembled fart, 0.18 + loud*0.7 (capped at 1). */
  gain: number;
}

// Axis thresholds for optional layers (02 §4).
const MUSICAL_MIN = 0.45;
const TEMP_MIN = 0.3;
const STINK_MIN = 0.3;

/**
 * Choose the stems to layer for a fart given its normalized axes. The base rip
 * comes from whichever of wet/dry dominates × the length bucket; optional
 * melody / sizzle / haze layers switch in past their thresholds; the gain
 * tracks loudness.
 */
export function selectFartLayers(ax: AxisLevels): FartLayers {
  const wetDry = ax.wet >= ax.dry ? 'wet' : 'dry';
  const base = `rip-${wetDry}-${lengthBucket(ax.length)}`;
  // higher musical → a higher note in the playable octave (0-7)
  const melody = ax.musical > MUSICAL_MIN ? `melody-${Math.min(7, Math.max(0, Math.round(ax.musical * 7)))}` : null;
  const sizzle = ax.temp > TEMP_MIN ? `sizzle-${ax.temp >= 0.66 ? 'hi' : 'lo'}` : null;
  const haze = ax.stink > STINK_MIN ? `haze-${ax.stink >= 0.66 ? 'hi' : 'lo'}` : null;
  const gain = Math.min(1, 0.18 + ax.loud * 0.7);
  return { base, melody, sizzle, haze, gain };
}

/** At/above this normalized length, an `-xl` epic base variant (if it exists) wins. */
const EPIC_LENGTH_MIN = 0.85;

/**
 * Resolve a base-rip FAMILY (e.g. 'rip-wet-long', from selectFartLayers) to a
 * concrete variant that actually exists in the manifest, giving the core-loop
 * fart real variety from a small stem set:
 *   - `{family}` / `{family}-2` / `{family}-3` — interchangeable texture variants,
 *     chosen at random so repeated recipes don't sound identical.
 *   - `{family}-xl` — a genuinely long (~4.5s) "epic" rip that only plays at the
 *     very top of the length axis (the fork's length-fit idea, placed in the tier
 *     the core loop actually plays).
 *
 * Manifest-gated: `available` is the list of stem ids present, so a variant only
 * plays once its asset is generated. Before any variant exists this returns the
 * family unchanged — no behaviour change, no regression. Pure (rng injected).
 */
export function pickBaseVariant(
  family: string,
  available: readonly string[],
  ax: AxisLevels,
  rng: () => number = Math.random,
): string {
  const pool = available.filter((id) => id === family || id.startsWith(`${family}-`));
  if (pool.length === 0) return family;
  const xl = pool.filter((id) => id.endsWith('-xl'));
  const regular = pool.filter((id) => !id.endsWith('-xl'));
  if (ax.length >= EPIC_LENGTH_MIN && xl.length > 0) {
    return xl[Math.floor(rng() * xl.length) % xl.length]!;
  }
  const choices = regular.length > 0 ? regular : pool;
  return choices[Math.floor(rng() * choices.length) % choices.length]!;
}
