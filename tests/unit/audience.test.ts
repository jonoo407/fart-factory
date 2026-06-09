import { describe, it, expect, beforeEach } from 'vitest';
import {
  AUDIENCES,
  getAudience,
  getDailyAudience,
  audienceForEncounter,
} from '../../src/state/audience';

beforeEach(() => {
  localStorage.clear();
});

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

describe('audienceForEncounter (encounter-anchored selection)', () => {
  it('is deterministic per encounter idx', () => {
    expect(audienceForEncounter(5).id).toBe(audienceForEncounter(5).id);
  });

  it('cycles through distinct audiences over 20 consecutive encounters', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(audienceForEncounter(i).id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(15);
  });

  it('respects pool filter — only returns audiences from the pool', () => {
    const pool = AUDIENCES.slice(0, 3);
    for (let i = 0; i < 10; i++) {
      const a = audienceForEncounter(i, pool);
      expect(pool.includes(a)).toBe(true);
    }
  });

  // (GamePlus step-2 rotation is asserted properly — exact catalog position —
  // in gameplus.test.ts; the weak e0 !== e1 version that lived here couldn't
  // fail and was removed.)
});

describe('getDailyAudience legacy wrapper', () => {
  it('routes to audienceForEncounter using the current encounter idx', () => {
    // With encounter idx 0 (default), should match audienceForEncounter(0).
    expect(getDailyAudience().id).toBe(audienceForEncounter(0).id);
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
