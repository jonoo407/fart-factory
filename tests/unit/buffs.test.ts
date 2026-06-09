import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyActiveBuffs,
  consumeBuffs,
  setActiveBuff,
  loadActiveBuffs,
  goldMultiplierFromBuffs,
  cancelOneRestrictionFromBuffs,
} from '../../src/scoring/buffs';
import type { FoodProperties } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

const zero: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };

describe('applyActiveBuffs (Phase 4)', () => {
  it('returns input untouched when no buffs are active', () => {
    const props = { ...zero, stink: 3 };
    expect(applyActiveBuffs(props)).toEqual(props);
  });

  it('property buff adds deltas (clamped to 0-5)', () => {
    setActiveBuff('hot-pepper-chew');
    const props = { ...zero, stink: 2 };
    const result = applyActiveBuffs(props);
    expect(result.stink).toBe(3); // 2 + 1 from hot-pepper-chew
    expect(result.temp).toBe(2); // 0 + 2 from hot-pepper-chew
  });

  it('adds the buff delta to a summed plate axis without capping at 5', () => {
    // These are SUMMED plate axes (a multi-food plate legitimately exceeds 5).
    // Capping the sum at 5 here made cravings unfillable; saturation is the
    // normalizer's job (÷AXIS_CAP). hot-pepper-chew = +2 temp, +1 stink.
    setActiveBuff('hot-pepper-chew');
    const props = { ...zero, stink: 5, temp: 5 };
    const result = applyActiveBuffs(props);
    expect(result.stink).toBe(6);
    expect(result.temp).toBe(7);
  });

  it('consumeBuffs clears active buffs', () => {
    setActiveBuff('hot-pepper-chew');
    expect(loadActiveBuffs()).toHaveLength(1);
    consumeBuffs();
    expect(loadActiveBuffs()).toHaveLength(0);
  });
});

describe('Non-property buff queries', () => {
  it('goldMultiplierFromBuffs returns 1 when no buff is active', () => {
    expect(goldMultiplierFromBuffs()).toBe(1);
  });

  it('goldMultiplierFromBuffs returns 1.2 when Watch Comedy is active', () => {
    setActiveBuff('watch-comedy');
    expect(goldMultiplierFromBuffs()).toBe(1.2);
  });

  it('Meditation buff adds +1 musical and +1 length (V8 T6 repurpose)', () => {
    // After Hard Mode removal, Meditation became a property buff instead.
    setActiveBuff('meditation');
    const result = applyActiveBuffs({ ...zero, musical: 1, length: 1 });
    expect(result.musical).toBe(2);
    expect(result.length).toBe(2);
  });

  it('cancelOneRestrictionFromBuffs reflects the Long Shower buff', () => {
    expect(cancelOneRestrictionFromBuffs()).toBe(false);
    setActiveBuff('long-shower');
    expect(cancelOneRestrictionFromBuffs()).toBe(true);
  });
});
