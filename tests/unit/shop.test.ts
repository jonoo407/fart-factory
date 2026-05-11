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

const DATE_A = new Date('2026-05-10T12:00:00Z');
const DATE_B = new Date('2026-05-11T12:00:00Z');

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
    const a1 = getShopOffers(DATE_A);
    const a2 = getShopOffers(DATE_A);
    expect(a1.map((o) => o.foodId)).toEqual(a2.map((o) => o.foodId));
  });

  it('contains exactly 3 uncommon offerings', () => {
    const offers = getShopOffers(DATE_A);
    const uncommons = offers.filter((o) => getFood(o.foodId)?.rarity === 'uncommon');
    expect(uncommons).toHaveLength(3);
  });

  it('contains exactly 1 rare offering', () => {
    const offers = getShopOffers(DATE_A);
    const rares = offers.filter((o) => getFood(o.foodId)?.rarity === 'rare');
    expect(rares).toHaveLength(1);
  });

  it('contains 0 or 1 epic offerings (chance-based per day)', () => {
    // Sample many days — both 0-epic days and 1-epic days should appear.
    let zeros = 0;
    let ones = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.UTC(2026, 4, 1) + i * 86_400_000);
      const offers = getShopOffers(d);
      const epics = offers.filter((o) => getFood(o.foodId)?.rarity === 'epic');
      if (epics.length === 0) zeros++;
      else if (epics.length === 1) ones++;
      else throw new Error(`Day ${i}: ${epics.length} epics (expected 0 or 1)`);
    }
    expect(zeros).toBeGreaterThan(5);
    expect(ones).toBeGreaterThan(5);
  });

  it('every offer has a price matching its rarity', () => {
    const offers = getShopOffers(DATE_A);
    for (const o of offers) {
      const food = getFood(o.foodId);
      expect(food).toBeDefined();
      expect(o.price).toBe(PRICES[food!.rarity]);
    }
  });

  it('filters out already-unlocked foods', () => {
    const offers = getShopOffers(DATE_A);
    if (offers.length === 0) throw new Error('expected offers');
    const firstOffer = offers[0]!;
    unlockFood(firstOffer.foodId);
    const after = getShopOffers(DATE_A);
    expect(after.map((o) => o.foodId)).not.toContain(firstOffer.foodId);
  });

  it('never offers legendary foods (quest-locked)', () => {
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000);
      const offers = getShopOffers(d);
      for (const o of offers) {
        expect(getFood(o.foodId)?.rarity).not.toBe('legendary');
      }
    }
  });

  it('different days usually yield different offerings (smoke test)', () => {
    const a = getShopOffers(DATE_A).map((o) => o.foodId).sort().join(',');
    const b = getShopOffers(DATE_B).map((o) => o.foodId).sort().join(',');
    expect(a).not.toBe(b);
  });
});

describe('attemptPurchase (buy flow)', () => {
  it('refuses when gold is insufficient', () => {
    setGold(0);
    const offers = getShopOffers(DATE_A);
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
    const offers = getShopOffers(DATE_A);
    const uncommon: ShopOffer = offers.find((o) => getFood(o.foodId)?.rarity === 'uncommon')!;
    const r = attemptPurchase(uncommon.foodId, uncommon.price);
    expect(r.ok).toBe(true);
    expect(loadGold()).toBe(100 - uncommon.price);
    expect(loadPantry()).toContain(uncommon.foodId);
  });
});
