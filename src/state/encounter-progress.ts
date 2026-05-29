/**
 * Per-encounter progress tracking — number of launches against the
 * current audience + whether the audience has been "wowed" (≥85% match
 * landed at least once in this encounter).
 *
 * Persisted as a single small object keyed by encounter idx so it
 * survives reloads but resets cleanly on Move On (which advances the
 * idx). If the encounter idx ever moves without an explicit clear, the
 * stale record is ignored and a fresh one starts.
 */

const KEY = 'fart_encounter_progress';
export const WOW_THRESHOLD = 85;
export const WOW_BONUS_GOLD = 15;
export const ENCORE_BONUS_GOLD = 20;

/** Diminishing-returns curve for repeat launches at the same audience. */
const MULTIPLIER_BY_LAUNCH = [1.0, 0.6, 0.3, 0.1] as const;

export function diminishingMultiplier(launchN: number): number {
  // launchN is 1-based. launch 1 = full. Beyond the table → floor (0.1).
  if (launchN <= 1) return MULTIPLIER_BY_LAUNCH[0];
  const idx = Math.min(launchN, MULTIPLIER_BY_LAUNCH.length) - 1;
  return MULTIPLIER_BY_LAUNCH[idx]!;
}

export interface EncounterProgress {
  encounterIdx: number;
  audienceId: string;
  launches: number;
  wowed: boolean;
  bestPct: number;
}

function isValid(v: unknown): v is EncounterProgress {
  if (!v || typeof v !== 'object') return false;
  const p = v as EncounterProgress;
  return (
    typeof p.encounterIdx === 'number' &&
    typeof p.audienceId === 'string' &&
    typeof p.launches === 'number' &&
    typeof p.wowed === 'boolean' &&
    typeof p.bestPct === 'number'
  );
}

export function loadEncounterProgress(): EncounterProgress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function save(p: EncounterProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

/**
 * Returns the current encounter's progress for the given (audienceId, idx).
 * If the persisted record is for a different encounter, returns a fresh one
 * (don't carry over progress between encounters).
 */
export function getOrCreate(audienceId: string, encounterIdx: number): EncounterProgress {
  const existing = loadEncounterProgress();
  if (existing && existing.audienceId === audienceId && existing.encounterIdx === encounterIdx) {
    return existing;
  }
  return { encounterIdx, audienceId, launches: 0, wowed: false, bestPct: 0 };
}

/**
 * Record a launch. Returns { progress, justWowed } — justWowed is true
 * iff this launch crossed the wow threshold for the first time this
 * encounter.
 */
export function recordLaunch(
  audienceId: string,
  encounterIdx: number,
  matchPct: number,
): { progress: EncounterProgress; justWowed: boolean } {
  const p = getOrCreate(audienceId, encounterIdx);
  const wasWowed = p.wowed;
  const next: EncounterProgress = {
    encounterIdx,
    audienceId,
    launches: p.launches + 1,
    wowed: p.wowed || matchPct >= WOW_THRESHOLD,
    bestPct: Math.max(p.bestPct, Math.round(matchPct)),
  };
  save(next);
  return { progress: next, justWowed: !wasWowed && next.wowed };
}

export function clearEncounterProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/**
 * 1-based "this is my Nth launch in this encounter" for diminishing-returns math.
 * Returns the COUNT INCLUDING the upcoming launch (i.e. before recordLaunch).
 */
export function upcomingLaunchIdx(audienceId: string, encounterIdx: number): number {
  return getOrCreate(audienceId, encounterIdx).launches + 1;
}

export function isWowed(audienceId: string, encounterIdx: number): boolean {
  return getOrCreate(audienceId, encounterIdx).wowed;
}
