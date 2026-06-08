import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  pickSampleId,
  _resetLastSelected,
  type Manifest,
} from '../../src/audio/sample-player';

/**
 * Integration guard over the REAL shipped asset. Unit tests for pickSampleId
 * use hand-built fixtures; this one loads the actual public/sfx/manifest.json
 * and drives the real picker against it. It's the regression net for the bug
 * where Launch played an audience/voice clip instead of a fart: if a future
 * `npm run sfx:generate` drops `category` or mis-tags a fart, this fails.
 */
const manifest = JSON.parse(
  readFileSync(resolve('public/sfx/manifest.json'), 'utf8'),
) as Manifest;

const FART_IDS = new Set(
  manifest.entries.filter((e) => e.category === 'fart').map((e) => e.id),
);

beforeEach(() => {
  _resetLastSelected();
});

describe('shipped manifest.json integrity', () => {
  it('has entries', () => {
    expect(manifest.entries.length).toBeGreaterThan(0);
  });

  it('every entry carries a category', () => {
    const missing = manifest.entries.filter((e) => !e.category).map((e) => e.id);
    expect(missing).toEqual([]);
  });

  it('ships real (non-fallback) fart samples across all three duration buckets', () => {
    const farts = manifest.entries.filter(
      (e) => e.category === 'fart' && !e.proceduralFallback,
    );
    expect(farts.some((e) => e.durationMs <= 800)).toBe(true);
    expect(farts.some((e) => e.durationMs > 800 && e.durationMs <= 1700)).toBe(true);
    expect(farts.some((e) => e.durationMs > 1700)).toBe(true);
  });

  it('known headline farts are tagged fart; reactions/signatures/voices are not', () => {
    const cat = (id: string) => manifest.entries.find((e) => e.id === id)?.category;
    expect(cat('wet-flapper')).toBe('fart');
    expect(cat('thunder-roll')).toBe('fart');
    expect(cat('royal-court-applause')).not.toBe('fart');
    expect(cat('sig-royal-court')).not.toBe('fart');
    expect(cat('voice-royal-court-loved')).not.toBe('fart');
  });
});

describe('real pickSampleId against real manifest never returns a non-fart', () => {
  it('every pick across every length bucket is a fart-category sample', () => {
    for (let length = 1; length <= 10; length++) {
      for (let i = 0; i < 50; i++) {
        _resetLastSelected();
        const id = pickSampleId(
          { length, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
          manifest,
        );
        expect(id).not.toBeNull();
        expect(FART_IDS.has(id!)).toBe(true);
      }
    }
  });
});
