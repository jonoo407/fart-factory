import { describe, it, expect } from 'vitest';
import {
  FART_GRID,
  LENGTHS,
  TEXTURES,
  SIZES,
  MUSICALS,
  ENERGIES,
} from '../../src/audio/fart-grid';

// Data-shape guarantees for the fart bank grid (the source of truth the
// generator + the runtime selector both depend on). Behavioural tests for the
// selector live separately once it exists.
describe('fart grid registry', () => {
  it('has exactly 96 cells (4 length × 3 texture × 2 size × 2 musical × 2 energy)', () => {
    expect(FART_GRID.length).toBe(
      LENGTHS.length * TEXTURES.length * SIZES.length * MUSICALS.length * ENERGIES.length,
    );
    expect(FART_GRID.length).toBe(96);
  });

  it('every id is unique', () => {
    expect(new Set(FART_GRID.map((c) => c.id)).size).toBe(FART_GRID.length);
  });

  it('clean cells keep the 4-part id; sputter cells add a -sputter suffix', () => {
    for (const c of FART_GRID) {
      const base = `g-${c.length}-${c.texture}-${c.size}-${c.musical}`;
      expect(c.id).toBe(c.energy === 'sputter' ? `${base}-sputter` : base);
    }
  });

  it('the 48 clean cells reuse the original first-generation ids (no -sputter)', () => {
    const clean = FART_GRID.filter((c) => c.energy === 'clean');
    expect(clean.length).toBe(48);
    expect(clean.every((c) => !c.id.endsWith('-sputter'))).toBe(true);
  });

  it('covers all 4 length buckets with 24 cells each', () => {
    for (const len of LENGTHS) {
      expect(FART_GRID.filter((c) => c.length === len).length).toBe(24);
    }
  });

  it('fingerprint coords are all in [0,1]', () => {
    for (const c of FART_GRID) {
      for (const v of [c.fp.texture, c.fp.size, c.fp.musical, c.fp.energy]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('each fingerprint combination is distinct within a length bucket', () => {
    const keys = FART_GRID.map(
      (c) => `${c.length}|${c.fp.texture}|${c.fp.size}|${c.fp.musical}|${c.fp.energy}`,
    );
    expect(new Set(keys).size).toBe(FART_GRID.length);
  });

  it('durations increase across length buckets', () => {
    const dur = (len: string) => FART_GRID.find((c) => c.length === len)!.durationSeconds;
    expect(dur('short')).toBeLessThan(dur('med'));
    expect(dur('med')).toBeLessThan(dur('long'));
    expect(dur('long')).toBeLessThan(dur('epic'));
  });
});
