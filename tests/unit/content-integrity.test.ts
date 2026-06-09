import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FART_GRID } from '../../src/audio/fart-grid';
import { RECIPES } from '../../src/state/recipes';
import { SYNERGIES } from '../../src/scoring/fart-recipe';
import { BOSSES } from '../../src/state/bosses';
import { AUDIENCES } from '../../src/state/audience';
import { getFood } from '../../src/state/food';

/**
 * Referential-integrity net for shipped content. Every cross-reference between
 * catalogs/assets is validated here so a regenerated asset bank, renamed food
 * id, or hand-edited catalog fails the suite instead of failing silently at
 * runtime.
 *
 * The grid check is the critical one: the launch fart fetches
 * `sfx-grid/<clipId>.mp3` by NAMING CONVENTION (no manifest), and
 * playGridClip's fetch failure is fire-and-forget — a missing clip means the
 * anticipation cue plays and then... nothing. This test is the only possible
 * integrity net for that bank.
 */

const ROOT = process.cwd();

describe('fart grid bank ↔ public/sfx-grid', () => {
  it('every FART_GRID cell has its mp3 on disk', () => {
    const missing = FART_GRID
      .map((c) => c.id)
      .filter((id) => !existsSync(join(ROOT, 'public', 'sfx-grid', `${id}.mp3`)));
    expect(missing).toEqual([]);
  });

  it('every mp3 on disk corresponds to a FART_GRID cell (no orphaned clips)', () => {
    const ids = new Set(FART_GRID.map((c) => c.id));
    const orphans = readdirSync(join(ROOT, 'public', 'sfx-grid'))
      .filter((f) => f.endsWith('.mp3'))
      .filter((f) => !ids.has(f.replace(/\.mp3$/, '')));
    expect(orphans).toEqual([]);
  });
});

describe('sfx manifest ↔ public/sfx', () => {
  it('every manifest entry file exists on disk', () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, 'public', 'sfx', 'manifest.json'), 'utf-8'),
    ) as { entries: Array<{ id: string; file: string }> };
    expect(manifest.entries.length).toBeGreaterThan(0);
    const missing = manifest.entries.filter(
      (e) => !existsSync(join(ROOT, 'public', 'sfx', e.file)),
    );
    expect(missing.map((e) => e.id)).toEqual([]);
  });
});

describe('recipe catalogs reference real foods', () => {
  it('every discoverable recipe ingredient is a real food id', () => {
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        expect(getFood(ing), `recipe ${r.id} references unknown food '${ing}'`).toBeDefined();
      }
    }
  });

  it('every synergy ingredient is a real food id', () => {
    for (const s of SYNERGIES) {
      for (const ing of s.ingredients) {
        expect(getFood(ing), `synergy '${s.name}' references unknown food '${ing}'`).toBeDefined();
      }
    }
  });
});

describe('boss + audience cross-references', () => {
  it('every boss audience id resolves to a real audience', () => {
    const ids = new Set(AUDIENCES.map((a) => a.id));
    for (const b of BOSSES) {
      for (const aid of b.audiences) {
        expect(ids.has(aid), `boss ${b.id} references unknown audience '${aid}'`).toBe(true);
      }
    }
  });

  it('every audience grant is a real food id', () => {
    for (const a of AUDIENCES) {
      if (a.grant !== undefined) {
        expect(getFood(a.grant), `audience ${a.id} grants unknown food '${a.grant}'`).toBeDefined();
      }
    }
  });
});
