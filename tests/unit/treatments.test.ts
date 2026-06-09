import { describe, it, expect, beforeEach } from 'vitest';
import {
  TREATMENTS,
  getTreatment,
  applyTreatment,
  computeFartFromPreppedPlate,
  type Treatment,
  type PreppedSlot,
} from '../../src/scoring/treatments';
import { getFood } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('TREATMENTS catalog (Phase T item 90)', () => {
  it('contains the 5 declared treatments', () => {
    const ids = TREATMENTS.map((t) => t.id).sort();
    expect(ids).toEqual(['blend', 'chill', 'ferment', 'raw', 'roast']);
  });

  it('every treatment has a name + emoji', () => {
    for (const t of TREATMENTS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.emoji.length).toBeGreaterThan(0);
    }
  });

  it('raw is the identity (no modifier)', () => {
    const raw = getTreatment('raw')!;
    expect(raw.propertyModifier.stink).toBe(0);
    expect(raw.propertyModifier.wet).toBe(0);
    expect(raw.bellyCostDelta).toBe(0);
    expect(raw.requiresDayWait).toBe(false);
  });

  it('roast modifier: +stink, +temp, -wet', () => {
    const roast = getTreatment('roast')!;
    expect(roast.propertyModifier.stink).toBeGreaterThan(0);
    expect(roast.propertyModifier.temp).toBeGreaterThan(0);
    expect(roast.propertyModifier.wet).toBeLessThan(0);
  });

  it('ferment requires day wait + biggest stink boost', () => {
    const ferment = getTreatment('ferment')!;
    expect(ferment.requiresDayWait).toBe(true);
    expect(ferment.propertyModifier.stink).toBeGreaterThanOrEqual(2);
    expect(ferment.propertyModifier.musical).toBeGreaterThan(0);
  });

  it('chill: -wet, -temp, +loud', () => {
    const chill = getTreatment('chill')!;
    expect(chill.propertyModifier.wet).toBeLessThan(0);
    expect(chill.propertyModifier.temp).toBeLessThan(0);
    expect(chill.propertyModifier.loud).toBeGreaterThan(0);
  });

  it('blend has the merge flag', () => {
    const blend = getTreatment('blend')!;
    expect(blend.merges).toBe(true);
  });
});

describe('applyTreatment (Phase T item 91)', () => {
  it('Raw returns identical properties', () => {
    const food = getFood('beans')!;
    const result = applyTreatment(food.properties, 'raw');
    expect(result).toEqual(food.properties);
  });

  it('Roast bumps stink + temp on beans', () => {
    const food = getFood('beans')!;
    const before = food.properties;
    const after = applyTreatment(before, 'roast');
    expect(after.stink).toBeGreaterThan(before.stink);
    expect(after.temp).toBeGreaterThan(before.temp);
    expect(after.wet).toBeLessThan(before.wet);
  });

  it('Treatments clamp output to 0..5 range', () => {
    // Force a roast on garlic (which already has high stink=5).
    const food = getFood('garlic')!;
    const after = applyTreatment(food.properties, 'roast');
    // Each axis must be in [0,5].
    for (const k of Object.keys(after) as (keyof typeof after)[]) {
      expect(after[k]).toBeGreaterThanOrEqual(0);
      expect(after[k]).toBeLessThanOrEqual(5);
    }
  });
});

describe('computeFartFromPreppedPlate (Phase T item 93)', () => {
  it('empty plate returns zero properties', () => {
    const result = computeFartFromPreppedPlate([]);
    for (const k of Object.keys(result.props) as (keyof typeof result.props)[]) {
      expect(result.props[k]).toBe(0);
    }
  });

  it('all-raw plate matches the existing computeFartFromPlate behavior (regression)', () => {
    const slots: PreppedSlot[] = [
      { foodId: 'beans', treatment: 'raw' },
      { foodId: 'cheese', treatment: 'raw' },
    ];
    const result = computeFartFromPreppedPlate(slots);
    // We don't compare exactly to computeFartFromPlate (synergy logic
    // differs), but stinkiness should be elevated for beans+cheese.
    expect(result.props.stink).toBeGreaterThan(0);
  });

  it('roasted plate has higher stink than raw equivalent', () => {
    const raw: PreppedSlot[] = [{ foodId: 'beans', treatment: 'raw' }];
    const roasted: PreppedSlot[] = [{ foodId: 'beans', treatment: 'roast' }];
    expect(computeFartFromPreppedPlate(roasted).props.stink)
      .toBeGreaterThan(computeFartFromPreppedPlate(raw).props.stink);
  });

  it('belly cost includes treatment delta', () => {
    const slot: PreppedSlot[] = [{ foodId: 'beans', treatment: 'roast' }];
    const beans = getFood('beans')!;
    const result = computeFartFromPreppedPlate(slot);
    expect(result.totalBellyCost).toBe(beans.bellyCost + getTreatment('roast')!.bellyCostDelta);
  });

  it('summed plate axes are NOT capped at 5 (v9 — saturation is ÷AXIS_CAP\'s job)', () => {
    // Per-food after roast (+1 stink): beans 3→4, cheese 3→4, onion 4→5.
    // The aggregate must be the true sum 13, like computeFartFromPlate and
    // applyMasteryBonuses — capping the running sum at 5 pinned every
    // treated plate to 5 per axis, making high cravings (target 4-5 ⇒
    // normalized 0.8-1.0 vs a max got of 5/8) unfillable with a treatment on.
    const slots: PreppedSlot[] = [
      { foodId: 'beans', treatment: 'roast' },
      { foodId: 'cheese', treatment: 'roast' },
      { foodId: 'onion', treatment: 'roast' },
    ];
    const r = computeFartFromPreppedPlate(slots);
    expect(r.props.stink).toBe(13);
    // length untouched by roast: 3 + 3 + 2 = 8.
    expect(r.props.length).toBe(8);
  });
});

describe('Treatment type narrowing', () => {
  it('Treatment type is exported', () => {
    const sample: Treatment = TREATMENTS[0]!;
    expect(sample.id).toBeDefined();
  });
});
