import { describe, it, expect } from 'vitest';
import { computeFartFromPlate } from '../../src/scoring/fart-recipe';
import { getRecipe } from '../../src/state/recipes';

/**
 * V8 T7.b — Named Fart bonus application.
 *
 * When computeFartFromPlate detects a recipe (via matchRecipe), the
 * recipe's `bonus` vector is added to the props AFTER synergies and
 * BEFORE conflicts, floored at 0 (no 5-cap — v9 plate sums saturate at
 * normalization, ÷AXIS_CAP). The `Named Fart: <name>` entry is
 * appended to triggeredSynergies so the UI can announce it.
 */

describe('Named Fart bonus in computeFartFromPlate (V8 T7.b)', () => {
  it('triggers when a known recipe combo is on the plate', () => {
    // Swamp Beast = beans + cheese (common, +1 stink bonus)
    const r = computeFartFromPlate(['beans', 'cheese']);
    const swamp = getRecipe('swamp-beast')!;
    expect(r.triggeredSynergies).toContain(`Named Fart: ${swamp.name}`);
  });

  it('does NOT trigger for non-recipe plates', () => {
    const r = computeFartFromPlate(['beans']); // 1 food = no recipe
    const named = r.triggeredSynergies.filter((s) => s.startsWith('Named Fart:'));
    expect(named).toEqual([]);
  });

  it('common bonus (Swamp Beast) bumps stink relative to non-recipe baseline', () => {
    // beans alone: stink=3 from food, no synergies, no recipe
    const beansAlone = computeFartFromPlate(['beans']);
    // beans+cheese: triggers Beans+Dairy synergy (+2 stink, +2 wet) AND
    // Swamp Beast named fart (+1 stink).
    const swamp = computeFartFromPlate(['beans', 'cheese']);
    expect(swamp.props.stink).toBeGreaterThan(beansAlone.props.stink);
  });

  it('named-fart bonus adds on top of the unclamped sum (no 5-cap)', () => {
    // beans (stink:3) + cheese (stink:3) = sum stink 6, synergy +2 = 8,
    // named-fart bonus +1 = 9. The old [0,5] clamp turned the "+1 bonus"
    // into a cut from 8 down to 5.
    const r = computeFartFromPlate(['beans', 'cheese']);
    expect(r.props.stink).toBe(9);
  });

  it('rare-tier bonus (Volcano = +2 temp) shows up in the props', () => {
    // Volcano = hot-pepper + beans + cheese
    const baselineNoVolcano = computeFartFromPlate(['beans', 'cheese']);
    const volcano = computeFartFromPlate(['hot-pepper', 'beans', 'cheese']);
    // Higher temp than just beans+cheese.
    expect(volcano.props.temp).toBeGreaterThan(baselineNoVolcano.props.temp);
    const recipe = getRecipe('volcano')!;
    expect(volcano.triggeredSynergies).toContain(`Named Fart: ${recipe.name}`);
  });

  it('does not double-fire if the same plate is computed twice', () => {
    const r1 = computeFartFromPlate(['beans', 'cheese']);
    const r2 = computeFartFromPlate(['beans', 'cheese']);
    expect(r1.props).toEqual(r2.props);
    expect(r1.triggeredSynergies).toEqual(r2.triggeredSynergies);
  });

  it('order of ingredients does not change the result', () => {
    const a = computeFartFromPlate(['beans', 'cheese']);
    const b = computeFartFromPlate(['cheese', 'beans']);
    expect(a.props).toEqual(b.props);
  });

  it('empty plate produces no bonus and no Named Fart line', () => {
    const r = computeFartFromPlate([]);
    expect(r.triggeredSynergies).toEqual([]);
    for (const v of Object.values(r.props)) expect(v).toBe(0);
  });
});
