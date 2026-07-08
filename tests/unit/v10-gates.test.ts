import { describe, it, expect } from 'vitest';
import {
  generateContext,
  runNovice,
  runExpert,
  runFixedRule,
  simulateMany,
  type ShowContext,
} from '../../src/v10/policies';
import { SUMMIT } from '../../src/v10/tuning';

/**
 * PLAN v10 §5.4 — THE THREE SKILL GATES. These are the Bushnell tests that
 * killed the slider game and would have killed v9: they make "easy to learn,
 * hard to master" a regression-tested property of the tuning constants.
 * Any PR that touches src/v10/tuning.ts must keep this suite green.
 *
 * P0 context model: seeded 8-food hands drawn from the real catalog's size
 * distribution, a zone-demand mix (30% none / 30% solid+ / 25% epic+ /
 * 15% legendary), and venue risk modifiers. P1 upgrades the context to real
 * crowd tastes and re-runs these gates unchanged.
 */

const SHOWS = 200;
const MASTER_SEED = 20260708;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

describe('context model sanity', () => {
  it('contexts are deterministic per seed and hands are playable', () => {
    const a = generateContext(5);
    const b = generateContext(5);
    expect(a).toEqual(b);
    expect(a.hand.length).toBe(8);
    for (const size of a.hand) {
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(6);
    }
    // A full hand can always reach the summit region if the player dares.
    const total = a.hand.reduce((x, y) => x + y, 0);
    expect(total).toBeGreaterThanOrEqual(15);
  });
});

describe('GATE 1 — skill-delta: expert median ≥ 3× novice median, novice never zero', () => {
  it('holds over seeded shows', () => {
    const novice = simulateMany(runNovice, SHOWS, MASTER_SEED);
    const expert = simulateMany(runExpert, SHOWS, MASTER_SEED);
    const mNovice = median(novice.applause);
    const mExpert = median(expert.applause);
    // eslint-disable-next-line no-console
    console.info(
      `[gate:skill-delta] novice median=${mNovice} expert median=${mExpert} ratio=${(mExpert / mNovice).toFixed(2)}`,
    );
    expect(mExpert).toBeGreaterThanOrEqual(3 * mNovice);
    expect(Math.min(...novice.applause)).toBeGreaterThan(0); // the floor never pays zero
  });
});

describe('GATE 2 — no-solved-threshold: best fixed stop-rule loses ≥20% to the context-aware expert', () => {
  it('holds over the full sweep of fixed rules', () => {
    const expert = simulateMany(runExpert, SHOWS, MASTER_SEED);
    const mExpert = median(expert.applause);
    let bestFixed = -Infinity;
    let bestN = 0;
    for (let n = 6; n <= SUMMIT; n++) {
      const fixed = simulateMany((ctx, seed) => runFixedRule(ctx, seed, n), SHOWS, MASTER_SEED);
      const m = median(fixed.applause);
      if (m > bestFixed) {
        bestFixed = m;
        bestN = n;
      }
    }
    // eslint-disable-next-line no-console
    console.info(
      `[gate:no-solved-threshold] best fixed N=${bestN} median=${bestFixed} vs expert=${mExpert} (edge=${((mExpert / bestFixed - 1) * 100).toFixed(1)}%)`,
    );
    expect(mExpert).toBeGreaterThanOrEqual(1.2 * bestFixed);
  });
});

describe('GATE 3 — bust-tolerance: expert bust rate lands in the 15–30% excitement band', () => {
  it('risk is neither toothless nor punishing where daring is rewarded (non-cap shows)', () => {
    // Cap-demand shows ("keep it UNDER solid") are SUPPOSED to be low-risk —
    // restraint is the skill there. The excitement band is measured on the
    // shows where pushing is the right play: null and min demands.
    const expert = simulateMany(runExpert, SHOWS, MASTER_SEED);
    const daring = expert.shows.filter((s) => s.ctx.demand?.kind !== 'cap');
    expect(daring.length).toBeGreaterThan(SHOWS / 3);
    const bustRate = daring.filter((s) => s.result.busted).length / daring.length;
    // eslint-disable-next-line no-console
    console.info(
      `[gate:bust-tolerance] expert daring-show bust rate=${(bustRate * 100).toFixed(1)}% over ${daring.length} shows`,
    );
    expect(bustRate).toBeGreaterThanOrEqual(0.15);
    expect(bustRate).toBeLessThanOrEqual(0.3);
  });
});

describe('policy sanity (the gates measure what we think they measure)', () => {
  it('novice is genuinely cautious: near-zero bust rate', () => {
    const novice = simulateMany(runNovice, SHOWS, MASTER_SEED);
    expect(novice.busts / SHOWS).toBeLessThan(0.05);
  });

  it('expert respects a MIN demand: banks epic+ on a calm venue with a rich hand', () => {
    const ctx: ShowContext = {
      hand: [6, 5, 4, 3, 2, 1, 1, 1],
      demand: { kind: 'min', zone: 'epic' },
      riskMod: 0.6,
    };
    const { bankedPressure, busted } = runExpert(ctx, 11);
    if (!busted) expect(bankedPressure).toBeGreaterThanOrEqual(11);
  });

  it('expert respects a CAP demand: keeps it under solid when the Library is paying', () => {
    const ctx: ShowContext = {
      hand: [6, 5, 4, 3, 2, 1, 1, 1],
      demand: { kind: 'cap', zone: 'solid' },
      riskMod: 1.0,
    };
    const { bankedPressure, busted } = runExpert(ctx, 17);
    expect(busted).toBe(false); // staying under a cap carries no risk at all
    expect(bankedPressure).toBeLessThanOrEqual(10);
    expect(bankedPressure).toBeGreaterThanOrEqual(6); // …but still tops out the allowed zone
  });
});
