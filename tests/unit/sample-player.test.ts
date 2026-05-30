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
    { id: 'tiny', name: 'Tiny',  prompt: '', durationMs: 500,  mood: 'embarrassed', file: 'tiny.mp3',  bytes: 1000, checksum: 'a', category: 'fart' },
    { id: 'mid1', name: 'Mid 1', prompt: '', durationMs: 1200, mood: 'comedic',     file: 'mid1.mp3',  bytes: 2000, checksum: 'b', category: 'fart' },
    { id: 'mid2', name: 'Mid 2', prompt: '', durationMs: 1500, mood: 'surprised',   file: 'mid2.mp3',  bytes: 2200, checksum: 'c', category: 'fart' },
    { id: 'long', name: 'Long',  prompt: '', durationMs: 2400, mood: 'triumphant',  file: 'long.mp3',  bytes: 4000, checksum: 'd', category: 'fart' },
    { id: 'fall', name: 'Fall',  prompt: '', durationMs: 1100, mood: 'comedic',     file: 'fall.mp3',  bytes: 0,    checksum: 'e', category: 'fart', proceduralFallback: true },
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

// Regression: the LAUNCH picker must only ever return *fart* samples. The
// manifest also contains audience reactions, per-audience signatures, voice
// lines, food + boss cues — none of those are the headline fart and must
// never be substituted for the launch sound. (Bug: with every manifest entry
// real, pickSampleId would happily return an applause/voice sample as "the
// fart", so the player heard the audience reaction but no fart.)
describe('pickSampleId only selects fart-category samples', () => {
  const FART_IDS = ['tiny-toot', 'wet-flapper', 'thunder-roll'];
  const mixed: Manifest = {
    version: 'v2',
    generatedAt: '2026-05-30T00:00:00Z',
    entries: [
      { id: 'tiny-toot',    name: 'Tiny Toot',   prompt: '', durationMs: 500,  mood: 'embarrassed', file: 'tiny-toot.mp3',    bytes: 1000, checksum: 'a', category: 'fart' },
      { id: 'wet-flapper',  name: 'Wet Flapper', prompt: '', durationMs: 1200, mood: 'comedic',     file: 'wet-flapper.mp3',  bytes: 2000, checksum: 'b', category: 'fart' },
      { id: 'thunder-roll', name: 'Thunder',     prompt: '', durationMs: 2400, mood: 'triumphant',  file: 'thunder-roll.mp3', bytes: 4000, checksum: 'c', category: 'fart' },
      // Distractors spread across every duration bucket — none are farts.
      { id: 'food-munch',              name: 'Munch',     prompt: '', durationMs: 600,  mood: 'comedic',    file: 'food-munch.mp3', bytes: 900,  checksum: 'd', category: 'food' },
      { id: 'sig-royal-court',         name: 'Sig Royal', prompt: '', durationMs: 1600, mood: 'enthralled', file: 'sig.mp3',        bytes: 1500, checksum: 'e', category: 'signature' },
      { id: 'toddler-giggle',          name: 'Giggle',    prompt: '', durationMs: 1500, mood: 'comedic',    file: 'giggle.mp3',     bytes: 1500, checksum: 'f', category: 'reaction' },
      { id: 'royal-court-applause',    name: 'Applause',  prompt: '', durationMs: 2400, mood: 'enthralled', file: 'applause.mp3',   bytes: 3000, checksum: 'g', category: 'reaction' },
      { id: 'voice-royal-court-loved', name: 'Voice',     prompt: '', durationMs: 6250, mood: 'voice',      file: 'voice.mp3',      bytes: 8000, checksum: 'h', category: 'voice' },
    ],
  };

  it('never returns a non-fart sample, across every length bucket', () => {
    for (let length = 1; length <= 10; length++) {
      for (let i = 0; i < 30; i++) {
        _resetLastSelected();
        const id = pickSampleId(
          { length, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 },
          mixed,
        );
        expect(id).not.toBeNull();
        expect(FART_IDS).toContain(id);
      }
    }
  });

  it('returns null rather than a non-fart when no fart matches', () => {
    const noFarts: Manifest = {
      version: 'v2',
      generatedAt: '2026-05-30T00:00:00Z',
      entries: [
        { id: 'sig-royal-court',      name: 'Sig',      prompt: '', durationMs: 1600, mood: 'enthralled', file: 'sig.mp3',      bytes: 1500, checksum: 'e', category: 'signature' },
        { id: 'royal-court-applause', name: 'Applause', prompt: '', durationMs: 2400, mood: 'enthralled', file: 'applause.mp3', bytes: 3000, checksum: 'g', category: 'reaction' },
      ],
    };
    _resetLastSelected();
    expect(
      pickSampleId({ length: 5, wetness: 5, volume: 5, stinkiness: 5, temp: 5, musical: 5 }, noFarts),
    ).toBeNull();
  });
});
