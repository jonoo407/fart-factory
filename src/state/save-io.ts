/**
 * Save export / import.
 *
 * The game scatters ~60 localStorage keys under the fart_* namespace
 * (pantry, gold, notes, food mastery × 30, hidden combos, boss losses,
 * daily quests, etc.). Without a single-blob export, players can't
 * migrate or share their save.
 *
 * Format: { version: 1, exportedAt: ISO, keys: Record<string, string> }
 * All values are stored as strings — the same shape localStorage uses
 * natively — so round-tripping is lossless.
 */

const NAMESPACE = 'fart_';
export const SAVE_FORMAT_VERSION = 1;

export interface SaveBlob {
  version: number;
  exportedAt: string;
  keys: Record<string, string>;
}

export function exportSave(): SaveBlob {
  const keys: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(NAMESPACE)) continue;
      const v = localStorage.getItem(k);
      if (v !== null) keys[k] = v;
    }
  } catch {
    // ignore — return whatever we have
  }
  return {
    version: SAVE_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    keys,
  };
}

export function exportSaveString(): string {
  return JSON.stringify(exportSave(), null, 2);
}

export interface ImportResult {
  ok: boolean;
  reason?: string;
  importedKeys?: number;
}

function isSaveBlob(v: unknown): v is SaveBlob {
  if (!v || typeof v !== 'object') return false;
  const b = v as SaveBlob;
  if (typeof b.version !== 'number') return false;
  if (typeof b.exportedAt !== 'string') return false;
  if (!b.keys || typeof b.keys !== 'object') return false;
  return Object.entries(b.keys).every(
    ([k, v]) => typeof k === 'string' && typeof v === 'string',
  );
}

/**
 * Replace every fart_* key in localStorage with the blob's contents.
 * On parse / shape failure, leaves storage untouched.
 */
export function importSave(payload: string | SaveBlob): ImportResult {
  let blob: SaveBlob;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      if (!isSaveBlob(parsed)) {
        return { ok: false, reason: 'Save file is not in the expected format.' };
      }
      blob = parsed;
    } catch {
      return { ok: false, reason: 'Save file is not valid JSON.' };
    }
  } else {
    if (!isSaveBlob(payload)) {
      return { ok: false, reason: 'Save object is not in the expected format.' };
    }
    blob = payload;
  }
  if (blob.version !== SAVE_FORMAT_VERSION) {
    return { ok: false, reason: `Unsupported save version ${blob.version}.` };
  }
  // Only mutate after validation passes.
  try {
    // Clear existing fart_* keys first so deletions in the blob carry over.
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NAMESPACE)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(blob.keys)) {
      if (!k.startsWith(NAMESPACE)) continue; // hard ignore foreign keys
      localStorage.setItem(k, v);
    }
    return { ok: true, importedKeys: Object.keys(blob.keys).length };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Storage write failed.' };
  }
}
