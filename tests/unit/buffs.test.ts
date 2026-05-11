import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyActiveBuffs,
  consumeBuffs,
  setActiveBuff,
  loadActiveBuffs,
  goldMultiplierFromBuffs,
  isEasyModeForceFromBuffs,
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

  it('clamps to 0-5 range on overflow', () => {
    setActiveBuff('hot-pepper-chew');
    const props = { ...zero, stink: 5, temp: 5 };
    const result = applyActiveBuffs(props);
    expect(result.stink).toBe(5);
    expect(result.temp).toBe(5);
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

  it('isEasyModeForceFromBuffs reflects the Meditation buff', () => {
    expect(isEasyModeForceFromBuffs()).toBe(false);
    setActiveBuff('meditation');
    expect(isEasyModeForceFromBuffs()).toBe(true);
  });

  it('cancelOneRestrictionFromBuffs reflects the Long Shower buff', () => {
    expect(cancelOneRestrictionFromBuffs()).toBe(false);
    setActiveBuff('long-shower');
    expect(cancelOneRestrictionFromBuffs()).toBe(true);
  });
});
