/**
 * Boss cadence + cooldown. Per PLAN_v5 humming-frolicking-wilkes.md.
 *
 * - Per-boss `cooldownRemaining` decrements with each completed encounter.
 *   Set to 3 on a boss loss; gates the boss out of the next 3 slot rolls.
 * - Random boss-slot offset: every encounter where the player advances,
 *   we check `currentEncounterIdx() === loadNextBossSlotIdx()`. If yes,
 *   a boss is offered. If no, a regular encounter happens.
 * - After each boss outcome (win, lose, decline), call `rollNextBossSlot()`
 *   to set the next slot at currentIdx + rngBetween(MIN, MAX).
 */

import { BOSSES, type Boss } from './bosses';
import { loadBossesDefeated, isBossUnlocked } from './boss-progress';
import { currentEncounterIdx, encounterSeed, rngBetween } from './run-state';

const KEY_COOLDOWN_PREFIX = 'fart_boss_cooldown_';
const KEY_NEXT_SLOT = 'fart_next_boss_slot';

export const BOSS_SLOT_MIN_OFFSET = 3;
export const BOSS_SLOT_MAX_OFFSET = 8;

// ---------- cooldowns ----------

export function loadBossCooldown(bossId: string): number {
  try {
    const raw = localStorage.getItem(`${KEY_COOLDOWN_PREFIX}${bossId}`);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setBossCooldown(bossId: string, value: number): void {
  try {
    localStorage.setItem(`${KEY_COOLDOWN_PREFIX}${bossId}`, String(Math.max(0, Math.floor(value))));
  } catch {
    // ignore
  }
}

export function isOnCooldown(bossId: string): boolean {
  return loadBossCooldown(bossId) > 0;
}

/** Reduce all per-boss cooldowns by 1 (called after every encounter). */
export function decrementAllCooldowns(): void {
  for (const b of BOSSES) {
    const cur = loadBossCooldown(b.id);
    if (cur > 0) setBossCooldown(b.id, cur - 1);
  }
}

// ---------- cadence ----------

export function loadNextBossSlotIdx(): number {
  try {
    const raw = localStorage.getItem(KEY_NEXT_SLOT);
    if (!raw) return -1;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

/**
 * Roll the next boss-slot idx. Deterministic per run-seed + currentIdx.
 * Called once after each boss outcome (or on first ever run).
 */
export function rollNextBossSlot(currentIdx: number = currentEncounterIdx()): number {
  const seed = encounterSeed(currentIdx);
  const offset = rngBetween(seed, BOSS_SLOT_MIN_OFFSET, BOSS_SLOT_MAX_OFFSET);
  const next = currentIdx + offset;
  try {
    localStorage.setItem(KEY_NEXT_SLOT, String(next));
  } catch {
    // ignore
  }
  return next;
}

export function isBossSlot(idx: number = currentEncounterIdx()): boolean {
  return idx === loadNextBossSlotIdx();
}

/**
 * Pick the next eligible boss when a slot fires. Returns:
 *   - the newest unlocked boss NOT on cooldown
 *   - prefers higher-act bosses (Boss 5 over Boss 1 if both eligible)
 *   - returns null if no boss is eligible (slot becomes a regular encounter)
 */
export function eligibleBossForSlot(): Boss | null {
  const defeated = new Set(loadBossesDefeated());
  // Iterate bosses by act descending (prefer the latest the player has unlocked).
  const sortedDesc = [...BOSSES].sort((a, b) => b.act - a.act);
  for (const boss of sortedDesc) {
    if (!isBossUnlocked(boss)) continue;
    if (isOnCooldown(boss.id)) continue;
    // Prefer undefeated; if all unlocked bosses are defeated, fall through
    // to re-offering (which uses currency-only rewards in dispatchBossReward).
    if (!defeated.has(boss.id)) return boss;
  }
  // No undefeated eligible boss — return the highest-act defeated one
  // (for refight currency), or null.
  for (const boss of sortedDesc) {
    if (!isBossUnlocked(boss)) continue;
    if (isOnCooldown(boss.id)) continue;
    if (defeated.has(boss.id)) return boss;
  }
  return null;
}
