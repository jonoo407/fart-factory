import { describe, it, expect, beforeEach } from 'vitest';
import {
  getShopOffers,
  attemptPurchase,
  PRICES,
  type ShopOffer,
} from '../../src/state/shop';
import { getFood } from '../../src/state/food';
import { setGold, loadGold, loadPantry, unlockFood } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

// Shop now seeds from encounter idx, not date. Use specific indices.
const ENC_A = 5;
const ENC_B = 6;
const offersAt = (idx: number) => getShopOffers(new Date(), idx);

describe('PRICES (per-rarity pricing)', () => {
  it('uncommon < rare < epic', () => {
    expect(PRICES.uncommon!).toBeLessThan(PRICES.rare!);
    expect(PRICES.rare!).toBeLessThan(PRICES.epic!);
  });
  it('legendary is intentionally not offered in the shop', () => {
    // legendary unlock path is quest-based, not gold-based.
    expect(PRICES.legendary).toBeUndefined();
  });
});

describe('getShopOffers (daily roll: 3 uncommon + 1 rare + 0-1 epic)', () => {
  it('is deterministic for the same UTC day', () => {
    const a1 = offersAt(ENC_A);
    const a2 = offersAt(ENC_A);
    expect(a1.map((o) => o.foodId)).toEqual(a2.map((o) => o.foodId));
  });

  it('contains exactly 3 uncommon offerings', () => {
    const offers = offersAt(ENC_A);
    const uncommons = offers.filter((o) => getFood(o.foodId)?.rarity === 'uncommon');
    expect(uncommons).toHaveLength(3);
  });

  it('contains exactly 1 rare offering', () => {
    const offers = offersAt(ENC_A);
    const rares = offers.filter((o) => getFood(o.foodId)?.rarity === 'rare');
    expect(rares).toHaveLength(1);
  });

  it('contains 0 or 1 epic offerings (chance-based per encounter)', () => {
    // Sample many encounters — both 0-epic and 1-epic should appear.
    let zeros = 0;
    let ones = 0;
    for (let i = 0; i < 60; i++) {
      const offers = offersAt(i);
      const epics = offers.filter((o) => getFood(o.foodId)?.rarity === 'epic');
      if (epics.length === 0) zeros++;
      else if (epics.length === 1) ones++;
      else throw new Error(`Encounter ${i}: ${epics.length} epics (expected 0 or 1)`);
    }
    expect(zeros).toBeGreaterThan(5);
    expect(ones).toBeGreaterThan(5);
  });

  it('every offer has a price matching its rarity', () => {
    const offers = offersAt(ENC_A);
    for (const o of offers) {
      const food = getFood(o.foodId);
      expect(food).toBeDefined();
      expect(o.price).toBe(PRICES[food!.rarity]);
    }
  });

  it('filters out already-unlocked foods', () => {
    const offers = offersAt(ENC_A);
    if (offers.length === 0) throw new Error('expected offers');
    const firstOffer = offers[0]!;
    unlockFood(firstOffer.foodId);
    const after = offersAt(ENC_A);
    expect(after.map((o) => o.foodId)).not.toContain(firstOffer.foodId);
  });

  it('never offers legendary foods (quest-locked)', () => {
    for (let i = 0; i < 30; i++) {
      const offers = offersAt(i);
      for (const o of offers) {
        expect(getFood(o.foodId)?.rarity).not.toBe('legendary');
      }
    }
  });

  it('different days usually yield different offerings (smoke test)', () => {
    const a = offersAt(ENC_A).map((o) => o.foodId).sort().join(',');
    const b = offersAt(ENC_B).map((o) => o.foodId).sort().join(',');
    expect(a).not.toBe(b);
  });
});

describe('attemptPurchase (buy flow)', () => {
  it('refuses when gold is insufficient', () => {
    setGold(0);
    const offers = offersAt(ENC_A);
    const target = offers[0]!;
    const r = attemptPurchase(target.foodId, target.price);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('insufficient-gold');
    expect(loadGold()).toBe(0);
    expect(loadPantry()).not.toContain(target.foodId);
  });

  it('refuses when food is already unlocked', () => {
    setGold(1000);
    unlockFood('kimchi');
    const r = attemptPurchase('kimchi', PRICES.uncommon!);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('already-unlocked');
    expect(loadGold()).toBe(1000); // not deducted
  });

  it('refuses unknown food ids', () => {
    setGold(1000);
    const r = attemptPurchase('not-a-food-id', 10);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown-food');
  });

  it('deducts gold and unlocks food on success', () => {
    setGold(100);
    const offers = offersAt(ENC_A);
    const uncommon: ShopOffer = offers.find((o) => getFood(o.foodId)?.rarity === 'uncommon')!;
    const r = attemptPurchase(uncommon.foodId, uncommon.price);
    expect(r.ok).toBe(true);
    expect(loadGold()).toBe(100 - uncommon.price);
    expect(loadPantry()).toContain(uncommon.foodId);
  });
});
