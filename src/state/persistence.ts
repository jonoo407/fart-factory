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
const KEY_MODE = 'fart_mode';            // 'story' | 'sandbox'
const KEY_LAST_AREA = 'fart_area';       // current area id
const KEY_LAST_MATCH = 'fart_last_match'; // number — last launch match% for trend

export type Mode = 'story' | 'sandbox';

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

// ----- Mode (story / sandbox) -----

export function loadMode(): Mode {
  return safeLoad<Mode>(
    KEY_MODE,
    'story',
    (v): v is Mode => v === 'story' || v === 'sandbox',
  );
}
export function setMode(m: Mode): void {
  safeSave(KEY_MODE, m);
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

// ----- Belly meter (per UTC day) -----

const KEY_BELLY_PREFIX = 'fart_belly_';
const BELLY_MAX = 20;

function bellyKey(d: Date = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${KEY_BELLY_PREFIX}${yyyy}-${mm}-${dd}`;
}

export function loadBelly(d: Date = new Date()): number {
  return safeLoad<number>(
    bellyKey(d),
    BELLY_MAX,
    (v): v is number => typeof v === 'number' && v >= 0 && v <= BELLY_MAX,
  );
}

export function spendBelly(cost: number, d: Date = new Date()): { ok: boolean; remaining: number } {
  const cur = loadBelly(d);
  if (cost > cur) return { ok: false, remaining: cur };
  const next = cur - cost;
  safeSave(bellyKey(d), next);
  return { ok: true, remaining: next };
}

export const BELLY_CAPACITY = BELLY_MAX;
