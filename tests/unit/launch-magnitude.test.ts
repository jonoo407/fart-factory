import { describe, it, expect, beforeEach } from 'vitest';
import { resolveLaunchProps } from '../../src/ui/plate';
import { computeFartFromPlate } from '../../src/scoring/fart-recipe';
import { selectFartCellId } from '../../src/audio/fart-select';

// INTEGRATION: exercise the real plate→launch resolution (resolveLaunchProps),
// not the selector in isolation. The score-clamp that pinned every plate axis
// to 5 (applyMasteryBonuses) lived HERE, between the recipe sum and the fart —
// a selector-only test could never see it. This is the test that should have
// caught "can't get a long fart / can't fill a craving".
beforeEach(() => localStorage.clear());

describe('launch resolution keeps the true plate magnitude (not capped at 5)', () => {
  it('a 4-bean plate resolves to its true summed length, well above 5', () => {
    // clean save → no mastery/buffs/treatments; default area (outside) is length×1.0
    const { props } = resolveLaunchProps(['beans', 'beans', 'beans', 'beans']);
    expect(props.length).toBeGreaterThan(5); // raw sum is 12
  });

  it('a high-wet plate can exceed the craving measure (wet > 5 so /AXIS_CAP can reach 1.0)', () => {
    // 4 sardines = wet 16 raw; even after Backyard wet×0.5 that is 8 (> 5)
    const { props } = resolveLaunchProps(['sardines', 'sardines', 'sardines', 'sardines']);
    expect(props.wet).toBeGreaterThan(5);
  });
});

describe('the fart the launch actually plays scales with the plate', () => {
  it('4 beans → a LONG fart', () => {
    expect(selectFartCellId(computeFartFromPlate(['beans', 'beans', 'beans', 'beans']).props)).toMatch(/^g-long-/);
  });
  it('4 cabbage → an EPIC fart', () => {
    expect(selectFartCellId(computeFartFromPlate(['cabbage', 'cabbage', 'cabbage', 'cabbage']).props)).toMatch(/^g-epic-/);
  });
  it('1 bean → a SHORT fart', () => {
    expect(selectFartCellId(computeFartFromPlate(['beans']).props)).toMatch(/^g-short-/);
  });
});
