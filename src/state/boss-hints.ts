/**
 * Boss first-loss hint reveal. Per PR7.
 *
 * The first time the player loses to each boss, one of the boss's
 * audience cravings is permanently revealed in the notebook + arena
 * defeat panel. Subsequent losses to the same boss don't reveal more
 * (the hint is the consolation prize for the FIRST defeat).
 *
 * Persistence: fart_boss_hints_revealed = Record<bossId, axis[]>
 * Persistence: fart_boss_losses_<bossId> = number — defeat counter
 *
 * Deterministic: the revealed axis is chosen by the boss's top-craving
 * across the union of its audience cravings, so re-fights show the same
 * hint (player builds toward it).
 */

import { AUDIENCES, type Audience } from './audience';
import { getBoss } from './bosses';
import type { FoodProperties } from './food';

const KEY_HINTS = 'fart_boss_hints_revealed';
const KEY_LOSS_PREFIX = 'fart_boss_losses_';

const AXES: ReadonlyArray<keyof FoodProperties> = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

const AXIS_LABEL: Record<keyof FoodProperties, string> = {
  wet:     'wet',
  dry:     'dry',
  stink:   'stinky',
  loud:    'loud',
  musical: 'musical',
  length:  'long',
  temp:    'hot',
};

export interface BossHints {
  [bossId: string]: string[]; // list of revealed axis names
}

export function loadBossHints(): BossHints {
  try {
    const raw = localStorage.getItem(KEY_HINTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: BossHints = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        out[k] = v as string[];
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveBossHints(value: BossHints): void {
  try {
    localStorage.setItem(KEY_HINTS, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function revealedCravingsForBoss(bossId: string): string[] {
  return loadBossHints()[bossId] ?? [];
}

function dominantCravingAxis(audiences: readonly Audience[]): keyof FoodProperties | null {
  if (audiences.length === 0) return null;
  const totals: Record<keyof FoodProperties, number> = {
    wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0,
  };
  for (const a of audiences) {
    for (const axis of AXES) totals[axis] += a.cravings[axis] ?? 0;
  }
  let best: keyof FoodProperties = 'wet';
  let bestVal = -1;
  for (const axis of AXES) {
    if (totals[axis] > bestVal) {
      bestVal = totals[axis];
      best = axis;
    }
  }
  return best;
}

/**
 * Record a boss loss. Returns the revealed-craving label if this is the
 * boss's first loss (or null if already revealed). Always increments the
 * per-boss loss counter.
 */
export function recordFirstLoss(bossId: string): string | null {
  // Always bump the loss counter.
  recordBossLoss(bossId);
  const hints = loadBossHints();
  if (hints[bossId] && hints[bossId].length > 0) return null;
  const boss = getBoss(bossId);
  if (!boss) return null;
  const audiences = boss.audiences
    .map((id) => AUDIENCES.find((a) => a.id === id))
    .filter((a): a is Audience => Boolean(a));
  const axis = dominantCravingAxis(audiences);
  if (!axis) return null;
  hints[bossId] = [axis];
  saveBossHints(hints);
  return AXIS_LABEL[axis];
}

// ----- Per-boss loss counter (shame strip in notebook) -----

export function loadBossLossCount(bossId: string): number {
  try {
    const raw = localStorage.getItem(`${KEY_LOSS_PREFIX}${bossId}`);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function recordBossLoss(bossId: string): number {
  const next = loadBossLossCount(bossId) + 1;
  try {
    localStorage.setItem(`${KEY_LOSS_PREFIX}${bossId}`, String(next));
  } catch {
    // ignore
  }
  return next;
}

export function axisLabel(axis: keyof FoodProperties): string {
  return AXIS_LABEL[axis];
}
