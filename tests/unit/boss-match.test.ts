import { describe, it, expect } from 'vitest';
import {
  evaluateBossRound,
  isBossWon,
  isBossLost,
  type BossLaunchInput,
  createBossRunState,
} from '../../src/scoring/boss-match';
import { BOSSES } from '../../src/state/bosses';
import { AUDIENCES } from '../../src/state/audience';
import type { FoodProperties } from '../../src/state/food';
import { AXIS_CAP, TARGET_DIV } from '../../src/scoring/tuning';

// Helper: a property vector that FULLY satisfies an audience's cravings under
// the PLAN v9 closeness scorer. A plate's level is normalized by AXIS_CAP(8)
// and a craving by TARGET_DIV(5), so saturating craving C means reaching
// C*AXIS_CAP/TARGET_DIV (= C*1.6), capped at AXIS_CAP. (Props == cravings, the
// old same-scale assumption, now under-scores.)
function perfectFor(audId: string): FoodProperties {
  const a = AUDIENCES.find((x) => x.id === audId)!;
  // An axis forbidden by a "no-<axis>" rule is left at 0 (bringing any of it
  // violates the rule AND triggers the hate penalty), mirroring how the scorer
  // judges it. Every craved, non-forbidden axis is saturated to its target.
  const hated = new Set<string>();
  for (const r of a.restrictions ?? []) {
    const m = /^no-([a-z]+)$/.exec(r);
    if (m) hated.add(m[1]!);
  }
  const out: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
  for (const axis of Object.keys(out) as (keyof FoodProperties)[]) {
    out[axis] = hated.has(axis) ? 0 : Math.min(AXIS_CAP, a.cravings[axis] * (AXIS_CAP / TARGET_DIV));
  }
  return out;
}

// Helper: a property vector deliberately FAR from a specific audience.
// We invert: where they want low (≤2) we go high (10); where they want
// high (≥3) we go zero. The tolerant L1 distance is forgiving — zero
// isn't far from audiences whose cravings are also near zero. This
// helper guarantees worst-case match for the given audience.
function antiPerfectFor(audId: string): FoodProperties {
  const a = AUDIENCES.find((x) => x.id === audId)!;
  const out: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
  for (const axis of ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'] as const) {
    out[axis] = a.cravings[axis] <= 2 ? 10 : 0;
  }
  return out;
}

describe('Boss-match scoring engine (Phase N item 73)', () => {
  describe('intersection puzzle (Boss 1 — Granny\'s Family Reunion)', () => {
    const boss = BOSSES.find((b) => b.id === 'granny-family-reunion')!;

    it('wins only if ≥50% match against ALL 3 audiences', () => {
      const run = createBossRunState(boss);
      // Perfect plate for granny-edna; might not match others.
      const launch: BossLaunchInput = {
        ingredientIds: ['beans', 'cheese'],
        propsAfterArea: perfectFor('granny-edna'),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after = evaluateBossRound(boss, run, launch);
      expect(after.results.length).toBe(1);
      // Win = result.passed for every audience.
      const allPassed = after.results[0]!.audienceResults.every((r) => r.passed);
      expect(isBossWon(boss, after)).toBe(allPassed);
    });

    it('one bad audience → not won', () => {
      const run = createBossRunState(boss);
      // Anti-perfect for granny-edna guarantees she won't pass; the other
      // two might or might not, but since granny fails, the intersection
      // (all 3 must pass) is broken.
      const launch: BossLaunchInput = {
        ingredientIds: ['beans'],
        propsAfterArea: antiPerfectFor('granny-edna'),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after = evaluateBossRound(boss, run, launch);
      expect(isBossWon(boss, after)).toBe(false);
    });

    it('rounds = 1 — after the only launch, run is complete', () => {
      const run = createBossRunState(boss);
      expect(run.roundsRemaining).toBe(1);
      const launch: BossLaunchInput = {
        ingredientIds: ['beans'],
        propsAfterArea: perfectFor('granny-edna'),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after = evaluateBossRound(boss, run, launch);
      expect(after.roundsRemaining).toBe(0);
    });
  });

  describe('escalation puzzle (Boss 2 — Royal Court)', () => {
    const boss = BOSSES.find((b) => b.id === 'royal-court-escalation')!;

    it('rounds = 3 — each round adds restrictions', () => {
      const run = createBossRunState(boss);
      expect(run.roundsRemaining).toBe(3);
      const launch: BossLaunchInput = {
        ingredientIds: ['cheese'],
        propsAfterArea: perfectFor('royal-court'),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after1 = evaluateBossRound(boss, run, launch);
      expect(after1.roundsRemaining).toBe(2);
      const after2 = evaluateBossRound(boss, after1, launch);
      expect(after2.roundsRemaining).toBe(1);
      const after3 = evaluateBossRound(boss, after2, launch);
      expect(after3.roundsRemaining).toBe(0);
    });

    it('round 2 adds min-foods:2 and round 3 adds min-foods:3 + no-dairy (violations fire)', () => {
      // A 1-food cheese plate sails through round 1 (no added restrictions),
      // then trips every escalation rule as it tightens.
      const oneCheese: BossLaunchInput = {
        ingredientIds: ['cheese'],
        propsAfterArea: perfectFor('royal-court'),
        targetAudienceIdx: null,
        quality: 1,
      };
      let s = createBossRunState(boss);
      s = evaluateBossRound(boss, s, oneCheese);
      expect(s.results[0]!.audienceResults[0]!.violations).toEqual([]);
      s = evaluateBossRound(boss, s, oneCheese);
      expect(s.results[1]!.audienceResults[0]!.violations).toContain('min-foods:2');
      s = evaluateBossRound(boss, s, oneCheese);
      expect(s.results[2]!.audienceResults[0]!.violations).toContain('min-foods:3');
      expect(s.results[2]!.audienceResults[0]!.violations).toContain('no-dairy');
      // Each violation is a flat -25 points (match.ts). Same plate every round,
      // so round 3's pct is exactly round 1's minus 50. NOTE the knife-edge this
      // pins: a 100%-base plate still lands at exactly 50 with two violations
      // — which PASSES (>= 50). The escalation rules are soft caps against a
      // theoretically perfect plate; only sub-100 bases are truly forced into
      // 3-food dairy-free plates.
      const r1 = s.results[0]!.audienceResults[0]!.pct;
      const r3 = s.results[2]!.audienceResults[0]!.pct;
      expect(r3).toBe(Math.max(0, r1 - 50));
    });

    it('win = all 3 rounds passed: a 3-food dairy-free plate can beat the full escalation', () => {
      // This is the proof the escalation boss is WINNABLE under its own rules
      // (the old version launched a 2-food cheese plate that could never pass
      // round 3, then asserted only results.length === 3 — green forever).
      const legal: BossLaunchInput = {
        ingredientIds: ['beans', 'onion', 'asparagus'], // 3 foods, none dairy
        propsAfterArea: perfectFor('royal-court'),
        targetAudienceIdx: null,
        quality: 1,
      };
      let s = createBossRunState(boss);
      s = evaluateBossRound(boss, s, legal);
      s = evaluateBossRound(boss, s, legal);
      s = evaluateBossRound(boss, s, legal);
      for (const r of s.results) {
        expect(r.audienceResults[0]!.violations).toEqual([]);
        expect(r.audienceResults[0]!.passed).toBe(true);
      }
      expect(isBossWon(boss, s)).toBe(true);
      expect(isBossLost(boss, s)).toBe(false);
    });
  });

  describe('prioritization puzzle (Boss 3 — Three Ghosts)', () => {
    const boss = BOSSES.find((b) => b.id === 'haunted-three-ghosts')!;

    it('rounds = 2 — only 2 launches', () => {
      expect(createBossRunState(boss).roundsRemaining).toBe(2);
    });

    it('win = please ≥2 of 3 audiences (cumulative across all launches)', () => {
      const run = createBossRunState(boss);
      // First launch: anti-perfect for haunted-mansion, but check whether
      // it accidentally pleases the other two. With anti-perfect we can't
      // guarantee zero passes (other audiences might also like the inverted
      // profile). So instead, drive both launches with a target audience
      // each and assert the cumulative state at the end.
      const launch1: BossLaunchInput = {
        ingredientIds: ['cheese'],
        propsAfterArea: perfectFor('haunted-mansion'),
        targetAudienceIdx: null,
        quality: 1,
      };
      let s = evaluateBossRound(boss, run, launch1);
      const launch2: BossLaunchInput = {
        ingredientIds: ['hot-pepper'],
        propsAfterArea: perfectFor('silent-monks'),
        targetAudienceIdx: null,
        quality: 1,
      };
      s = evaluateBossRound(boss, s, launch2);
      // After 2 launches, at least 2 audiences should have passed.
      expect(s.audiencesPassed.size).toBeGreaterThanOrEqual(2);
      expect(isBossWon(boss, s)).toBe(true);
    });
  });

  describe('deduction puzzle (Boss 4 — Volcano Cult)', () => {
    const boss = BOSSES.find((b) => b.id === 'volcano-cult-ritual')!;

    it('rounds = 3 — probe + 2 real launches', () => {
      expect(createBossRunState(boss).roundsRemaining).toBe(3);
    });

    it('first launch result is a "probe" (tier only, no specific match%)', () => {
      const run = createBossRunState(boss);
      const launch: BossLaunchInput = {
        ingredientIds: ['hot-pepper'],
        propsAfterArea: perfectFor('volcano-cult'),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after = evaluateBossRound(boss, run, launch);
      const r = after.results[0]!;
      expect(r.probeOnly).toBe(true);
      // Match% should be ≥0 but the UI is expected to hide it.
    });

    it('win = ≥60% on 2nd or 3rd launch', () => {
      const run = createBossRunState(boss);
      const probe: BossLaunchInput = {
        ingredientIds: ['beans'],
        propsAfterArea: antiPerfectFor(boss.audiences[0]!),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after1 = evaluateBossRound(boss, run, probe);
      expect(isBossWon(boss, after1)).toBe(false);
      // Second launch: perfect plate. perfectFor saturates every craved axis,
      // so the pct is deterministically ≥ 60 — assert unconditionally (the old
      // `if (pct >= 60)` wrapper silently asserted nothing on under-score).
      const real: BossLaunchInput = {
        ingredientIds: ['hot-pepper', 'ghost-pepper'],
        propsAfterArea: perfectFor('volcano-cult'),
        targetAudienceIdx: null,
        quality: 1,
      };
      const after2 = evaluateBossRound(boss, after1, real);
      expect(after2.results[1]!.audienceResults[0]!.pct).toBeGreaterThanOrEqual(60);
      expect(isBossWon(boss, after2)).toBe(true);
    });
  });

  describe('resource-allocation puzzle (Boss 5 — Cosmic Council)', () => {
    const boss = BOSSES.find((b) => b.id === 'cosmic-council-judgment')!;

    it('rounds = 4 — one per councilor', () => {
      expect(createBossRunState(boss).roundsRemaining).toBe(4);
    });

    it('targetAudienceIdx is REQUIRED — launches without target are wasted', () => {
      const run = createBossRunState(boss);
      const launch: BossLaunchInput = {
        ingredientIds: ['beans'],
        propsAfterArea: perfectFor(boss.audiences[0]!),
        targetAudienceIdx: null, // No target declared
        quality: 1,
      };
      const after = evaluateBossRound(boss, run, launch);
      // The first result is logged but no vote earned (no target declared).
      expect(after.votes.size).toBe(0);
    });

    it('win = 3/4 votes (≥60% match against declared councilor)', () => {
      let s = createBossRunState(boss);
      // Vote for first 3 perfectly, waste the 4th.
      for (let i = 0; i < 3; i++) {
        const launch: BossLaunchInput = {
          ingredientIds: ['beans'],
          propsAfterArea: perfectFor(boss.audiences[i]!),
          targetAudienceIdx: i,
          quality: 1,
        };
        s = evaluateBossRound(boss, s, launch);
      }
      expect(s.votes.size).toBeGreaterThanOrEqual(3);
      expect(isBossWon(boss, s)).toBe(true);
    });

    it('miss-targeted launch (low match against declared) loses that vote', () => {
      const run = createBossRunState(boss);
      const launch: BossLaunchInput = {
        ingredientIds: ['beans'],
        propsAfterArea: antiPerfectFor(boss.audiences[0]!),
        targetAudienceIdx: 0,
        quality: 1,
      };
      const after = evaluateBossRound(boss, run, launch);
      // Vote 0 is now "lost" (declared target but failed).
      expect(after.votesLost.has(0)).toBe(true);
    });

    it('re-targeting an already-lost councilor consumes the round with no vote change', () => {
      let s = createBossRunState(boss);
      s = evaluateBossRound(boss, s, {
        ingredientIds: ['beans'],
        propsAfterArea: antiPerfectFor(boss.audiences[0]!),
        targetAudienceIdx: 0,
        quality: 1,
      });
      expect(s.votesLost.has(0)).toBe(true);
      const before = s.roundsRemaining;
      // Re-target councilor 0 with a PERFECT plate — still wasted.
      s = evaluateBossRound(boss, s, {
        ingredientIds: ['beans'],
        propsAfterArea: perfectFor(boss.audiences[0]!),
        targetAudienceIdx: 0,
        quality: 1,
      });
      expect(s.roundsRemaining).toBe(before - 1); // round consumed
      expect(s.votes.size).toBe(0); // no vote earned
      expect(s.results[1]!.audienceResults).toEqual([]); // logged as wasted
    });
  });

  describe('charge quality reaches boss scoring (arena forwards the live meter result)', () => {
    const boss = BOSSES.find((b) => b.id === 'volcano-cult-ritual')!;
    // A mid-strength plate (60% of saturation) so the multiplier is visible:
    // not pinned at 100 and not floored at 0.
    const partial = (() => {
      const p = perfectFor('volcano-cult');
      const out = { ...p };
      for (const axis of Object.keys(out) as (keyof FoodProperties)[]) out[axis] = p[axis] * 0.6;
      return out;
    })();

    it('perfect charge scores higher than a tap; a weak release scores lower', () => {
      const mk = (quality: number) =>
        evaluateBossRound(boss, createBossRunState(boss), {
          ingredientIds: ['hot-pepper'],
          propsAfterArea: partial,
          targetAudienceIdx: null,
          quality,
        }).results[0]!.audienceResults[0]!.pct;
      const tap = mk(1.0);
      const perfect = mk(1.25);
      const weak = mk(0.85);
      expect(perfect).toBeGreaterThan(tap);
      expect(weak).toBeLessThan(tap);
    });
  });

  describe('isBossLost (rounds exhausted without a win)', () => {
    it('not lost while rounds remain, lost once they run out without a win', () => {
      const boss = BOSSES.find((b) => b.id === 'granny-family-reunion')!;
      const fresh = createBossRunState(boss);
      expect(isBossLost(boss, fresh)).toBe(false); // rounds remain
      const after = evaluateBossRound(boss, fresh, {
        ingredientIds: ['beans'],
        propsAfterArea: antiPerfectFor('granny-edna'),
        targetAudienceIdx: null,
        quality: 1,
      });
      expect(after.roundsRemaining).toBe(0);
      expect(isBossWon(boss, after)).toBe(false);
      expect(isBossLost(boss, after)).toBe(true);
    });

    it('a winning final round is NOT a loss', () => {
      const boss = BOSSES.find((b) => b.id === 'granny-family-reunion')!;
      const fresh = createBossRunState(boss);
      // Saturate the union of all three families' cravings on non-hated axes —
      // granny-family-reunion is the intersection puzzle.
      const union: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
      for (const aid of boss.audiences) {
        const p = perfectFor(aid);
        for (const axis of Object.keys(union) as (keyof FoodProperties)[]) {
          union[axis] = Math.max(union[axis], p[axis]);
        }
      }
      const after = evaluateBossRound(boss, fresh, {
        ingredientIds: ['beans', 'onion'],
        propsAfterArea: union,
        targetAudienceIdx: null,
        quality: 1,
      });
      if (isBossWon(boss, after)) {
        expect(isBossLost(boss, after)).toBe(false);
      } else {
        // The union plate may overshoot a low craving for one family; the
        // contract under test is won/lost mutual exclusion either way.
        expect(isBossLost(boss, after)).toBe(true);
      }
    });
  });
});
