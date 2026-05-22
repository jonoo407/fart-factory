/**
 * Persistence schema for Tier 7 Story Mode state. Per PLAN.md §D.A.30
 * (P24 — save system as persistent state). All keys are corruption-safe
 * and have explicit defaults.
 *
 * Stored under namespace `fart_*` so they coexist with v1/v2 keys.
 */

import { FOODS } from './food';

const KEY_PANTRY = 'fart_pantry';        // string[] — unlocked food ids
const KEY_GOLD = 'fart_gold';            // number — current gold balance
const KEY_NOTES = 'fart_research';       // number — research notes balance
const KEY_RECIPES = 'fart_recipes_seen'; // string[] — discovered recipe ids
const KEY_LAST_AREA = 'fart_area';       // current area id
const KEY_LAST_MATCH = 'fart_last_match'; // number — last launch match% for trend

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
    // ignore (private mode / quota)
  }
}

// ----- V8 T5 — Pantry locked-collapse toggle -----
//
// The launch-screen pantry hides locked food teasers by default so the
// player only sees what they actually own. A "🔒 Show locked teasers"
// toggle flips this flag, which persists across sessions.

const KEY_PANTRY_SHOW_LOCKED = 'fart_pantry_show_locked';

export function loadPantryShowLocked(): boolean {
  return safeLoad<boolean>(
    KEY_PANTRY_SHOW_LOCKED,
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
}
export function setPantryShowLocked(show: boolean): void {
  safeSave(KEY_PANTRY_SHOW_LOCKED, show);
}

// ----- Pantry (unlocked food ids) -----

function defaultPantry(): string[] {
  return FOODS.filter((f) => f.startsUnlocked).map((f) => f.id);
}

export function loadPantry(): string[] {
  return safeLoad<string[]>(
    KEY_PANTRY,
    defaultPantry(),
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );
}

export function savePantry(ids: string[]): void {
  safeSave(KEY_PANTRY, ids);
}

export function unlockFood(id: string): string[] {
  const cur = loadPantry();
  if (cur.includes(id)) return cur;
  const next = [...cur, id];
  savePantry(next);
  return next;
}

// ----- Gold / Research notes -----

const validNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function loadGold(): number {
  return safeLoad<number>(KEY_GOLD, 0, validNum);
}
export function setGold(n: number): void {
  safeSave(KEY_GOLD, Math.max(0, Math.floor(n)));
}
export function addGold(delta: number): number {
  const next = Math.max(0, loadGold() + Math.floor(delta));
  setGold(next);
  return next;
}

export function loadResearchNotes(): number {
  return safeLoad<number>(KEY_NOTES, 0, validNum);
}
export function setResearchNotes(n: number): void {
  safeSave(KEY_NOTES, Math.max(0, Math.floor(n)));
}
export function addResearchNotes(delta: number): number {
  const next = Math.max(0, loadResearchNotes() + Math.floor(delta));
  setResearchNotes(next);
  return next;
}

// ----- Discovered recipes -----

export function loadDiscoveredRecipes(): string[] {
  return safeLoad<string[]>(
    KEY_RECIPES,
    [],
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );
}

export function markRecipeDiscovered(id: string): { added: boolean; list: string[] } {
  const cur = loadDiscoveredRecipes();
  if (cur.includes(id)) return { added: false, list: cur };
  const next = [...cur, id];
  safeSave(KEY_RECIPES, next);
  return { added: true, list: next };
}

// ----- Last-selected area + last-match (for trend) -----

export function loadLastArea(): string {
  return safeLoad<string>(KEY_LAST_AREA, 'outside', (v): v is string => typeof v === 'string');
}
export function setLastArea(id: string): void {
  safeSave(KEY_LAST_AREA, id);
}

export function loadLastMatch(): number | null {
  return safeLoad<number | null>(
    KEY_LAST_MATCH,
    null,
    (v): v is number | null => v === null || (typeof v === 'number' && v >= 0 && v <= 100),
  );
}
export function setLastMatch(pct: number | null): void {
  safeSave(KEY_LAST_MATCH, pct);
}

// ----- Belly meter (per encounter, not per UTC day) -----
//
// Per PLAN_v5 redesign: belly is now anchored to the encounter idx
// (currentEncounterIdx from run-state.ts), not the calendar date.
// When the player taps "Move On" → incrementEncounter() bumps the idx,
// and loadBelly() returns BELLY_MAX (fresh belly for the new encounter).
// No real-world clock anywhere.

import { currentEncounterIdx } from './run-state';

const KEY_BELLY_PREFIX = 'fart_belly_e_';
const BELLY_MAX = 30;

function bellyKey(idx: number = currentEncounterIdx()): string {
  return `${KEY_BELLY_PREFIX}${idx}`;
}

export function loadBelly(idx?: number): number {
  return safeLoad<number>(
    bellyKey(idx),
    BELLY_MAX,
    (v): v is number => typeof v === 'number' && v >= 0 && v <= BELLY_MAX,
  );
}

export function spendBelly(cost: number, idx?: number): { ok: boolean; remaining: number } {
  const cur = loadBelly(idx);
  if (cost > cur) return { ok: false, remaining: cur };
  const next = cur - cost;
  safeSave(bellyKey(idx), next);
  return { ok: true, remaining: next };
}

/** Force-refill belly for the current encounter (e.g. Power Nap activity). */
export function refillBelly(idx?: number): void {
  safeSave(bellyKey(idx), BELLY_MAX);
}

export const BELLY_CAPACITY = BELLY_MAX;

// ----- Best-match high-water marks (Phase J quest steps) -----
//
// Per-audience best match% (ratchets up only — never decreases). Used by
// quests like "score 90%+ at any audience" or "win with Haunted Mansion".

const KEY_BEST_MATCH_PREFIX = 'fart_best_';
const KEY_BEST_OVERALL = 'fart_best_overall';

const validPct = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;

export function loadBestMatch(audienceId: string): number {
  return safeLoad<number>(`${KEY_BEST_MATCH_PREFIX}${audienceId}`, 0, validPct);
}

export function bumpBestMatch(audienceId: string, pct: number): number {
  if (!validPct(pct)) return loadBestMatch(audienceId);
  const cur = loadBestMatch(audienceId);
  if (pct <= cur) return cur;
  safeSave(`${KEY_BEST_MATCH_PREFIX}${audienceId}`, pct);
  return pct;
}

export function loadBestMatchOverall(): number {
  return safeLoad<number>(KEY_BEST_OVERALL, 0, validPct);
}

export function setBestMatchOverall(pct: number): void {
  if (validPct(pct)) safeSave(KEY_BEST_OVERALL, pct);
}

export function bumpBestMatchOverall(pct: number): number {
  if (!validPct(pct)) return loadBestMatchOverall();
  const cur = loadBestMatchOverall();
  if (pct <= cur) return cur;
  safeSave(KEY_BEST_OVERALL, pct);
  return pct;
}

