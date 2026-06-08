import { describe, it, expect } from 'vitest';
import { FOODS, type FoodProperties } from '../../src/state/food';
import { AUDIENCES } from '../../src/state/audience';
import { evaluateMatch } from '../../src/scoring/match';

/**
 * PLAN v9 P7 — balance guard. Under the new (harder) scorer every audience must
 * still be winnable: there must exist a plate of ≤4 foods that passes (≥50%)
 * with a perfect charge. A greedy search is a conservative lower bound (it
 * ignores recipe synergies, treatments and area modifiers, all of which only
 * help), so if greedy passes, the audience is comfortably beatable.
 */
function plateProps(ids: string[]): FoodProperties {
  const sum: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
  for (const id of ids) {
    const f = FOODS.find((x) => x.id === id);
    if (!f) continue;
    for (const k of Object.keys(sum) as (keyof FoodProperties)[]) sum[k] += f.properties[k];
  }
  return sum;
}

/** Greedily build the best ≤4-food plate for an audience (perfect charge). */
function greedyBest(audId: string): { pct: number; ids: string[] } {
  const aud = AUDIENCES.find((a) => a.id === audId)!;
  let ids: string[] = [];
  let best = { pct: evaluateMatch(plateProps([]), [], aud.cravings, aud.restrictions, 1.25).pct, ids: [] as string[] };
  for (let slot = 0; slot < 4; slot++) {
    let bestAdd: { pct: number; ids: string[] } | null = null;
    for (const f of FOODS) {
      const trial = [...ids, f.id];
      const pct = evaluateMatch(plateProps(trial), trial, aud.cravings, aud.restrictions, 1.25).pct;
      if (!bestAdd || pct > bestAdd.pct) bestAdd = { pct, ids: trial };
    }
    if (!bestAdd) break;
    ids = bestAdd.ids;
    if (bestAdd.pct > best.pct) best = bestAdd;
  }
  return best;
}

describe('balance — every audience is winnable', () => {
  for (const aud of AUDIENCES) {
    it(`${aud.name} has a passing plate (≥50%)`, () => {
      const best = greedyBest(aud.id);
      expect(best.pct, `best greedy plate for ${aud.name} = ${best.pct}% (${best.ids.join('+')})`).toBeGreaterThanOrEqual(50);
    });
  }
});
