import { describe, it, expect } from 'vitest';
import { FOODS, type FoodProperties } from '../../src/state/food';
import { computeFartFromPlate } from '../../src/scoring/fart-recipe';
import { FART_GRID } from '../../src/audio/fart-grid';
import { AREAS, type AreaModifiers } from '../../src/state/containment';
import {
  selectFartCellId,
  resolveFart,
  fartPoolFor,
  fartGain,
  ORPHAN_HOMES,
} from '../../src/audio/fart-select';

// Enumerate REAL ingredient combos — multisets (with repetition) of the actual
// FOODS, plate sizes 1..4 — exactly what a player can build. The selector is
// validated against these, not synthetic axis points.
function realRecipes(): string[][] {
  const ids = FOODS.map((f) => f.id);
  const out: string[][] = [];
  const rec = (start: number, size: number, acc: string[]): void => {
    if (acc.length === size) { out.push(acc.slice()); return; }
    for (let i = start; i < ids.length; i++) { acc.push(ids[i]!); rec(i, size, acc); acc.pop(); }
  };
  for (let size = 1; size <= 4; size++) rec(0, size, []);
  return out;
}

describe('fart selector — coverage (no dead sounds)', () => {
  const recipes = realRecipes();

  it('every one of the 96 clips is played by some real ingredient combo', () => {
    const played = new Set<string>();
    for (const r of recipes) {
      const cellId = selectFartCellId(computeFartFromPlate(r).props);
      for (const clip of fartPoolFor(cellId)) played.add(clip);
    }
    const missing = FART_GRID.map((c) => c.id).filter((id) => !played.has(id));
    expect(missing).toEqual([]);
    expect(played.size).toBe(96);
  });

  it('every one of the 96 cells is a DIRECT target of some real recipe (garnish foods removed all orphans)', () => {
    const targets = new Set<string>();
    for (const r of recipes) targets.add(selectFartCellId(computeFartFromPlate(r).props));
    const undirected = FART_GRID.map((c) => c.id).filter((id) => !targets.has(id));
    expect(undirected).toEqual([]);
    // homing is no longer needed — the basic garnish foods reach every corner.
    expect(ORPHAN_HOMES).toEqual({});
  });

  it('every clip is reachable even under area-modified props (robustness superset)', () => {
    // NOTE: the live selector input is the RAW plate sum — plate.ts feeds
    // `audioProps = recipe.props` (deliberately NOT propsAfterArea) into
    // playFart. This test is a robustness superset: even if a future change
    // routed area-modified props into the selector, hometown-area players
    // could still reach all 96 cells. The raw-props contract itself is pinned
    // in playfart-dispatch.test.ts.
    const applyArea = (p: FoodProperties, m: AreaModifiers): FoodProperties => ({
      wet: p.wet * m.wet, dry: p.dry * m.dry, stink: p.stink * m.stink, loud: p.loud * m.loud,
      musical: p.musical * m.musical, length: p.length * m.length, temp: p.temp * m.temp,
    });
    const hometown = AREAS.filter((a) => a.region === 'hometown');
    const targets = new Set<string>();
    for (const r of recipes) {
      const props = computeFartFromPlate(r).props;
      for (const a of hometown) targets.add(selectFartCellId(applyArea(props, a.modifiers)));
    }
    const missing = FART_GRID.map((c) => c.id).filter((id) => !targets.has(id));
    expect(missing).toEqual([]);
  });
});

describe('fart selector — behaviour', () => {
  it('hard-matches length: a single small food → short; a big legendary plate → epic', () => {
    const onion = computeFartFromPlate(['onion']).props; // length 2
    expect(selectFartCellId(onion)).toMatch(/^g-short-/);
    const huge = computeFartFromPlate(['forbidden-burrito', 'volcano-chili', 'lutefisk', 'hakarl']).props; // length 20
    expect(selectFartCellId(huge)).toMatch(/^g-epic-/);
  });

  it('a clearly wet plate → wet texture; a clearly dry plate → dry texture', () => {
    const wet = computeFartFromPlate(['natto', 'natto']).props; // wet 10, dry 0
    expect(selectFartCellId(wet)).toMatch(/^g-\w+-wet-/);
    const dry = computeFartFromPlate(['pan-pipe-pea', 'pan-pipe-pea']).props; // dry 6, wet 0
    expect(selectFartCellId(dry)).toMatch(/^g-\w+-dry-/);
  });

  it('is deterministic for the cell (same props → same cell)', () => {
    const p = computeFartFromPlate(['beans', 'cheese']).props;
    expect(selectFartCellId(p)).toBe(selectFartCellId(p));
  });

  it('resolveFart returns a clip from the target cell pool, with sane gain + duration', () => {
    const p = computeFartFromPlate(['beans', 'cheese']).props;
    const r = resolveFart(p, () => 0);
    expect(fartPoolFor(r.cellId)).toContain(r.clipId);
    expect(r.gain).toBeGreaterThan(0);
    expect(r.gain).toBeLessThanOrEqual(0.95);
    expect(r.durationSeconds).toBeGreaterThan(0);
  });

  it('louder plates yield higher gain', () => {
    const quiet = computeFartFromPlate(['egg']).props; // loud 0
    const loud = computeFartFromPlate(['volcano-chili']).props; // loud 5
    expect(fartGain(loud)).toBeGreaterThan(fartGain(quiet));
  });
});
