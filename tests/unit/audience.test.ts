import { describe, it, expect } from 'vitest';
import {
  AUDIENCES,
  getAudience,
  getDailyAudience,
} from '../../src/state/audience';

describe('AUDIENCES catalog', () => {
  it('contains at least 20 archetypes', () => {
    expect(AUDIENCES.length).toBeGreaterThanOrEqual(20);
  });

  it('every audience has unique id + non-empty name + emoji', () => {
    const ids = AUDIENCES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of AUDIENCES) {
      expect(a.id.length).toBeGreaterThan(0);
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
    }
  });

  it('every audience has well-shaped cravings (each axis 0-5)', () => {
    for (const a of AUDIENCES) {
      for (const axis of ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'] as const) {
        const v = a.cravings[axis];
        expect(typeof v).toBe('number');
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it('at least 3 audiences declare restrictions', () => {
    const withRestrictions = AUDIENCES.filter((a) => Array.isArray(a.restrictions) && a.restrictions.length > 0);
    expect(withRestrictions.length).toBeGreaterThanOrEqual(3);
  });
});

describe('getDailyAudience', () => {
  it('is deterministic per UTC date', () => {
    const morning = new Date('2026-05-10T03:00:00Z');
    const evening = new Date('2026-05-10T22:00:00Z');
    expect(getDailyAudience(morning).id).toBe(getDailyAudience(evening).id);
  });

  it('cycles through distinct audiences over 20 consecutive days', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 + i));
      seen.add(getDailyAudience(d).id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(15); // at least 15 distinct in a 20-day window
  });
});

describe('getAudience', () => {
  it('returns the audience with that id', () => {
    const granny = getAudience('granny-edna');
    expect(granny).toBeDefined();
    expect(granny?.name).toMatch(/[Gg]ranny/);
  });

  it('returns undefined for unknown id', () => {
    expect(getAudience('does-not-exist')).toBeUndefined();
  });
});
