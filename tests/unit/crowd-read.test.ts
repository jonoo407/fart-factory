import { describe, it, expect } from 'vitest';
import {
  plateKey,
  jitterForPlate,
  computeCrowdRead,
  crowdMoodCaption,
  MOOD_EMOJI,
  TREND_ARROW,
} from '../../src/scoring/crowd-read';
import { audienceReaction } from '../../src/scoring/audience-reactions';
import { CROWD_READ } from '../../src/scoring/tuning';

/**
 * The Live Show — the crowd-read preview must be a HINT, not an oracle:
 * tier-only, with a deterministic ± jitter applied before bucketing that is
 * stable per (encounter seed, plate composition) so the mood can never be
 * rerolled or binary-searched near a tier cutoff.
 */
describe('plateKey — order-insensitive plate identity', () => {
  it('the same foods in any order produce the same key', () => {
    expect(plateKey(['beans', 'cheese'], 'roast')).toBe(plateKey(['cheese', 'beans'], 'roast'));
  });

  it('treatment is part of the identity (swapping it re-jitters)', () => {
    expect(plateKey(['beans'], 'roast')).not.toBe(plateKey(['beans'], 'chill'));
    expect(plateKey(['beans'], null)).not.toBe(plateKey(['beans'], 'roast'));
  });
});

describe('jitterForPlate — bounded, deterministic, plate-keyed', () => {
  it('stays within ±CROWD_READ.jitterPct across many plates and seeds', () => {
    for (let seed = 1; seed < 200; seed++) {
      const j = jitterForPlate(seed, `food-${seed}|`);
      expect(Math.abs(j)).toBeLessThanOrEqual(CROWD_READ.jitterPct);
    }
  });

  it('is stable: the same seed + key always returns the same jitter (no rerolls)', () => {
    const a = jitterForPlate(12345, 'beans+cheese|roast');
    const b = jitterForPlate(12345, 'beans+cheese|roast');
    expect(a).toBe(b);
  });

  it('varies across plate keys (the fuzz is per-plate, not global)', () => {
    const values = new Set<number>();
    for (let i = 0; i < 50; i++) values.add(jitterForPlate(99, `plate-${i}|`));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('computeCrowdRead — tier bucketing + trend on jittered values', () => {
  it('buckets the jittered pct with the SAME cutoffs as the post-launch reaction', () => {
    for (const raw of [5, 25, 45, 65, 95]) {
      const read = computeCrowdRead(raw, 0, 777, 'beans|', null);
      expect(read.tier).toBe(audienceReaction(read.jitteredPct, null).tier);
    }
  });

  it('clamps the jittered pct into 0-100', () => {
    expect(computeCrowdRead(0, 0, 1, 'k|', null).jitteredPct).toBeGreaterThanOrEqual(0);
    expect(computeCrowdRead(100, 0, 1, 'k|', null).jitteredPct).toBeLessThanOrEqual(100);
  });

  it('trend compares jittered-to-jittered (first read → "first")', () => {
    const first = computeCrowdRead(60, 0, 42, 'a|', null);
    expect(first.trend).toBe('first');
    const up = computeCrowdRead(60, 0, 42, 'a|', first.jitteredPct - 10);
    expect(up.trend).toBe('warmer');
    const down = computeCrowdRead(60, 0, 42, 'a|', first.jitteredPct + 10);
    expect(down.trend).toBe('colder');
    const same = computeCrowdRead(60, 0, 42, 'a|', first.jitteredPct);
    expect(same.trend).toBe('same');
  });

  it('flags restriction violations', () => {
    expect(computeCrowdRead(80, 0, 1, 'k|', null).violated).toBe(false);
    expect(computeCrowdRead(80, 2, 1, 'k|', null).violated).toBe(true);
  });

  it('is fully deterministic for the same inputs (anti-oracle: no reroll fishing)', () => {
    const a = computeCrowdRead(72, 0, 555, 'beans+egg|', 50);
    const b = computeCrowdRead(72, 0, 555, 'beans+egg|', 50);
    expect(a).toEqual(b);
  });
});

describe('crowd mood presentation tables', () => {
  it('every tier (plus expectant) has a mood emoji', () => {
    for (const tier of ['loved', 'liked', 'meh', 'disliked', 'evacuated', 'expectant'] as const) {
      expect(MOOD_EMOJI[tier]).toBeTruthy();
    }
  });

  it('trend arrows: warmer/colder/same render, first is silent', () => {
    expect(TREND_ARROW.warmer).toBe('▲');
    expect(TREND_ARROW.colder).toBe('▼');
    expect(TREND_ARROW.same).toBe('•');
    expect(TREND_ARROW.first).toBe('');
  });

  it('captions are deterministic per seed and substitute the audience name', () => {
    const a = crowdMoodCaption('liked', 'Granny Edna', 7);
    const b = crowdMoodCaption('liked', 'Granny Edna', 7);
    expect(a).toBe(b);
    expect(a).not.toContain('{name}');
  });

  it('caption pools never leak numbers (tier-only signal)', () => {
    for (const tier of ['loved', 'liked', 'meh', 'disliked', 'evacuated'] as const) {
      for (let seed = 0; seed < 20; seed++) {
        expect(crowdMoodCaption(tier, 'Crowd', seed)).not.toMatch(/\d/);
      }
    }
  });
});
