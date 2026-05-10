import { describe, it, expect, beforeEach } from 'vitest';
import {
  pickSampleId,
  _resetLastSelected,
  _getLastSelected,
  type Manifest,
} from '../../src/audio/sample-player';

const manifest: Manifest = {
  version: 'v1',
  generatedAt: '2026-05-10T00:00:00Z',
  entries: [
    { id: 'tiny', name: 'Tiny',  prompt: '', durationMs: 500,  mood: 'embarrassed', file: 'tiny.mp3',  bytes: 1000, checksum: 'a' },
    { id: 'mid1', name: 'Mid 1', prompt: '', durationMs: 1200, mood: 'comedic',     file: 'mid1.mp3',  bytes: 2000, checksum: 'b' },
    { id: 'mid2', name: 'Mid 2', prompt: '', durationMs: 1500, mood: 'surprised',   file: 'mid2.mp3',  bytes: 2200, checksum: 'c' },
    { id: 'long', name: 'Long',  prompt: '', durationMs: 2400, mood: 'triumphant',  file: 'long.mp3',  bytes: 4000, checksum: 'd' },
    { id: 'fall', name: 'Fall',  prompt: '', durationMs: 1100, mood: 'comedic',     file: 'fall.mp3',  bytes: 0,    checksum: 'e', proceduralFallback: true },
  ],
};

beforeEach(() => {
  _resetLastSelected();
});

describe('pickSampleId', () => {
  it('returns short-bucket sample for low length', () => {
    const id = pickSampleId(
      { length: 1, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
      manifest,
    );
    expect(id).toBe('tiny');
  });

  it('returns medium-bucket sample for mid length', () => {
    const id = pickSampleId(
      { length: 5, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
      manifest,
    );
    expect(['mid1', 'mid2']).toContain(id);
  });

  it('returns long-bucket sample for high length', () => {
    const id = pickSampleId(
      { length: 10, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
      manifest,
    );
    expect(id).toBe('long');
  });

  it('skips entries flagged proceduralFallback', () => {
    // Force medium bucket; only mid1 + mid2 (and fall, which is fallback) are
    // in scope. Repeat many times: never picks 'fall'.
    for (let i = 0; i < 50; i++) {
      _resetLastSelected();
      const id = pickSampleId(
        { length: 5, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
        manifest,
      );
      expect(id).not.toBe('fall');
    }
  });

  it('does not pick the same sample twice in a row (no-immediate-repeat)', () => {
    // Many medium-bucket runs; every successive pick differs from the prior.
    let prev: string | null = null;
    for (let i = 0; i < 20; i++) {
      const id = pickSampleId(
        { length: 5, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
        manifest,
      );
      if (prev) expect(id).not.toBe(prev);
      prev = id;
    }
  });

  it('records last-selected id', () => {
    const id = pickSampleId(
      { length: 1, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
      manifest,
    );
    expect(_getLastSelected()).toBe(id);
  });

  it('falls back to any non-fallback entry when bucket is exhausted', () => {
    // Empty short bucket but pick last-selected = 'tiny' so the bucket has zero candidates.
    _resetLastSelected();
    pickSampleId(
      { length: 1, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
      manifest,
    );
    // Now lastSelectedId is 'tiny' and the only short-bucket entry is 'tiny';
    // pickSampleId should fall back to medium / long bucket entries.
    const id = pickSampleId(
      { length: 1, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
      manifest,
    );
    expect(id).not.toBe('tiny');
    expect(['mid1', 'mid2', 'long']).toContain(id);
  });
});
