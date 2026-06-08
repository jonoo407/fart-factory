import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFoodReveals,
  revealNextAxis,
  isFoodFullyRevealed,
  resetFoodReveals,
} from '../../src/state/food-reveals';
import type { FoodProperties } from '../../src/state/food';

const p = (wet = 0, dry = 0, stink = 0, loud = 0, musical = 0, length = 0, temp = 0): FoodProperties => ({
  wet, dry, stink, loud, musical, length, temp,
});

/**
 * PLAN v9 P3 / 01 §6 — per-food reveal-on-use. Each launch reveals the single
 * highest-value not-yet-revealed non-zero axis of each plated food, strongest
 * first. Drives the inline pantry strip + the Field Guide.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('food reveals (reveal-on-use, strongest first)', () => {
  it('starts with nothing revealed', () => {
    expect(loadFoodReveals('broccoli')).toEqual([]);
  });

  it('reveals the strongest axis first, one per call', () => {
    const props = p(1, 1, 2, 1, 3, 2, 1); // musical:3 is the strongest
    expect(revealNextAxis('broccoli', props)).toEqual({ axis: 'musical', value: 3 });
    expect(loadFoodReveals('broccoli')).toEqual(['musical']);
    // next strongest non-zero: stink:2 and length:2 tie → AXIS_ORDER puts stink first
    expect(revealNextAxis('broccoli', props)).toEqual({ axis: 'stink', value: 2 });
    expect(revealNextAxis('broccoli', props)).toEqual({ axis: 'length', value: 2 });
  });

  it('only reveals non-zero axes, and returns null once all are revealed', () => {
    const props = p(0, 0, 5, 0, 0, 0, 0); // only stink
    expect(revealNextAxis('egg', props)).toEqual({ axis: 'stink', value: 5 });
    expect(revealNextAxis('egg', props)).toBeNull();
    expect(loadFoodReveals('egg')).toEqual(['stink']);
  });

  it('isFoodFullyRevealed flips true when every non-zero axis is known', () => {
    const props = p(0, 0, 3, 0, 2, 0, 0); // stink + musical
    expect(isFoodFullyRevealed('cabbage', props)).toBe(false);
    revealNextAxis('cabbage', props); // stink
    expect(isFoodFullyRevealed('cabbage', props)).toBe(false);
    revealNextAxis('cabbage', props); // musical
    expect(isFoodFullyRevealed('cabbage', props)).toBe(true);
  });

  it('is per-food and survives corrupt JSON', () => {
    revealNextAxis('broccoli', p(0, 0, 0, 0, 3));
    expect(loadFoodReveals('beans')).toEqual([]);
    localStorage.setItem('fart_food_reveals_beans', '{bad');
    expect(loadFoodReveals('beans')).toEqual([]);
  });

  it('resetFoodReveals clears a food', () => {
    revealNextAxis('broccoli', p(0, 0, 0, 0, 3));
    resetFoodReveals('broccoli');
    expect(loadFoodReveals('broccoli')).toEqual([]);
  });
});
