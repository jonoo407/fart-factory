import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pickBaseVariant, type AxisLevels } from '../../src/audio/fart-stems';

const ax = (o: Partial<AxisLevels>): AxisLevels => ({
  wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0, ...o,
});

/**
 * Stem-bank extension (the architecturally-correct answer to "more variety +
 * length 10 should feel epic"): selectFartLayers stays pure and returns a base
 * FAMILY (e.g. rip-wet-long); pickBaseVariant resolves it to a concrete variant
 * that EXISTS in the manifest. Manifest-gated, so new variant assets light up as
 * they are generated — before any exist it returns the family unchanged (no
 * behaviour change / no regression). An `-xl` (epic, ~4.5s) variant wins only at
 * the very top of the length axis.
 */
describe('pickBaseVariant — stem variety + epic-long', () => {
  it('returns the family unchanged when no variants are generated yet', () => {
    const avail = ['rip-wet-long', 'rip-dry-long', 'melody-3'];
    expect(pickBaseVariant('rip-wet-long', avail, ax({ length: 0.9 }), () => 0.5)).toBe('rip-wet-long');
  });

  it('picks among existing variety variants (deterministic via rng)', () => {
    const avail = ['rip-wet-long', 'rip-wet-long-2', 'rip-wet-long-3'];
    expect(pickBaseVariant('rip-wet-long', avail, ax({ length: 0.7 }), () => 0)).toBe('rip-wet-long');
    expect(pickBaseVariant('rip-wet-long', avail, ax({ length: 0.7 }), () => 0.99)).toBe('rip-wet-long-3');
  });

  it('excludes the -xl epic variant from normal (non-maxed) selection', () => {
    const avail = ['rip-wet-long', 'rip-wet-long-xl'];
    for (const r of [0, 0.5, 0.99]) {
      expect(pickBaseVariant('rip-wet-long', avail, ax({ length: 0.7 }), () => r)).toBe('rip-wet-long');
    }
  });

  it('plays the -xl epic variant at the very top of the length axis', () => {
    const avail = ['rip-wet-long', 'rip-wet-long-xl'];
    expect(pickBaseVariant('rip-wet-long', avail, ax({ length: 1.0 }), () => 0)).toBe('rip-wet-long-xl');
    expect(pickBaseVariant('rip-wet-long', avail, ax({ length: 0.88 }), () => 0)).toBe('rip-wet-long-xl');
  });

  it('falls back to a regular variant at max length when no -xl exists yet', () => {
    const avail = ['rip-wet-long', 'rip-wet-long-2'];
    const got = pickBaseVariant('rip-wet-long', avail, ax({ length: 1.0 }), () => 0.9);
    expect(['rip-wet-long', 'rip-wet-long-2']).toContain(got);
    expect(got.endsWith('-xl')).toBe(false);
  });

  it('only matches the requested family, never a sibling bucket', () => {
    const avail = ['rip-wet-long', 'rip-wet-med', 'rip-wet-med-2', 'rip-dry-long'];
    expect(pickBaseVariant('rip-wet-med', avail, ax({ length: 0.5 }), () => 0.99)).toBe('rip-wet-med-2');
    expect(['rip-wet-med', 'rip-wet-med-2']).toContain(
      pickBaseVariant('rip-wet-med', avail, ax({ length: 0.5 }), () => 0.5),
    );
  });
});

/**
 * Integration guard over the REAL shipped stems: proves the variant assets are
 * generated and reachable through pickBaseVariant (so the variety + epic-long
 * behaviour is actually live, not just unit-logic).
 */
describe('pickBaseVariant against the real shipped manifest', () => {
  const manifest = JSON.parse(readFileSync(resolve('public/sfx/manifest.json'), 'utf8')) as {
    entries: { id: string; category?: string; proceduralFallback?: boolean }[];
  };
  const stemIds = manifest.entries
    .filter((e) => e.category === 'stem' && !e.proceduralFallback)
    .map((e) => e.id);

  it('ships >= 2 variants for the wet-long family (variety is reachable)', () => {
    const fam = stemIds.filter((id) => id === 'rip-wet-long' || id.startsWith('rip-wet-long-'));
    expect(fam.length).toBeGreaterThanOrEqual(2);
  });

  it('a maxed-length wet fart resolves to the epic -xl rip', () => {
    expect(pickBaseVariant('rip-wet-long', stemIds, ax({ length: 1.0 }), () => 0)).toBe('rip-wet-long-xl');
    expect(pickBaseVariant('rip-dry-long', stemIds, ax({ length: 1.0 }), () => 0)).toBe('rip-dry-long-xl');
  });

  it('a normal-length fart never resolves to the epic -xl', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickBaseVariant('rip-wet-long', stemIds, ax({ length: 0.7 }), Math.random).endsWith('-xl')).toBe(false);
    }
  });
});
