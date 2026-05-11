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

const NOW = new Date('2026-05-12T12:00:00Z'); // date passed for signature; no longer used

describe('Ferment rack (encounter-anchored, post-PLAN_v5)', () => {
  it('starts empty', () => {
    expect(loadFermentRack()).toEqual([]);
  });

  it('addToFermentRack stores foodId + startedAtIdx', () => {
    const result = addToFermentRack('cheese', NOW, 0);
    expect(result.ok).toBe(true);
    expect(loadFermentRack()).toHaveLength(1);
    expect(loadFermentRack()[0]!.foodId).toBe('cheese');
    expect(loadFermentRack()[0]!.startedAtIdx).toBe(0);
  });

  it('rack size is capped at FERMENT_RACK_SIZE (3)', () => {
    for (let i = 0; i < FERMENT_RACK_SIZE; i++) {
      addToFermentRack(`food-${i}`, NOW, 0);
    }
    expect(loadFermentRack()).toHaveLength(FERMENT_RACK_SIZE);
    const overflow = addToFermentRack('extra', NOW, 0);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('rack-full');
  });

  it('getReadyFerments returns items placed in earlier encounters', () => {
    addToFermentRack('cheese', NOW, 0);
    const ready = getReadyFerments(undefined, 1); // now at encounter 1
    expect(ready).toHaveLength(1);
    expect(ready[0]!.foodId).toBe('cheese');
  });

  it('getReadyFerments excludes items placed in the current encounter', () => {
    addToFermentRack('cheese', NOW, 1);
    expect(getReadyFerments(undefined, 1)).toHaveLength(0);
  });

  it('claimFerment removes the slot + returns the original food id', () => {
    addToFermentRack('cheese', NOW, 0);
    const result = claimFerment(0, undefined, 1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.originalFoodId).toBe('cheese');
    expect(loadFermentRack()).toHaveLength(0);
  });

  it('claimFerment refuses if the slot is not yet ready', () => {
    addToFermentRack('cheese', NOW, 1);
    const result = claimFerment(0, undefined, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-ready');
  });

  it('claimFerment refuses invalid slot indices', () => {
    const r = claimFerment(99, undefined, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-slot');
  });

  it('clearExpired removes items older than FERMENT_TTL_DAYS encounters', () => {
    addToFermentRack('cheese', NOW, 0);
    clearExpired(undefined, FERMENT_TTL_DAYS + 1); // beyond TTL
    expect(loadFermentRack()).toHaveLength(0);
  });

  it('clearExpired keeps items within the TTL window', () => {
    addToFermentRack('cheese', NOW, 0);
    clearExpired(undefined, FERMENT_TTL_DAYS - 1); // still within TTL
    expect(loadFermentRack()).toHaveLength(1);
  });
});
