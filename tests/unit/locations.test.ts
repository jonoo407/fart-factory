import { describe, it, expect, beforeEach } from 'vitest';
import {
  AREAS,
  REGIONS,
  getArea,
  type Region,
} from '../../src/state/containment';
import {
  isLocationUnlocked,
  unlockedLocations,
  loadUnlockedLocations,
  unlockLocation,
  dailyHotLocation,
  audiencePoolForLocation,
} from '../../src/state/location-progress';
import { AUDIENCES } from '../../src/state/audience';
import { markBossDefeated } from '../../src/state/boss-progress';
import { markRecipeDiscovered } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('AREAS catalog grows to 20 locations across 5 regions (Phase Q item 81)', () => {
  it('contains exactly 20 locations', () => {
    expect(AREAS).toHaveLength(20);
  });

  it('every location has a region tag', () => {
    for (const a of AREAS) {
      expect(['hometown', 'city', 'wilderness', 'royal', 'cosmic']).toContain(a.region);
    }
  });

  it('every region has exactly 4 locations', () => {
    const counts: Record<Region, number> = { hometown: 0, city: 0, wilderness: 0, royal: 0, cosmic: 0 };
    for (const a of AREAS) counts[a.region]++;
    for (const r of Object.keys(counts) as Region[]) {
      expect(counts[r]).toBe(4);
    }
  });

  it('REGIONS metadata lists all 5 regions in unlock order', () => {
    expect(REGIONS.map((r) => r.id)).toEqual(['hometown', 'city', 'wilderness', 'royal', 'cosmic']);
  });

  it('every location has a unique id', () => {
    const ids = AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every location has mapX + mapY within 0-100% bounds (for SVG positioning)', () => {
    for (const a of AREAS) {
      expect(a.mapX).toBeGreaterThanOrEqual(0);
      expect(a.mapX).toBeLessThanOrEqual(100);
      expect(a.mapY).toBeGreaterThanOrEqual(0);
      expect(a.mapY).toBeLessThanOrEqual(100);
    }
  });

  it('legacy 6 location ids still exist (backward compat)', () => {
    for (const id of ['outside', 'covers', 'library', 'elevator', 'throne', 'space']) {
      expect(getArea(id)).toBeDefined();
    }
  });
});

describe('Location unlock predicates (Phase Q item 82)', () => {
  it('Hometown locations are unlocked by default', () => {
    const hometownLocs = AREAS.filter((a) => a.region === 'hometown');
    for (const a of hometownLocs) {
      expect(isLocationUnlocked(a)).toBe(true);
    }
  });

  it('City locations require pleasing 5 different audiences', () => {
    const cityLoc = AREAS.find((a) => a.region === 'city')!;
    expect(isLocationUnlocked(cityLoc)).toBe(false);
    // Simulate 5 audience wins by directly setting best-match keys.
    for (let i = 0; i < 5; i++) {
      localStorage.setItem(`fart_best_audience-${i}`, '60');
    }
    expect(isLocationUnlocked(cityLoc)).toBe(true);
  });

  it('Wilderness locations require 10 recipes discovered', () => {
    const wildLoc = AREAS.find((a) => a.region === 'wilderness')!;
    expect(isLocationUnlocked(wildLoc)).toBe(false);
    for (let i = 0; i < 10; i++) markRecipeDiscovered(`recipe-${i}`);
    expect(isLocationUnlocked(wildLoc)).toBe(true);
  });

  it('Royal locations require Boss 2 (Royal Court) defeated', () => {
    const royalLoc = AREAS.find((a) => a.region === 'royal')!;
    expect(isLocationUnlocked(royalLoc)).toBe(false);
    markBossDefeated('royal-court-escalation');
    expect(isLocationUnlocked(royalLoc)).toBe(true);
  });

  it('Cosmic locations require Boss 5 (Cosmic Council) defeated', () => {
    const cosmicLoc = AREAS.find((a) => a.region === 'cosmic')!;
    expect(isLocationUnlocked(cosmicLoc)).toBe(false);
    markBossDefeated('cosmic-council-judgment');
    expect(isLocationUnlocked(cosmicLoc)).toBe(true);
  });
});

describe('Persisted explicit-unlock list (story event unlocks)', () => {
  it('defaults to empty', () => {
    expect(loadUnlockedLocations()).toEqual([]);
  });
  it('unlockLocation appends and is idempotent', () => {
    unlockLocation('stadium');
    unlockLocation('stadium');
    expect(loadUnlockedLocations()).toEqual(['stadium']);
  });
  it('explicit-unlocked locations report unlocked even if region predicate fails', () => {
    const cityLoc = AREAS.find((a) => a.region === 'city')!;
    expect(isLocationUnlocked(cityLoc)).toBe(false);
    unlockLocation(cityLoc.id);
    expect(isLocationUnlocked(cityLoc)).toBe(true);
  });
});

describe('unlockedLocations() returns the open set', () => {
  it('starts with 4 (all of Hometown)', () => {
    expect(unlockedLocations().length).toBe(4);
  });
});

describe('audiencePoolForLocation (Phase Q item 83)', () => {
  it('Hometown locations pull from the global pool (no region filter)', () => {
    const loc = AREAS.find((a) => a.region === 'hometown')!;
    const pool = audiencePoolForLocation(loc);
    // Without a regional filter, the pool is all audiences.
    expect(pool.length).toBe(AUDIENCES.length);
  });

  it('Royal locations pull from royal-tagged audiences', () => {
    const loc = AREAS.find((a) => a.region === 'royal')!;
    const pool = audiencePoolForLocation(loc);
    // Royal Court + Opera House should be in the royal pool.
    const ids = pool.map((a) => a.id);
    expect(ids).toContain('royal-court');
    expect(ids).toContain('opera-house');
  });
});

describe('dailyHotLocation (Phase Q item 84)', () => {
  it('returns a location that is in the unlocked set', () => {
    const hot = dailyHotLocation(new Date('2026-05-12T12:00:00Z'));
    expect(hot).toBeDefined();
    const unlocked = unlockedLocations();
    expect(unlocked.map((l) => l.id)).toContain(hot!.id);
  });

  it('is deterministic per UTC day', () => {
    const d = new Date('2026-05-12T12:00:00Z');
    const a = dailyHotLocation(d);
    const b = dailyHotLocation(d);
    expect(a?.id).toBe(b?.id);
  });

  it('different days CAN yield different hot locations (smoke test over many days)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000);
      const hot = dailyHotLocation(d);
      if (hot) ids.add(hot.id);
    }
    // With Hometown's 4 unlocked locations, we should see ≥2 distinct hots
    // across 30 days.
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });
});
