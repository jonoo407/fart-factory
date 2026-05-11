/**
 * Boss trophies. Per PLAN_v7 T3.2.
 *
 * Every boss victory adds a Trophy to the persisted list. Shown in the
 * notebook so the player has a visible record of accumulated wins.
 */

const KEY = 'fart_trophies';

export interface Trophy {
  bossId: string;
  defeatedAt: string;
  plateUsed: string[];
  matchPct: number;
}

function isTrophy(v: unknown): v is Trophy {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.bossId === 'string' &&
    typeof o.defeatedAt === 'string' &&
    Array.isArray(o.plateUsed) &&
    typeof o.matchPct === 'number'
  );
}

export function loadTrophies(): Trophy[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTrophy);
  } catch {
    return [];
  }
}

export function addTrophy(t: Trophy): void {
  const cur = loadTrophies();
  cur.push(t);
  try {
    localStorage.setItem(KEY, JSON.stringify(cur));
  } catch {
    // ignore
  }
}

export function clearTrophies(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
