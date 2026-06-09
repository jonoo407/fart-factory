import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDiscoveredAxes,
  isAxisDiscovered,
  discoverAxesFromFart,
  DEFAULT_DISCOVERED,
  type AxisName,
} from '../../src/state/axis-discovery';
import type { FoodProperties } from '../../src/state/food';

const props = (
  wet: number, dry: number, stink: number, loud: number,
  musical: number, length: number, temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

beforeEach(() => {
  localStorage.clear();
});

describe('axis discovery (V8 T1.b — Scheme 1)', () => {
  it('default discovered axes are wet, loud, stink', () => {
    expect(loadDiscoveredAxes().sort()).toEqual(['loud', 'stink', 'wet']);
  });

  it('DEFAULT_DISCOVERED export matches', () => {
    expect([...DEFAULT_DISCOVERED].sort()).toEqual(['loud', 'stink', 'wet']);
  });

  it('isAxisDiscovered returns true for defaults, false for hidden axes', () => {
    expect(isAxisDiscovered('wet')).toBe(true);
    expect(isAxisDiscovered('loud')).toBe(true);
    expect(isAxisDiscovered('stink')).toBe(true);
    expect(isAxisDiscovered('musical')).toBe(false);
    expect(isAxisDiscovered('length')).toBe(false);
    expect(isAxisDiscovered('temp')).toBe(false);
    expect(isAxisDiscovered('dry')).toBe(false);
  });

  it('discoverAxesFromFart adds new axes that registered >= 1', () => {
    const result = discoverAxesFromFart(props(0, 0, 0, 0, 3, 2, 0));
    expect(result.added.sort()).toEqual(['length', 'musical']);
    expect(result.list.sort()).toEqual(['length', 'loud', 'musical', 'stink', 'wet']);
  });

  it('discoverAxesFromFart does not re-discover existing axes', () => {
    const result = discoverAxesFromFart(props(5, 0, 5, 5, 0, 0, 0));
    expect(result.added).toEqual([]);
  });

  it('axes registering 0 are not discovered', () => {
    discoverAxesFromFart(props(1, 0, 0, 1, 0, 0, 0));
    expect(isAxisDiscovered('dry')).toBe(false);
    expect(isAxisDiscovered('musical')).toBe(false);
  });

  it('persists across reads (localStorage round-trip)', () => {
    discoverAxesFromFart(props(0, 0, 0, 0, 2, 0, 0));
    expect(isAxisDiscovered('musical')).toBe(true);
    // Simulate a fresh module read
    expect(loadDiscoveredAxes()).toContain('musical');
  });

  it('idempotent — same fart twice produces no extra additions', () => {
    const fart = props(0, 0, 0, 0, 3, 3, 0);
    const r1 = discoverAxesFromFart(fart);
    const r2 = discoverAxesFromFart(fart);
    expect(r1.added.sort()).toEqual(['length', 'musical']);
    expect(r2.added).toEqual([]);
  });

  it('clearing the store restores the default discovered axes', () => {
    discoverAxesFromFart(props(0, 5, 5, 0, 5, 0, 5));
    localStorage.removeItem('fart_axes_discovered');
    expect(loadDiscoveredAxes().sort()).toEqual(['loud', 'stink', 'wet']);
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem('fart_axes_discovered', '{not json');
    expect(loadDiscoveredAxes().sort()).toEqual(['loud', 'stink', 'wet']);
  });

  it('survives malformed array (non-axis strings)', () => {
    localStorage.setItem('fart_axes_discovered', '["wet","loud","banana"]');
    // Filtered to valid axis names only.
    const list = loadDiscoveredAxes();
    expect(list).not.toContain('banana');
    expect(list).toContain('wet');
    expect(list).toContain('loud');
  });

  it('AxisName type narrows correctly', () => {
    const a: AxisName = 'musical';
    expect(a).toBe('musical');
  });
});
