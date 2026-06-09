import { describe, it, expect } from 'vitest';
import { AREAS, getArea } from '../../src/state/containment';

// (Catalog size/region-shape invariants live in locations.test.ts; this file
// covers the area MODIFIER contract.)
describe('AREAS catalog', () => {
  it('every area has unique id + non-empty name + emoji', () => {
    const ids = AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of AREAS) {
      expect(a.id.length).toBeGreaterThan(0);
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
    }
  });

  it('every area has well-shaped modifiers', () => {
    for (const a of AREAS) {
      const m = a.modifiers;
      for (const axis of ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'] as const) {
        expect(typeof m[axis]).toBe('number');
        expect(m[axis]).toBeGreaterThan(0); // no zero-out by area
        expect(m[axis]).toBeLessThanOrEqual(5); // bounded amplification
      }
      expect(typeof m.scoreOffset).toBe('number');
    }
  });

  it('library has a score-offset penalty for loudness', () => {
    const lib = getArea('library');
    expect(lib).toBeDefined();
    expect(lib!.modifiers.scoreOffset).toBeLessThan(0);
  });

  it('elevator amplifies stink most aggressively', () => {
    const elev = getArea('elevator');
    expect(elev).toBeDefined();
    expect(elev!.modifiers.stink).toBeGreaterThanOrEqual(3);
  });
});
