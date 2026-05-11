/**
 * Fermentation rack — persists up to 3 in-progress ferments across UTC
 * days. Per PLAN_v4.md §C.T item 92.
 *
 * A food placed today (D) becomes "ready" tomorrow (D+1). After TTL=7
 * days unclaimed, it spoils (cleared).
 *
 * Schema in localStorage:
 *   fart_ferment_rack = [{foodId, startedAt: ISOString}]
 */

import { currentEncounterIdx } from './run-state';

const KEY = 'fart_ferment_rack';

export const FERMENT_RACK_SIZE = 3;
/**
 * TTL counted in encounters, not real-world days. Per PLAN_v5 redesign.
 * 7 encounters before a placed-but-unclaimed ferment spoils.
 */
export const FERMENT_TTL_DAYS = 7;

export interface FermentSlot {
  foodId: string;
  /** ISO date string of when fermentation started (kept for backcompat). */
  startedAt: string;
  /** Encounter idx at placement (post-PLAN_v5; preferred). Optional for legacy reads. */
  startedAtIdx?: number;
}

function isFermentSlot(v: unknown): v is FermentSlot {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.foodId === 'string' && typeof o.startedAt === 'string';
}

function slotStartIdx(slot: FermentSlot): number {
  // Prefer the encounter-idx anchor if present; fall back to 0.
  return typeof slot.startedAtIdx === 'number' ? slot.startedAtIdx : 0;
}

function safeLoad(): FermentSlot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFermentSlot);
  } catch {
    return [];
  }
}

function safeSave(rack: FermentSlot[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rack));
  } catch {
    // ignore quota
  }
}

export function loadFermentRack(): FermentSlot[] {
  return safeLoad();
}

export type AddResult =
  | { ok: true }
  | { ok: false; reason: 'rack-full' };

export function addToFermentRack(foodId: string, when: Date = new Date(), idx?: number): AddResult {
  const cur = safeLoad();
  if (cur.length >= FERMENT_RACK_SIZE) return { ok: false, reason: 'rack-full' };
  cur.push({
    foodId,
    startedAt: when.toISOString(),
    startedAtIdx: idx ?? currentEncounterIdx(),
  });
  safeSave(cur);
  return { ok: true };
}

/**
 * A ferment is "ready" if the current encounter idx is past its placement idx.
 * I.e., place at idx N → ready at idx N+1.
 */
export function getReadyFerments(_today?: Date, idx?: number): FermentSlot[] {
  const i = idx ?? currentEncounterIdx();
  return safeLoad().filter((slot) => slotStartIdx(slot) < i);
}

export type ClaimResult =
  | { ok: true; originalFoodId: string }
  | { ok: false; reason: 'invalid-slot' | 'not-ready' };

export function claimFerment(slotIdx: number, _today?: Date, idx?: number): ClaimResult {
  const cur = safeLoad();
  if (slotIdx < 0 || slotIdx >= cur.length) return { ok: false, reason: 'invalid-slot' };
  const slot = cur[slotIdx]!;
  const i = idx ?? currentEncounterIdx();
  if (slotStartIdx(slot) >= i) return { ok: false, reason: 'not-ready' };
  cur.splice(slotIdx, 1);
  safeSave(cur);
  return { ok: true, originalFoodId: slot.foodId };
}

// ----- Cumulative claim counter (Phase V item 98) -----

const KEY_CLAIMS = 'fart_ferment_claims';

export function loadFermentClaims(): number {
  try {
    const raw = localStorage.getItem(KEY_CLAIMS);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementFermentClaims(): number {
  const next = loadFermentClaims() + 1;
  try {
    localStorage.setItem(KEY_CLAIMS, String(next));
  } catch {
    // ignore
  }
  return next;
}

/**
 * Remove ferments older than FERMENT_TTL_DAYS encounters. Returns count removed.
 */
export function clearExpired(_now?: Date, idx?: number): number {
  const i = idx ?? currentEncounterIdx();
  const cur = safeLoad();
  const kept = cur.filter((slot) => {
    const age = i - slotStartIdx(slot);
    return age <= FERMENT_TTL_DAYS;
  });
  safeSave(kept);
  return cur.length - kept.length;
}
