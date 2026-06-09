/**
 * Streak counter — consecutive launches ≥75%. Per PLAN_v7 T2.2.
 *
 * Resets to 0 on launches below the threshold. Feeds hidden-combo
 * detection and the streak UI. (The old streak→gold multiplier was
 * replaced by the anti-grind encounter payout in v9.)
 */

const KEY = 'fart_streak_count';
const STREAK_PCT_THRESHOLD = 75;
export const STREAK_THRESHOLD = 3;

export function loadStreak(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveStreak(v: number): void {
  try {
    localStorage.setItem(KEY, String(Math.max(0, Math.floor(v))));
  } catch {
    // ignore
  }
}

export function recordLaunchForStreak(pct: number): number {
  if (!Number.isFinite(pct)) return loadStreak();
  if (pct >= STREAK_PCT_THRESHOLD) {
    const next = loadStreak() + 1;
    saveStreak(next);
    return next;
  }
  saveStreak(0);
  return 0;
}

export function resetStreak(): void {
  saveStreak(0);
}
