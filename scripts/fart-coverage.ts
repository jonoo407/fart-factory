/**
 * Coverage harness for the fart-bank selector. Enumerates real ingredient
 * combos (the actual FOODS), runs each through the real recipe math
 * (computeFartFromPlate), maps the resulting props to a grid cell via candidate
 * thresholds, and reports which of the 96 clips are hit — so we can calibrate
 * the mapping until NO clip is dead (never selectable by any real recipe).
 *
 *   npx tsx scripts/fart-coverage.ts
 *
 * Pure computation — no API, no cost. This is a design tool; the durable
 * guarantee is the vitest coverage test that imports the real selector.
 */
import { FOODS, type FoodProperties } from '../src/state/food';
import { computeFartFromPlate } from '../src/scoring/fart-recipe';
import { FART_GRID } from '../src/audio/fart-grid';
import { AREAS } from '../src/state/containment';

const MAX_PLATE = 4; // a plate holds up to 4 foods; duplicates ARE allowed

// ---- enumerate MULTISETS (with repetition — the real plate allows duplicate
// foods, up to 4 slots), sizes 1..MAX_PLATE ----
const ids = FOODS.map((f) => f.id);
function* multisets(start: number, size: number, acc: string[]): Generator<string[]> {
  if (acc.length === size) { yield acc.slice(); return; }
  for (let i = start; i < ids.length; i++) { acc.push(ids[i]!); yield* multisets(i, size, acc); acc.pop(); }
}
const recipes: string[][] = [];
for (let size = 1; size <= MAX_PLATE; size++) for (const m of multisets(0, size, [])) recipes.push(m);

// ---- compute the 5 raw dimension drivers for each recipe ----
interface Row { lengthSum: number; loudSum: number; musicalSum: number; tempSum: number; dryRatio: number; }
const rows: Row[] = recipes.map((r) => {
  const p = computeFartFromPlate(r).props;
  return {
    lengthSum: p.length,
    loudSum: p.loud,
    musicalSum: p.musical,
    tempSum: p.temp,
    dryRatio: p.wet + p.dry > 0 ? p.dry / (p.wet + p.dry) : 0.5,
  };
});

function quantiles(vals: number[], qs: number[]): number[] {
  const s = [...vals].sort((a, b) => a - b);
  return qs.map((q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]!);
}
const col = (k: keyof Row) => rows.map((r) => r[k]);
function report(name: string, vals: number[]) {
  const [p10, p25, p50, p75, p90] = quantiles(vals, [0.1, 0.25, 0.5, 0.75, 0.9]);
  const min = Math.min(...vals), max = Math.max(...vals);
  console.log(`${name.padEnd(10)} min=${min.toFixed(2)} p10=${p10!.toFixed(2)} p25=${p25!.toFixed(2)} p50=${p50!.toFixed(2)} p75=${p75!.toFixed(2)} p90=${p90!.toFixed(2)} max=${max.toFixed(2)}`);
}

console.log(`recipes enumerated: ${recipes.length} (sizes 1..${MAX_PLATE}, with repetition)\n`);
console.log('=== raw dimension distributions ===');
report('lengthSum', col('lengthSum'));
report('loudSum', col('loudSum'));
report('musicalSum', col('musicalSum'));
report('tempSum', col('tempSum'));
report('dryRatio', col('dryRatio'));

// ---- threshold model + coordinate-descent search to MINIMIZE dead cells ----
interface TH {
  lengthL1: number; lengthL2: number; lengthL3: number;
  texWetMax: number; texDryMin: number;
  sizeBig: number; musOn: number; energySput: number;
}
const allCells = FART_GRID.map((c) => c.id);

function cellFor(r: Row, t: TH): string {
  const len = r.lengthSum < t.lengthL1 ? 'short' : r.lengthSum < t.lengthL2 ? 'med' : r.lengthSum < t.lengthL3 ? 'long' : 'epic';
  const tex = r.dryRatio < t.texWetMax ? 'wet' : r.dryRatio < t.texDryMin ? 'mixed' : 'dry';
  const size = r.loudSum >= t.sizeBig ? 'big' : 'small';
  const mus = r.musicalSum >= t.musOn ? 'musical' : 'plain';
  const en = r.tempSum >= t.energySput ? 'sputter' : 'clean';
  return en === 'sputter' ? `g-${len}-${tex}-${size}-${mus}-sputter` : `g-${len}-${tex}-${size}-${mus}`;
}
function hitMap(t: TH): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) { const id = cellFor(r, t); m.set(id, (m.get(id) ?? 0) + 1); }
  return m;
}
function evalConfig(t: TH): { dead: number; minHit: number; map: Map<string, number> } {
  const m = hitMap(t);
  let dead = 0, minHit = Infinity;
  for (const id of allCells) { const h = m.get(id) ?? 0; if (h === 0) dead++; minHit = Math.min(minHit, h); }
  return { dead, minHit, map: m };
}

const GRID: Record<keyof TH, number[]> = {
  lengthL1: [5, 6, 7, 8], lengthL2: [10, 11, 12, 13], lengthL3: [15, 16, 17, 18],
  texWetMax: [0.16, 0.20, 0.24, 0.28], texDryMin: [0.36, 0.42, 0.48, 0.55],
  sizeBig: [4, 5, 6, 7], musOn: [4, 5, 6, 7], energySput: [7, 8, 9, 10, 11],
};
// SENSIBLE spacing so buckets are real ranges, not razor-thin degenerate slices,
// and "dry" actually means dry (not a 72%-wet recipe).
function valid(t: TH): boolean {
  return t.lengthL2 - t.lengthL1 >= 3 && t.lengthL3 - t.lengthL2 >= 3 && t.texDryMin - t.texWetMax >= 0.12;
}
// Minimize dead first, then maximize the minimum hit count (robustness).
function score(t: TH): number { const e = evalConfig(t); return e.dead * 1e7 + (5000 - Math.min(5000, e.minHit)); }

let best: TH = { lengthL1: 7, lengthL2: 12, lengthL3: 16, texWetMax: 0.20, texDryMin: 0.42, sizeBig: 6, musOn: 5, energySput: 9 };
let bestScore = score(best);
for (let pass = 0; pass < 8; pass++) {
  let improved = false;
  for (const key of Object.keys(GRID) as (keyof TH)[]) {
    for (const v of GRID[key]) {
      const cand = { ...best, [key]: v };
      if (!valid(cand)) continue;
      const s = score(cand);
      if (s < bestScore) { best = cand; bestScore = s; improved = true; }
    }
  }
  if (!improved) break;
}

const { dead: deadN, map: hits } = evalConfig(best);
const dead = allCells.filter((id) => !(hits.get(id) ?? 0)).sort();
const thin = allCells.filter((id) => (hits.get(id) ?? 0) > 0 && (hits.get(id) ?? 0) < 20).sort();
const buckets = { '0': 0, '1-9': 0, '10-49': 0, '50-199': 0, '200+': 0 };
for (const id of allCells) { const h = hits.get(id) ?? 0; if (!h) buckets['0']++; else if (h < 10) buckets['1-9']++; else if (h < 50) buckets['10-49']++; else if (h < 200) buckets['50-199']++; else buckets['200+']++; }

console.log('\n=== best SENSIBLE-spacing thresholds (min dead, then max min-hit) ===');
console.log(JSON.stringify(best));
console.log(`HIT: ${96 - deadN}/96   DEAD: ${deadN}`);
console.log('hit-count histogram:', JSON.stringify(buckets));
if (dead.length) console.log('DEAD CELLS:\n  ' + dead.join('\n  '));
console.log(`THIN (<20 recipes): ${thin.length}` + (thin.length ? '\n  ' + thin.map((id) => `${id} (${hits.get(id)})`).join('\n  ') : ''));

// ---- home each DEAD clip onto its nearest REACHABLE cell (so it still plays) ----
const LEN_IDX: Record<string, number> = { short: 0, med: 1, long: 2, epic: 3 };
const byId = new Map(FART_GRID.map((c) => [c.id, c]));
const reachable = allCells.filter((id) => (hits.get(id) ?? 0) > 0);
function dist(a: string, b: string): number {
  const x = byId.get(a)!, y = byId.get(b)!;
  const dl = Math.abs(LEN_IDX[x.length]! - LEN_IDX[y.length]!) * 1.0;
  const df = Math.hypot(x.fp.texture - y.fp.texture, x.fp.size - y.fp.size, x.fp.musical - y.fp.musical, x.fp.energy - y.fp.energy);
  return dl + df;
}
const homes: Record<string, string> = {};
for (const d of dead) {
  let bestC = reachable[0]!, bestD = Infinity;
  for (const c of reachable) { const dd = dist(d, c); if (dd < bestD) { bestD = dd; bestC = c; } }
  homes[d] = bestC;
}
console.log('\n=== DEAD → nearest reachable HOME (orphan clips become variants here) ===');
console.log(JSON.stringify(homes, null, 2));

// ---- check the 4 historical orphan cells under the DEPLOYED thresholds ----
const DEPLOYED: TH = { lengthL1: 8, lengthL2: 12, lengthL3: 16, texWetMax: 0.2, texDryMin: 0.42, sizeBig: 6, musOn: 4, energySput: 7 };
const ORPHANS = [
  'g-epic-dry-small-plain',
  'g-short-dry-big-musical-sputter',
  'g-short-mixed-small-musical-sputter',
  'g-short-wet-big-plain-sputter',
];
// first example recipe that maps to each cell under DEPLOYED thresholds
const example = new Map<string, string[]>();
const deployHits = new Map<string, number>();
for (let i = 0; i < rows.length; i++) {
  const id = cellFor(rows[i]!, DEPLOYED);
  deployHits.set(id, (deployHits.get(id) ?? 0) + 1);
  if (!example.has(id)) example.set(id, recipes[i]!);
}
const deployDead = allCells.filter((id) => !(deployHits.get(id) ?? 0));
// recipes per length bucket (does length scale with plate size?)
const lenBuckets = { short: 0, med: 0, long: 0, epic: 0 } as Record<string, number>;
for (const r of rows) { const v = r.lengthSum; lenBuckets[v < DEPLOYED.lengthL1 ? 'short' : v < DEPLOYED.lengthL2 ? 'med' : v < DEPLOYED.lengthL3 ? 'long' : 'epic']++; }
console.log('\n=== DEPLOYED thresholds + new foods ===');
console.log(`length thresholds: ${JSON.stringify({ L1: DEPLOYED.lengthL1, L2: DEPLOYED.lengthL2, L3: DEPLOYED.lengthL3 })}  bucket spread: ${JSON.stringify(lenBuckets)}`);
console.log(`HIT: ${96 - deployDead.length}/96   DEAD: ${deployDead.length}`);
if (deployDead.length) console.log('DEAD:\n  ' + deployDead.sort().join('\n  '));
if (deployDead.length) console.log('STILL DEAD:\n  ' + deployDead.sort().join('\n  '));
console.log('\nThe 4 historical orphans now:');
for (const id of ORPHANS) {
  const h = deployHits.get(id) ?? 0;
  console.log(`  ${id}: ${h} recipes` + (h ? `  e.g. [${example.get(id)!.join(', ')}]` : '  STILL DEAD'));
}

// ---- AREA-AWARE coverage: the runtime selector sees area-MODIFIED props ----
function applyArea(p: FoodProperties, mod: { wet: number; dry: number; stink: number; loud: number; musical: number; length: number; temp: number }): Row {
  const wet = p.wet * mod.wet, dry = p.dry * mod.dry;
  return {
    lengthSum: p.length * mod.length,
    loudSum: p.loud * mod.loud,
    musicalSum: p.musical * mod.musical,
    tempSum: p.temp * mod.temp,
    dryRatio: wet + dry > 0 ? dry / (wet + dry) : 0.5,
  };
}
const rawProps = recipes.map((r) => computeFartFromPlate(r).props);
function coverageForAreas(areaIds: string[]): { hit: number; dead: string[] } {
  const seen = new Set<string>();
  for (const a of AREAS.filter((x) => areaIds.includes(x.id))) {
    for (const p of rawProps) seen.add(cellFor(applyArea(p, a.modifiers), DEPLOYED));
  }
  return { hit: seen.size, dead: allCells.filter((id) => !seen.has(id)) };
}
const HOMETOWN = ['outside', 'covers', 'library', 'restroom'];
const home = coverageForAreas(HOMETOWN);
const all = coverageForAreas(AREAS.map((a) => a.id));
console.log('\n=== AREA-AWARE coverage (runtime applies area modifiers) ===');
console.log(`Early game (4 hometown areas): ${home.hit}/96` + (home.dead.length ? ` — dead: ${home.dead.join(', ')}` : ' ✓'));
console.log(`All ${AREAS.length} areas (union):      ${all.hit}/96` + (all.dead.length ? ` — dead: ${all.dead.join(', ')}` : ' ✓'));

// ---- SWEEP length thresholds: balance coverage vs "length scales with plate" ----
console.log('\n=== length-threshold sweep (other thresholds fixed) ===');
const LEN_CANDS: [number, number, number][] = [[8, 12, 16], [7, 11, 15], [7, 10, 14], [6, 10, 14], [6, 9, 13], [5, 9, 13]];
for (const [L1, L2, L3] of LEN_CANDS) {
  const t: TH = { ...DEPLOYED, lengthL1: L1, lengthL2: L2, lengthL3: L3 };
  const spread = { short: 0, med: 0, long: 0, epic: 0 } as Record<string, number>;
  for (const r of rows) { const v = r.lengthSum; spread[v < L1 ? 'short' : v < L2 ? 'med' : v < L3 ? 'long' : 'epic']++; }
  const seenAll = new Set<string>();
  for (const a of AREAS) for (const p of rawProps) seenAll.add(cellFor(applyArea(p, a.modifiers), t));
  const deadAll = allCells.filter((id) => !seenAll.has(id));
  const seenHome = new Set<string>();
  for (const a of AREAS.filter((x) => HOMETOWN.includes(x.id))) for (const p of rawProps) seenHome.add(cellFor(applyArea(p, a.modifiers), t));
  const deadHome = allCells.filter((id) => !seenHome.has(id));
  const pct = (n: number) => (n / rows.length * 100).toFixed(0);
  console.log(`L=${L1}/${L2}/${L3}  allAreas:${96 - deadAll.length}/96  home:${96 - deadHome.length}/96  spread% short:${pct(spread.short)} med:${pct(spread.med)} long:${pct(spread.long)} epic:${pct(spread.epic)}`);
}
