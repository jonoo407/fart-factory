/**
 * Boss cooldowns. Per-boss `cooldownRemaining` decrements with each completed
 * encounter; set to 3 on a boss loss, gating the boss out of the arena list
 * until it expires. (The old random boss-slot cadence was never wired into the
 * encounter loop — bosses are offered via the arena list in ui/boss-arena.ts,
 * gated by isBossUnlocked + isOnCooldown — and was removed.)
 */

import { BOSSES } from './bosses';

const KEY_COOLDOWN_PREFIX = 'fart_boss_cooldown_';

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
