/**
 * Live Crowd Read — the coarse mood preview shown WHILE plating ("The Live
 * Show" feature). Turns the early game from blind guessing into a hot/cold
 * deduction game without becoming an oracle for the late game:
 *
 *  - tier-only: the provisional match pct is bucketed into the same 5 wide
 *    reaction tiers as the post-launch reaction (audienceReaction); numbers
 *    never reach the UI.
 *  - deterministic jitter: ±CROWD_READ.jitterPct is added BEFORE bucketing,
 *    seeded from the encounter seed + the (order-insensitive) plate
 *    composition — the same plate always reads the same, so the mood can't
 *    be rerolled or binary-searched near a tier cutoff.
 *
 * Pure module: no DOM, no localStorage. The seeds come in as arguments.
 */

import { CROWD_READ } from './tuning';
import { rngBetween } from '../state/run-state';
import { audienceReaction, type Tier } from './audience-reactions';

export type CrowdMoodTier = Tier | 'expectant';

export interface CrowdRead {
  tier: Tier;
  trend: 'warmer' | 'colder' | 'first' | 'same';
  /** True when the plate breaks one of the audience's restrictions. */
  violated: boolean;
  /** The jittered pct — kept ONLY for trend tracking, never for display. */
  jitteredPct: number;
  /** Deterministic seed for caption selection (stable per plate). */
  captionSeed: number;
}

/** Order-insensitive plate identity: same foods + treatment → same key. */
export function plateKey(ids: string[], treatment: string | null): string {
  return [...ids].sort().join('+') + '|' + (treatment ?? '');
}

/** FNV-1a 32-bit string hash (deterministic, no deps). */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable ±jitterPct fuzz for a given encounter seed + plate key. */
export function jitterForPlate(encSeed: number, key: string): number {
  const seed = (fnv1a(key) ^ (encSeed >>> 0)) >>> 0;
  return rngBetween(seed, -CROWD_READ.jitterPct, CROWD_READ.jitterPct);
}

/**
 * The crowd's read of the current plate. `rawPct` is the provisional match
 * (charge quality = 1); `prevJitteredPct` is the previous read's jittered
 * value (trend compares jittered to jittered so the arrow can't leak the
 * un-fuzzed score either).
 */
export function computeCrowdRead(
  rawPct: number,
  violationsCount: number,
  encSeed: number,
  key: string,
  prevJitteredPct: number | null,
): CrowdRead {
  const jittered = Math.max(0, Math.min(100, rawPct + jitterForPlate(encSeed, key)));
  const { tier, trend } = audienceReaction(jittered, prevJitteredPct);
  return {
    tier,
    trend,
    violated: violationsCount > 0,
    jitteredPct: jittered,
    captionSeed: (fnv1a(key) ^ (encSeed >>> 0)) >>> 0,
  };
}

export const MOOD_EMOJI: Record<CrowdMoodTier, string> = {
  loved: '🤩',
  liked: '🙂',
  meh: '😐',
  disliked: '😬',
  evacuated: '🤢',
  expectant: '👀',
};

export const TREND_ARROW: Record<CrowdRead['trend'], string> = {
  warmer: '▲',
  colder: '▼',
  same: '•',
  first: '',
};

/** Kid-safe murmur captions, a small pool per tier ({name} = audience name). */
const CAPTIONS: Record<Tier, readonly string[]> = {
  loved: [
    '{name} leans in, eyes sparkling…',
    '{name} can hardly sit still…',
    'Someone whispers: “this could be the one…”',
  ],
  liked: [
    '{name} nods along approvingly…',
    '{name} murmurs with interest…',
    'A few encouraging giggles ripple through…',
  ],
  meh: [
    '{name} looks politely unconvinced…',
    '{name} checks the time…',
    'Someone stifles a yawn…',
  ],
  disliked: [
    '{name} shifts in their seats…',
    '{name} exchanges worried glances…',
    'A nervous cough breaks the silence…',
  ],
  evacuated: [
    '{name} eyes the exits…',
    'Someone quietly reaches for a clothespin…',
    '{name} starts fanning the air already…',
  ],
};

export const EXPECTANT_CAPTION = 'The crowd watches, waiting to see what you plate…';
export const VIOLATION_CAPTION = 'The crowd shifts uncomfortably… something on that plate is off-limits!';

/** Deterministic caption pick (stable per plate — no flicker on re-render). */
export function crowdMoodCaption(tier: Tier, audienceName: string, seed: number): string {
  const pool = CAPTIONS[tier];
  const pick = pool[rngBetween(seed, 0, pool.length - 1)]!;
  return pick.replace('{name}', audienceName);
}
