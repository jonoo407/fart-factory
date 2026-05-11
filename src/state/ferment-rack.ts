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

const KEY = 'fart_ferment_rack';

export const FERMENT_RACK_SIZE = 3;
export const FERMENT_TTL_DAYS = 7;

export interface FermentSlot {
  foodId: string;
  /** ISO date string of when fermentation started. */
  startedAt: string;
}

function isFermentSlot(v: unknown): v is FermentSlot {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.foodId === 'string' && typeof o.startedAt === 'string';
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

function utcDay(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

export function loadFermentRack(): FermentSlot[] {
  return safeLoad();
}

export type AddResult =
  | { ok: true }
  | { ok: false; reason: 'rack-full' };

export function addToFermentRack(foodId: string, when: Date = new Date()): AddResult {
  const cur = safeLoad();
  if (cur.length >= FERMENT_RACK_SIZE) return { ok: false, reason: 'rack-full' };
  cur.push({ foodId, startedAt: when.toISOString() });
  safeSave(cur);
  return { ok: true };
}

export function getReadyFerments(today: Date = new Date()): FermentSlot[] {
  const todayUtc = utcDay(today);
  return safeLoad().filter((slot) => {
    const startUtc = utcDay(new Date(slot.startedAt));
    return startUtc < todayUtc;
  });
}

export type ClaimResult =
  | { ok: true; originalFoodId: string }
  | { ok: false; reason: 'invalid-slot' | 'not-ready' };

export function claimFerment(slotIdx: number, today: Date = new Date()): ClaimResult {
  const cur = safeLoad();
  if (slotIdx < 0 || slotIdx >= cur.length) return { ok: false, reason: 'invalid-slot' };
  const slot = cur[slotIdx]!;
  const startUtc = utcDay(new Date(slot.startedAt));
  if (startUtc >= utcDay(today)) return { ok: false, reason: 'not-ready' };
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
 * Remove ferments older than FERMENT_TTL_DAYS. Returns the count removed.
 */
export function clearExpired(now: Date = new Date()): number {
  const cur = safeLoad();
  const nowUtc = utcDay(now);
  const kept = cur.filter((slot) => {
    const ageDays = nowUtc - utcDay(new Date(slot.startedAt));
    return ageDays <= FERMENT_TTL_DAYS;
  });
  safeSave(kept);
  return cur.length - kept.length;
}
