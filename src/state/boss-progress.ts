/**
 * Boss-progress persistence + unlock predicates. Per PLAN_v4.md §A.N item 72.
 *
 * Stored under fart_bosses_* keys so they coexist with the v3 Story state.
 */

import { BOSSES, type Boss, type UnlockReqKind } from './bosses';
import {
  loadDiscoveredRecipes,
  loadPantry,
  loadBestMatchOverall,
} from './persistence';
import { FOODS } from './food';

const KEY_DEFEATED = 'fart_bosses_defeated';
const KEY_TOAST_PREFIX = 'fart_boss_toast_';
const KEY_GAMEPLUS = 'fart_gameplus';

function safeLoad<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!validate(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function safeSave<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// ----- Defeated bosses list -----

export function loadBossesDefeated(): string[] {
  return safeLoad<string[]>(
    KEY_DEFEATED,
    [],
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );
}

export function markBossDefeated(id: string): { firstWin: boolean; list: string[] } {
  const cur = loadBossesDefeated();
  if (cur.includes(id)) return { firstWin: false, list: cur };
  const next = [...cur, id];
  safeSave(KEY_DEFEATED, next);
  return { firstWin: true, list: next };
}

// ----- Per-boss unlock-toast-seen flag -----

export function loadBossUnlockToastSeen(id: string): boolean {
  return safeLoad<boolean>(
    `${KEY_TOAST_PREFIX}${id}`,
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
}

export function markBossUnlockToastSeen(id: string): void {
  safeSave(`${KEY_TOAST_PREFIX}${id}`, true);
}

// ----- Game+ flag -----

export function loadGamePlusUnlocked(): boolean {
  return safeLoad<boolean>(
    KEY_GAMEPLUS,
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
}

export function setGamePlusUnlocked(v: boolean): void {
  safeSave(KEY_GAMEPLUS, v);
}

// ----- Unlock predicate -----

function countEpicFoodsOwned(): number {
  const unlocked = new Set(loadPantry());
  return FOODS.filter((f) => f.rarity === 'epic' && unlocked.has(f.id)).length;
}

export function isBossUnlocked(boss: Boss): boolean {
  const req = boss.unlockReq;
  // Step 1: prior-boss requirements (AND-joined).
  if (req.requiredBossIds && req.requiredBossIds.length > 0) {
    const defeated = new Set(loadBossesDefeated());
    for (const id of req.requiredBossIds) {
      if (!defeated.has(id)) return false;
    }
  }
  // Step 2: the specific predicate.
  switch (req.kind as UnlockReqKind) {
    case 'always':
      return true;
    case 'recipes-discovered':
      return loadDiscoveredRecipes().length >= (req.target ?? Infinity);
    case 'best-overall':
      return loadBestMatchOverall() >= (req.target ?? Infinity);
    case 'epic-foods-owned':
      return countEpicFoodsOwned() >= (req.target ?? Infinity);
    case 'legendary-quest-claimed': {
      if (!req.legendaryFoodId) return false;
      return loadPantry().includes(req.legendaryFoodId);
    }
    case 'bosses-defeated':
      // Already checked above via requiredBossIds, so if we got here, true.
      return true;
    default:
      return false;
  }
}

export function unlockedBosses(): Boss[] {
  return BOSSES.filter((b) => isBossUnlocked(b));
}
