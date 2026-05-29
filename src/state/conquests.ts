/**
 * Conquests — one row per audience the player has ever wowed (≥85%
 * match in a single launch). Acts as a lifetime achievement log
 * surfaced in the notebook.
 *
 * Persisted as fart_conquests = Conquest[]. Re-wowing the same audience
 * updates bestPct + wowedAt but doesn't append a duplicate row.
 */

const KEY = 'fart_conquests';

export interface Conquest {
  audienceId: string;
  wowedAt: string;   // ISO timestamp
  bestPct: number;
  timesWowed: number;
}

function isValidConquest(v: unknown): v is Conquest {
  if (!v || typeof v !== 'object') return false;
  const c = v as Conquest;
  return (
    typeof c.audienceId === 'string' &&
    typeof c.wowedAt === 'string' &&
    typeof c.bestPct === 'number' &&
    typeof c.timesWowed === 'number'
  );
}

export function loadConquests(): Conquest[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidConquest);
  } catch {
    return [];
  }
}

function save(list: Conquest[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Add or update a conquest. Returns the resulting Conquest row.
 * If the audience has been wowed before, bumps timesWowed and updates
 * bestPct if the new pct is higher.
 */
export function recordConquest(audienceId: string, matchPct: number): Conquest {
  const list = loadConquests();
  const existing = list.find((c) => c.audienceId === audienceId);
  if (existing) {
    existing.timesWowed += 1;
    if (matchPct > existing.bestPct) existing.bestPct = Math.round(matchPct);
    existing.wowedAt = new Date().toISOString();
    save(list);
    return existing;
  }
  const fresh: Conquest = {
    audienceId,
    wowedAt: new Date().toISOString(),
    bestPct: Math.round(matchPct),
    timesWowed: 1,
  };
  save([...list, fresh]);
  return fresh;
}

export function isAudienceConquered(audienceId: string): boolean {
  return loadConquests().some((c) => c.audienceId === audienceId);
}
