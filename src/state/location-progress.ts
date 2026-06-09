/**
 * Location-progress: unlock predicates + persisted explicit-unlocks +
 * daily hot-location selector. Per PLAN_v4.md §B.Q items 82-84.
 *
 * Locations unlock via region-level rules (Hometown always; City after
 * 5 audience wins; Wilderness after 10 recipes; Royal after Boss 2;
 * Cosmic after Boss 5). An explicit-unlock list also exists for story-
 * event one-offs.
 */

import { AREAS, type Area, type Region } from './containment';
import { AUDIENCES, type Audience } from './audience';
import { loadDiscoveredRecipes } from './persistence';
import { loadBossesDefeated } from './boss-progress';

const KEY_UNLOCKED = 'fart_locations_unlocked';

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

// ----- Explicit unlocks (story events) -----

export function loadUnlockedLocations(): string[] {
  return safeLoad<string[]>(
    KEY_UNLOCKED,
    [],
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );
}

export function unlockLocation(id: string): void {
  const cur = loadUnlockedLocations();
  if (cur.includes(id)) return;
  safeSave(KEY_UNLOCKED, [...cur, id]);
}

// ----- Audience-win counter for City unlock -----

function countAudienceWins(): number {
  // We count distinct fart_best_<audId> keys with value ≥ 50.
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('fart_best_') && k !== 'fart_best_overall') {
      try {
        const v = JSON.parse(localStorage.getItem(k) ?? '0');
        if (typeof v === 'number' && v >= 50) n++;
      } catch {
        // ignore
      }
    }
  }
  return n;
}

// ----- Region unlock predicates -----

function isRegionUnlocked(region: Region): boolean {
  switch (region) {
    case 'hometown':
      return true;
    case 'city':
      return countAudienceWins() >= 5;
    case 'wilderness':
      return loadDiscoveredRecipes().length >= 10;
    case 'royal':
      return loadBossesDefeated().includes('royal-court-escalation');
    case 'cosmic':
      return loadBossesDefeated().includes('cosmic-council-judgment');
  }
}

// ----- Per-location unlock check -----

export function isLocationUnlocked(loc: Area): boolean {
  // Explicit unlocks always win.
  if (loadUnlockedLocations().includes(loc.id)) return true;
  // Otherwise gated by region predicate.
  return isRegionUnlocked(loc.region);
}

export function unlockedLocations(): Area[] {
  return AREAS.filter((a) => isLocationUnlocked(a));
}

// ----- Audience-pool filtering -----

export function audiencePoolForLocation(loc: Area): Audience[] {
  if (!loc.audiencePool || loc.audiencePool.length === 0) {
    return [...AUDIENCES]; // global pool
  }
  const ids = new Set(loc.audiencePool);
  return AUDIENCES.filter((a) => ids.has(a.id));
}

// ----- Daily hot-location -----

import { currentEncounterIdx, encounterSeed } from './run-state';

function hotSpotSeed(idx: number): number {
  return encounterSeed(idx) ^ 0xb3c4d5e6;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Today's "Hot Spot" — one of the player's unlocked locations. In GamePlus,
 * launching here pays 3× gold (hotSpotGoldMultiplier). Outside GamePlus there is
 * no bonus today (the once-planned +20% non-GamePlus boost was never built).
 * Anchored to encounter idx, not date.
 */
export function dailyHotLocation(_d?: Date, idx?: number): Area | null {
  const pool = unlockedLocations();
  if (pool.length === 0) return null;
  const i = idx ?? currentEncounterIdx();
  const rng = mulberry32(hotSpotSeed(i));
  const j = Math.floor(rng() * pool.length);
  return pool[j] ?? null;
}
