import { describe, it, expect, beforeEach } from 'vitest';
import { ACTIVITIES, rollIntermission, getActivity } from '../../src/state/activities';
import { resetRunState } from '../../src/state/run-state';

beforeEach(() => {
  localStorage.clear();
  resetRunState();
});

describe('ACTIVITIES catalog (Phase 4)', () => {
  it('contains at least 12 activities', () => {
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(12);
  });

  it('every activity has unique id + name + emoji + description', () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACTIVITIES) {
      expect(a.id.length).toBeGreaterThan(0);
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it('every activity has either a buff or an immediate effect', () => {
    for (const a of ACTIVITIES) {
      const hasBuff = a.buff !== undefined;
      const hasImmediate = a.immediate !== undefined;
      expect(hasBuff || hasImmediate).toBe(true);
    }
  });

  it('every "next-launch property buff" has at least one axis change', () => {
    for (const a of ACTIVITIES) {
      if (!a.buff || a.buff.kind !== 'property') continue;
      const sum = Object.values(a.buff.delta).reduce((s, v) => s + Math.abs(v as number), 0);
      expect(sum).toBeGreaterThan(0);
    }
  });
});

describe('rollIntermission (deterministic 3-of-N pick)', () => {
  it('returns exactly 3 distinct activities', () => {
    const offers = rollIntermission(0);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((a) => a.id)).size).toBe(3);
  });

  it('is deterministic for the same encounter idx', () => {
    const a = rollIntermission(7);
    const b = rollIntermission(7);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it('produces variety across different encounter idx values', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const a of rollIntermission(i)) ids.add(a.id);
    }
    // Over 40 rolls × 3 activities, we should see at least 8 distinct ones.
    expect(ids.size).toBeGreaterThanOrEqual(8);
  });
});

describe('getActivity', () => {
  it('returns the activity for a known id', () => {
    expect(getActivity('bean-burrito')?.name).toBeTruthy();
  });
  it('returns undefined for an unknown id', () => {
    expect(getActivity('not-a-real-thing')).toBeUndefined();
  });
});
