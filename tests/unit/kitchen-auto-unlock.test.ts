import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordGoodLaunch,
  shouldAutoUnlockKitchen,
  loadGoodLaunchCount,
  KITCHEN_AUTO_UNLOCK_THRESHOLD,
} from '../../src/scoring/kitchen-unlock';
import { loadKitchenMode, setKitchenMode } from '../../src/ui/kitchen';

beforeEach(() => {
  localStorage.clear();
});

describe('Kitchen Mode auto-unlock (P9)', () => {
  it('starts with 0 good launches recorded', () => {
    expect(loadGoodLaunchCount()).toBe(0);
  });

  it('recordGoodLaunch only counts launches with match ≥ 50', () => {
    recordGoodLaunch(40);
    expect(loadGoodLaunchCount()).toBe(0);
    recordGoodLaunch(50);
    expect(loadGoodLaunchCount()).toBe(1);
    recordGoodLaunch(99);
    expect(loadGoodLaunchCount()).toBe(2);
  });

  it('shouldAutoUnlockKitchen returns false until threshold reached', () => {
    for (let i = 0; i < KITCHEN_AUTO_UNLOCK_THRESHOLD - 1; i++) recordGoodLaunch(60);
    expect(shouldAutoUnlockKitchen()).toBe(false);
    recordGoodLaunch(60);
    expect(shouldAutoUnlockKitchen()).toBe(true);
  });

  it('shouldAutoUnlockKitchen returns false if Kitchen Mode is already on', () => {
    for (let i = 0; i < KITCHEN_AUTO_UNLOCK_THRESHOLD; i++) recordGoodLaunch(60);
    setKitchenMode(true);
    expect(shouldAutoUnlockKitchen()).toBe(false);
  });

  it('auto-unlock fires once: after the app flips Kitchen Mode on, it never re-fires', () => {
    expect(loadKitchenMode()).toBe(false);
    for (let i = 0; i < KITCHEN_AUTO_UNLOCK_THRESHOLD; i++) recordGoodLaunch(60);
    expect(shouldAutoUnlockKitchen()).toBe(true);
    // The app consumes the unlock by enabling Kitchen Mode (onStoryLaunch flow).
    setKitchenMode(true);
    expect(shouldAutoUnlockKitchen()).toBe(false);
    // More good launches don't re-arm it.
    recordGoodLaunch(90);
    expect(shouldAutoUnlockKitchen()).toBe(false);
  });
});
