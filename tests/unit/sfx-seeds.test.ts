import { describe, it, expect } from 'vitest';
import { SEEDS } from '../../scripts/sfx-seeds';

describe('SFX seeds catalog (Phase K — Library Richness)', () => {
  it('has ≥20 named effects (A28 Library Richness gate)', () => {
    expect(SEEDS.length).toBeGreaterThanOrEqual(20);
  });

  it('every seed has unique id', () => {
    const ids = SEEDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every seed has a non-empty prompt and a positive duration', () => {
    for (const s of SEEDS) {
      expect(s.prompt.length).toBeGreaterThan(0);
      expect(s.duration_seconds).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('covers all 3 duration buckets (short ≤0.5s, medium 0.5-1.5s, long >1.5s)', () => {
    const short = SEEDS.filter((s) => s.duration_seconds <= 0.5);
    const medium = SEEDS.filter((s) => s.duration_seconds > 0.5 && s.duration_seconds <= 1.5);
    const long = SEEDS.filter((s) => s.duration_seconds > 1.5);
    expect(short.length).toBeGreaterThanOrEqual(1);
    expect(medium.length).toBeGreaterThanOrEqual(1);
    expect(long.length).toBeGreaterThanOrEqual(1);
  });

  it('covers ≥5 distinct moods (Library Richness — variety)', () => {
    const moods = new Set(SEEDS.map((s) => s.mood));
    expect(moods.size).toBeGreaterThanOrEqual(5);
  });

  it('includes the new Phase K audience-reaction seeds', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    // At least these 6 audience-reaction seeds from PLAN.md Phase K item 61.
    const required = [
      'granny-cackle',
      'royal-court-applause',
      'frat-howl',
      'haunted-mansion-moan',
      'alien-tourists-gasp',
      'toddler-giggle',
    ];
    for (const r of required) {
      expect(ids.has(r)).toBe(true);
    }
  });

  it('includes food-eating SFX seeds (Phase K item 62)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    const required = ['food-munch', 'food-crunch', 'food-slurp', 'food-gulp'];
    for (const r of required) {
      expect(ids.has(r)).toBe(true);
    }
  });

  it('includes legendary-fanfare SFX seeds (Phase K item 63)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    expect(ids.has('legendary-fanfare')).toBe(true);
    expect(ids.has('quest-claimed')).toBe(true);
  });

  it('includes 5 per-boss entrance SFX seeds (PLAN_v5 P8)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    expect(ids.has('boss-entrance-granny')).toBe(true);
    expect(ids.has('boss-entrance-royal')).toBe(true);
    expect(ids.has('boss-entrance-haunted')).toBe(true);
    expect(ids.has('boss-entrance-volcano')).toBe(true);
    expect(ids.has('boss-entrance-cosmic')).toBe(true);
  });
});
