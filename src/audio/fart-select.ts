/**
 * Fart-bank SELECTOR — maps a plate's raw fart-properties to one of the 96
 * pre-baked grid clips (src/audio/fart-grid.ts) + a playback gain.
 *
 * "The fart is the readout": length & loudness are hard-matched (the most
 * noticeable axes), wet/dry/musical/heat steer texture/musical/energy. Thresholds
 * are calibrated to the REAL recipe distribution (scripts/fart-coverage.ts, run
 * over every multiset of the actual FOODS) so the mapping spreads across the grid
 * instead of saturating onto one clip.
 *
 * Coverage guarantee: ALL 96 cells are directly selectable by some real
 * ingredient combo (verified over every multiset of the FOODS in
 * tests/unit/fart-select.test.ts). Reaching the "short + extreme" corners needs
 * the tiny single-note garnish foods (Cracker Crumb, Zap Pea) — without them a
 * small plate can't also be loud/musical/hot, since stats grow with plate size.
 * ORPHAN_HOMES stays as an (empty) safety net: if the food set ever changes and
 * a cell goes unreachable, home its clip onto the nearest reachable cell here.
 */

import type { FoodProperties } from '../state/food';
import { FART_GRID, type FartCell } from './fart-grid';

/**
 * Thresholds on the raw summed plate axes. Found by coordinate-descent over the
 * real recipe distribution (sensible spacing, minimize dead cells then maximize
 * the min hit count) — see scripts/fart-coverage.ts.
 */
export const FART_THRESHOLDS = {
  // length 4 buckets: short < L1 ≤ med < L2 ≤ long < L3 ≤ epic
  lengthL1: 8, lengthL2: 12, lengthL3: 16,
  // texture by dry/(wet+dry): < texWetMax → wet; < texDryMin → mixed; else dry
  texWetMax: 0.2, texDryMin: 0.42,
  // size: loud ≥ sizeBig → big, else small
  sizeBig: 6,
  // musical: musical ≥ musOn → tooty, else plain
  musOn: 4,
  // energy: temp ≥ energySput → sputter, else clean
  energySput: 7,
} as const;

/**
 * Safety net: any cell no real recipe can reach → home its clip onto the nearest
 * reachable cell so it still plays as a variant. Currently EMPTY — the basic
 * garnish foods make all 96 directly reachable (scripts/fart-coverage.ts).
 */
export const ORPHAN_HOMES: Readonly<Record<string, string>> = {};

const CELL_BY_ID = new Map<string, FartCell>(FART_GRID.map((c) => [c.id, c]));

/** home cell id → [home clip, ...orphan clips homed here]. Orphan ids are not keys. */
const POOLS: ReadonlyMap<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const c of FART_GRID) if (!(c.id in ORPHAN_HOMES)) m.set(c.id, [c.id]);
  for (const [orphan, home] of Object.entries(ORPHAN_HOMES)) {
    const pool = m.get(home);
    if (pool) pool.push(orphan);
  }
  return m;
})();

function lengthLevel(lengthSum: number): FartCell['length'] {
  const t = FART_THRESHOLDS;
  return lengthSum < t.lengthL1 ? 'short' : lengthSum < t.lengthL2 ? 'med' : lengthSum < t.lengthL3 ? 'long' : 'epic';
}

function textureLevel(props: FoodProperties): FartCell['texture'] {
  const denom = props.wet + props.dry;
  const dryRatio = denom > 0 ? props.dry / denom : 0.5;
  const t = FART_THRESHOLDS;
  return dryRatio < t.texWetMax ? 'wet' : dryRatio < t.texDryMin ? 'mixed' : 'dry';
}

/** The grid cell whose character matches this plate. */
export function selectFartCellId(props: FoodProperties): string {
  const t = FART_THRESHOLDS;
  const len = lengthLevel(props.length);
  const tex = textureLevel(props);
  const size = props.loud >= t.sizeBig ? 'big' : 'small';
  const mus = props.musical >= t.musOn ? 'musical' : 'plain';
  const sputter = props.temp >= t.energySput;
  const base = `g-${len}-${tex}-${size}-${mus}`;
  return sputter ? `${base}-sputter` : base;
}

/** The clips that may play for a given target cell (the cell + any homed orphans). */
export function fartPoolFor(cellId: string): string[] {
  return POOLS.get(cellId) ?? [cellId];
}

/**
 * Playback gain from loudness. The fart is the MAIN EVENT: the floor sits
 * above every contextual cue (voices peak at 0.725 via the sample-player
 * slider mapping) and a maxed plate hits full scale. Loudness still matters —
 * big plates are bigger — but no fart ever plays second fiddle.
 */
export function fartGain(props: FoodProperties): number {
  const loudNorm = Math.min(1, props.loud / 12);
  return Math.min(1.0, Math.max(0.75, 0.75 + loudNorm * 0.25));
}

export interface ResolvedFart {
  /** the clip file stem to play (sfx-grid/<clipId>.mp3) */
  clipId: string;
  /** the cell the recipe matched (may differ from clipId when a variant is picked) */
  cellId: string;
  gain: number;
  durationSeconds: number;
}

/** Resolve a plate's props to a concrete clip + gain. rng injected for tests. */
export function resolveFart(props: FoodProperties, rng: () => number = Math.random): ResolvedFart {
  const cellId = selectFartCellId(props);
  const pool = fartPoolFor(cellId);
  const clipId = pool.length === 1 ? pool[0]! : pool[Math.floor(rng() * pool.length) % pool.length]!;
  const cell = CELL_BY_ID.get(clipId) ?? CELL_BY_ID.get(cellId)!;
  return { clipId, cellId, gain: fartGain(props), durationSeconds: cell.durationSeconds };
}
