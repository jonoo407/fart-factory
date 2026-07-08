import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createShow, stuff, clench, release, type ShowState } from '../../src/v10/show';
import { CLENCHES_PER_SHOW, CLENCH_VENT, SUMMIT } from '../../src/v10/tuning';

/**
 * PLAN v10 P0 — the one-show state machine. Fully deterministic per seed:
 * the same seed and the same call sequence must produce the same transcript,
 * because save/replay, tests, and the §5.4 gates all depend on it.
 */

const eat = (s: ShowState, sizes: number[]) => {
  let state = s;
  const outcomes: string[] = [];
  for (const size of sizes) {
    const r = stuff(state, size);
    state = r.state;
    outcomes.push(r.outcome);
    if (r.outcome === 'bust') break;
  }
  return { state, outcomes };
};

describe('v10 show state machine', () => {
  it('a polite show never busts and banks its zone', () => {
    const { state } = eat(createShow({ seed: 1 }), [2, 2]); // pressure 4, polite — zero risk
    const done = release(state);
    expect(done.busted).toBe(false);
    expect(done.zone).toBe('polite');
    expect(done.bankedPressure).toBe(4);
  });

  it('risk-free bites always report ok; a bust ends the show', () => {
    const { outcomes } = eat(createShow({ seed: 7 }), [2, 2]);
    expect(outcomes).toEqual(['ok', 'ok']);
    // Force a guaranteed bust: land past the summit.
    const big = eat(createShow({ seed: 7 }), [6, 6, 6, 6]); // 24 > SUMMIT on 4th
    expect(big.outcomes[big.outcomes.length - 1]).toBe('bust');
    expect(big.state.phase).toBe('busted');
    expect(() => stuff(big.state, 1)).toThrow(); // no eating after the boom
  });

  it('clench vents pressure, is limited per show, and needs something to vent', () => {
    let s = eat(createShow({ seed: 3 }), [3, 3]).state; // 6
    s = clench(s);
    expect(s.pressure).toBe(6 - CLENCH_VENT);
    expect(s.clenchesLeft).toBe(CLENCHES_PER_SHOW - 1);
    s = clench(s);
    expect(s.clenchesLeft).toBe(0);
    expect(() => clench(s)).toThrow(); // out of clenches
  });

  it('same seed + same calls ⇒ identical transcript; different seed can differ', () => {
    // A risky ride that involves real rolls.
    const ride = [6, 5, 4, 2, 1];
    const a = eat(createShow({ seed: 42 }), ride);
    const b = eat(createShow({ seed: 42 }), ride);
    expect(a.outcomes).toEqual(b.outcomes);
    expect(a.state.pressure).toBe(b.state.pressure);
    // Determinism across seeds: over many seeds this ride must both survive
    // and bust somewhere (it is genuinely risky, not decided in advance).
    const results = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      results.add(eat(createShow({ seed }), ride).outcomes.join(','));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('venue risk modifier scales danger', () => {
    const ride = [6, 5, 4, 2, 1];
    let bustsCalm = 0;
    let bustsWild = 0;
    for (let seed = 0; seed < 400; seed++) {
      if (eat(createShow({ seed, riskMod: 0.5 }), ride).state.phase === 'busted') bustsCalm++;
      if (eat(createShow({ seed, riskMod: 2.0 }), ride).state.phase === 'busted') bustsWild++;
    }
    expect(bustsWild).toBeGreaterThan(bustsCalm);
  });

  it('release after a bust is invalid; the bust already resolved the show', () => {
    const big = eat(createShow({ seed: 9 }), [6, 6, 6, 6]);
    expect(() => release(big.state)).toThrow();
  });

  it(`the summit rule: a bite landing past ${SUMMIT} busts regardless of seed`, () => {
    for (const seed of [1, 99, 12345]) {
      const { outcomes } = eat(createShow({ seed }), [6, 6, 6, 3]); // 18 then +3 → 21
      expect(outcomes[outcomes.length - 1]).toBe('bust');
    }
  });
});

describe('v10 purity guard', () => {
  it('no Math.random and no Date.now anywhere in src/v10 (all randomness is seeded)', () => {
    const dir = join(__dirname, '../../src/v10');
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(entry.name)) {
          const src = readFileSync(p, 'utf8');
          // Match invocations, not prose in comments.
          if (/Math\.random\s*\(|Date\.now\s*\(/.test(src)) offenders.push(entry.name);
        }
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });
});
