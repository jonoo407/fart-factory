import { describe, it, expect } from 'vitest';
import { selectFartLayers, lengthBucket, type AxisLevels } from '../../src/audio/fart-stems';

const ax = (o: Partial<AxisLevels>): AxisLevels => ({
  wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0, ...o,
});

/**
 * PLAN v9 P6 / 02 §4 — the axis→readout selector logic.
 */
describe('lengthBucket', () => {
  it('partitions length into short / med / long', () => {
    expect(lengthBucket(0.1)).toBe('short');
    expect(lengthBucket(0.5)).toBe('med');
    expect(lengthBucket(0.9)).toBe('long');
  });
});

describe('selectFartLayers', () => {
  it('picks a wet base rip when wet dominates, dry when dry dominates', () => {
    expect(selectFartLayers(ax({ wet: 0.8, dry: 0.2, length: 0.9 })).base).toBe('rip-wet-long');
    expect(selectFartLayers(ax({ wet: 0.1, dry: 0.7, length: 0.1 })).base).toBe('rip-dry-short');
  });

  it('adds a melody only above the musical threshold (0.45)', () => {
    expect(selectFartLayers(ax({ musical: 0.4 })).melody).toBeNull();
    expect(selectFartLayers(ax({ musical: 0.9 })).melody).toBe('melody-6');
  });

  it('adds sizzle when hot (>0.30) and haze when stinky (>0.30)', () => {
    const hot = selectFartLayers(ax({ temp: 0.8, stink: 0.5 }));
    expect(hot.sizzle).toBe('sizzle-hi');
    expect(hot.haze).toBe('haze-lo');
    const mild = selectFartLayers(ax({ temp: 0.2, stink: 0.2 }));
    expect(mild.sizzle).toBeNull();
    expect(mild.haze).toBeNull();
  });

  it('gain = 0.18 + loud*0.7, capped at 1', () => {
    expect(selectFartLayers(ax({ loud: 0 })).gain).toBeCloseTo(0.18, 5);
    expect(selectFartLayers(ax({ loud: 0.5 })).gain).toBeCloseTo(0.53, 5);
    expect(selectFartLayers(ax({ loud: 2 })).gain).toBe(1);
  });
});
