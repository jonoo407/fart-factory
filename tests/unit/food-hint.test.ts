import { describe, it, expect, beforeEach } from 'vitest';
import { recommendFoodsForAudience, getLaunchCount, incrementLaunchCount, shouldShowHint } from '../../src/scoring/food-hint';
import { AUDIENCES } from '../../src/state/audience';

beforeEach(() => {
  localStorage.clear();
});

describe('recommendFoodsForAudience (P7)', () => {
  it('returns 2-3 foods matching the audience\'s strongest cravings', () => {
    const aud = AUDIENCES.find((a) => a.id === 'librarians')!;
    const recs = recommendFoodsForAudience(aud, new Set(['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage']));
    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it('only recommends UNLOCKED foods (intersection with pantry)', () => {
    const aud = AUDIENCES.find((a) => a.id === 'librarians')!;
    const pantry = new Set(['beans', 'cheese']); // just 2
    const recs = recommendFoodsForAudience(aud, pantry);
    for (const food of recs) {
      expect(pantry.has(food.id)).toBe(true);
    }
  });

  it('returns empty array on empty pantry (defensive)', () => {
    const aud = AUDIENCES.find((a) => a.id === 'librarians')!;
    const recs = recommendFoodsForAudience(aud, new Set());
    expect(recs).toEqual([]);
  });
});

describe('Launch-count + hint-visibility (P7)', () => {
  it('getLaunchCount defaults to 0', () => {
    expect(getLaunchCount()).toBe(0);
  });

  it('incrementLaunchCount persists', () => {
    incrementLaunchCount();
    incrementLaunchCount();
    expect(getLaunchCount()).toBe(2);
  });

  it('shouldShowHint returns true for launches 0-2', () => {
    expect(shouldShowHint()).toBe(true);
    incrementLaunchCount();
    expect(shouldShowHint()).toBe(true);
    incrementLaunchCount();
    expect(shouldShowHint()).toBe(true);
  });

  it('shouldShowHint returns false from launch 3+', () => {
    for (let i = 0; i < 3; i++) incrementLaunchCount();
    expect(shouldShowHint()).toBe(false);
  });

  it('shouldShowHint returns false once player has hit ≥60% match', () => {
    incrementLaunchCount();
    // Simulate a 65% best-overall match.
    localStorage.setItem('fart_best_overall', '65');
    expect(shouldShowHint()).toBe(false);
  });
});
