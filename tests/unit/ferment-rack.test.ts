import { describe, it, expect, beforeEach } from 'vitest';
import {
  addToFermentRack,
  loadFermentRack,
  getReadyFerments,
  claimFerment,
  clearExpired,
  FERMENT_RACK_SIZE,
  FERMENT_TTL_DAYS,
} from '../../src/state/ferment-rack';

beforeEach(() => {
  localStorage.clear();
});

const D = (yyyy: number, m: number, d: number): Date =>
  new Date(Date.UTC(yyyy, m - 1, d, 12, 0, 0));

describe('Ferment rack (Phase T item 92)', () => {
  it('starts empty', () => {
    expect(loadFermentRack()).toEqual([]);
  });

  it('addToFermentRack stores foodId + startedAt', () => {
    const now = D(2026, 5, 12);
    const result = addToFermentRack('cheese', now);
    expect(result.ok).toBe(true);
    expect(loadFermentRack()).toHaveLength(1);
    expect(loadFermentRack()[0]!.foodId).toBe('cheese');
  });

  it('rack size is capped at FERMENT_RACK_SIZE (3)', () => {
    const now = D(2026, 5, 12);
    for (let i = 0; i < FERMENT_RACK_SIZE; i++) {
      addToFermentRack(`food-${i}`, now);
    }
    expect(loadFermentRack()).toHaveLength(FERMENT_RACK_SIZE);
    const overflow = addToFermentRack('extra', now);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('rack-full');
  });

  it('getReadyFerments returns items started on previous days', () => {
    const yesterday = D(2026, 5, 11);
    const today = D(2026, 5, 12);
    addToFermentRack('cheese', yesterday);
    const ready = getReadyFerments(today);
    expect(ready).toHaveLength(1);
    expect(ready[0]!.foodId).toBe('cheese');
  });

  it('getReadyFerments excludes items started today', () => {
    const today = D(2026, 5, 12);
    addToFermentRack('cheese', today);
    expect(getReadyFerments(today)).toHaveLength(0);
  });

  it('claimFerment removes the slot from the rack and returns the original food id', () => {
    const yesterday = D(2026, 5, 11);
    const today = D(2026, 5, 12);
    addToFermentRack('cheese', yesterday);
    const result = claimFerment(0, today);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.originalFoodId).toBe('cheese');
    expect(loadFermentRack()).toHaveLength(0);
  });

  it('claimFerment refuses if the slot is not yet ready', () => {
    const today = D(2026, 5, 12);
    addToFermentRack('cheese', today);
    const result = claimFerment(0, today);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-ready');
    expect(loadFermentRack()).toHaveLength(1);
  });

  it('claimFerment refuses invalid slot indices', () => {
    const r = claimFerment(99, D(2026, 5, 12));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-slot');
  });

  it('clearExpired removes items older than FERMENT_TTL_DAYS', () => {
    const dayZero = D(2026, 5, 1);
    addToFermentRack('cheese', dayZero);
    // 8 days later (beyond TTL=7) — expired.
    const dayN = D(2026, 5, 1 + FERMENT_TTL_DAYS + 1);
    clearExpired(dayN);
    expect(loadFermentRack()).toHaveLength(0);
  });

  it('clearExpired keeps items within the TTL window', () => {
    const dayZero = D(2026, 5, 1);
    addToFermentRack('cheese', dayZero);
    const dayN = D(2026, 5, 1 + FERMENT_TTL_DAYS - 1); // still within TTL
    clearExpired(dayN);
    expect(loadFermentRack()).toHaveLength(1);
  });
});
