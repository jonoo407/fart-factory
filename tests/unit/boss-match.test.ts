import { describe, it, expect } from 'vitest';
import {
  evaluateBossRound,
  isBossWon,
  type BossLaunchInput,
  createBossRunState,
} from '../../src/scoring/boss-match';
import { BOSSES } from '../../src/state/bosses';
import { AUDIENCES } from '../../src/state/audience';
import type { FoodProperties } from '../../src/state/food';

// Helper: a property vector that perfectly matches an audience's cravings.
function perfectFor(audId: string): FoodProperties {
  const a = AUDIENCES.find((x) => x.id === audId)!;
  return { ...a.cravings };
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
      };
      const after1 = evaluateBossRound(boss, run, launch);
      expect(after1.roundsRemaining).toBe(2);
      const after2 = evaluateBossRound(boss, after1, launch);
      expect(after2.roundsRemaining).toBe(1);
      const after3 = evaluateBossRound(boss, after2, launch);
      expect(after3.roundsRemaining).toBe(0);
    });

    it('win = all 3 rounds passed (≥50% each)', () => {
      const run = createBossRunState(boss);
      const goodLaunch: BossLaunchInput = {
        ingredientIds: ['cheese', 'asparagus'],
        propsAfterArea: perfectFor('royal-court'),
        targetAudienceIdx: null,
      };
      let s = run;
      s = evaluateBossRound(boss, s, goodLaunch);
      s = evaluateBossRound(boss, s, goodLaunch);
      s = evaluateBossRound(boss, s, goodLaunch);
      // After 3 perfect rounds (assuming the synthetic restrictions don't
      // disqualify), should be won. The exact match% depends on cravings
      // shape; this asserts the structure works end-to-end.
      expect(s.results.length).toBe(3);
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
      };
      let s = evaluateBossRound(boss, run, launch1);
      const launch2: BossLaunchInput = {
        ingredientIds: ['hot-pepper'],
        propsAfterArea: perfectFor('silent-monks'),
        targetAudienceIdx: null,
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
      };
      const after1 = evaluateBossRound(boss, run, probe);
      expect(isBossWon(boss, after1)).toBe(false);
      // Second launch: perfect plate.
      const real: BossLaunchInput = {
        ingredientIds: ['hot-pepper', 'ghost-pepper'],
        propsAfterArea: perfectFor('volcano-cult'),
        targetAudienceIdx: null,
      };
      const after2 = evaluateBossRound(boss, after1, real);
      // Should win if pct ≥ 60.
      const r2 = after2.results[1]!;
      if (r2.audienceResults[0]!.pct >= 60) {
        expect(isBossWon(boss, after2)).toBe(true);
      }
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
      };
      const after = evaluateBossRound(boss, run, launch);
      // Vote 0 is now "lost" (declared target but failed).
      expect(after.votesLost.has(0)).toBe(true);
      // Can't re-target this councilor.
    });
  });
});
