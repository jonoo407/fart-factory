/**
 * Run-state foundation. Replaces real-world-time gates with a
 * player-driven encounter counter.
 *
 * - `currentEncounterIdx()`: monotonic counter, persisted across reloads.
 * - `incrementEncounter()`: advance the loop one step (player tapped Move On
 *   or the encounter ended for another reason).
 * - `loadRunSeed()`: a per-save random seed used to decorrelate this player's
 *   run from any other. Generated on first call, persisted.
 * - `encounterSeed(idx)`: mixes run seed + encounter idx for deterministic
 *   per-encounter RNG (audience, shop, hot-spot, intermission choices).
 * - `rngBetween(seed, min, max)`: a deterministic integer in [min, max]
 *   inclusive for a given seed.
 *
 * Per PLAN: replaces `dayOfYear()` / `utcDaySeed()` across the codebase.
 */

const KEY_IDX = 'fart_encounter_idx';
const KEY_RUN_SEED = 'fart_run_seed';

function safeLoadInt(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

function safeSaveInt(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

// ---------- encounter idx ----------

export function currentEncounterIdx(): number {
  return safeLoadInt(KEY_IDX, 0);
}

export function incrementEncounter(): number {
  const next = currentEncounterIdx() + 1;
  safeSaveInt(KEY_IDX, next);
  return next;
}

export function resetRunState(): void {
  try {
    localStorage.removeItem(KEY_IDX);
    localStorage.removeItem(KEY_RUN_SEED);
  } catch {
    // ignore
  }
}

// ---------- run seed ----------

export function loadRunSeed(): number {
  const stored = safeLoadInt(KEY_RUN_SEED, 0);
  if (stored > 0) return stored;
  // First call — generate and persist. Use a value derived from current
  // time (fine for one-time per-save seed generation; not used for any
  // gameplay timing). Range 1..2^31-1.
  const seed = (Math.floor(Math.random() * 0x7fffffff) || 1);
  safeSaveInt(KEY_RUN_SEED, seed);
  return seed;
}

// ---------- seeded RNG ----------

/**
 * Deterministic 32-bit hash of run seed + encounter idx. Mulberry32-style
 * but as a single output rather than a generator (we want a stable seed
 * per encounter, not a streaming PRNG).
 */
export function encounterSeed(idx: number): number {
  const runSeed = loadRunSeed();
  let s = ((runSeed >>> 0) ^ (idx + 0x6d2b79f5)) >>> 0;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  return (s ^ (s >>> 14)) >>> 0;
}

/**
 * Deterministic integer in [min, max] inclusive for a given 32-bit seed.
 * Used by boss-cadence rolls and intermission-activity rolls.
 */
export function rngBetween(seed: number, min: number, max: number): number {
  if (max < min) return min;
  let s = seed >>> 0;
  // One mulberry32 step for output.
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const norm = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(min + norm * (max - min + 1));
}
