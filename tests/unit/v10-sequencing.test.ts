import { describe, it, expect } from 'vitest';
import { pathBustProbability } from '../../src/v10/pressure';
import { SUMMIT } from '../../src/v10/tuning';

/**
 * PLAN v10 P0 — the Pyramid theorem (§5.2 pin 1).
 *
 * The design REQUIRES that eating order matters first-order: big foods early
 * while the zone rate is cheap, crumbs at altitude. With risk = rate(zoneAfter)
 * × size², descending-size order must never be worse than ascending, and must
 * be strictly better for every climb into LEGENDARY that has real size spread.
 * If a tuning change ever breaks this, the core skill of the game is gone —
 * this suite is the tripwire.
 *
 * Enumerated deterministically over real food sizes (1..6) — no RNG.
 */

/** All multisets (non-decreasing combos) of `sizes` with length in [minLen,maxLen]. */
function multisets(sizes: number[], minLen: number, maxLen: number): number[][] {
  const out: number[][] = [];
  const walk = (combo: number[], startIdx: number) => {
    if (combo.length >= minLen) out.push([...combo]);
    if (combo.length === maxLen) return;
    for (let i = startIdx; i < sizes.length; i++) {
      combo.push(sizes[i]!);
      walk(combo, i);
      combo.pop();
    }
  };
  walk([], 0);
  return out;
}

const FOOD_SIZES = [1, 2, 3, 4, 5, 6];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('the Pyramid theorem: descending order is never worse, strictly better on legendary climbs', () => {
  const climbs = multisets(FOOD_SIZES, 3, 6).filter(
    (m) => sum(m) >= 15 && sum(m) <= SUMMIT,
  );

  it('enumerates a meaningful climb space', () => {
    expect(climbs.length).toBeGreaterThan(50);
  });

  it('desc ≤ asc for EVERY legendary climb', () => {
    // Historical note: under a FLAT per-zone risk table, crumb+uniform hands
    // ({1,3,3,3,3,3}) had an "Offset" counter-play where crumb-first edged
    // desc. The within-zone slope (added to fix Gate 2's solved-threshold
    // failure) also closed that hole — desc now dominates universally. If
    // this loop ever names a violating multiset again, the slope has been
    // flattened somewhere and both this AND Gate 2 are in danger.
    for (const m of climbs) {
      const asc = [...m].sort((a, b) => a - b);
      const desc = [...m].sort((a, b) => b - a);
      const pAsc = pathBustProbability(asc);
      const pDesc = pathBustProbability(desc);
      expect(pDesc, `multiset ${m.join(',')}`).toBeLessThanOrEqual(pAsc + 1e-12);
    }
  });

  it('desc < asc STRICTLY when the climb has real spread (contains a crumb ≤2 and a boulder ≥5)', () => {
    const spread = climbs.filter((m) => Math.min(...m) <= 2 && Math.max(...m) >= 5);
    expect(spread.length).toBeGreaterThan(10);
    for (const m of spread) {
      const asc = [...m].sort((a, b) => a - b);
      const desc = [...m].sort((a, b) => b - a);
      expect(pathBustProbability(desc), `multiset ${m.join(',')}`).toBeLessThan(
        pathBustProbability(asc),
      );
    }
  });

  it('sequencing is worth a real margin on the canonical climb (the teachable moment)', () => {
    // 6,5,4,2,1 = 18: the classic full pyramid vs eating the same foods backwards.
    const desc = pathBustProbability([6, 5, 4, 2, 1]);
    const asc = pathBustProbability([1, 2, 4, 5, 6]);
    // At least 20% relative reduction in bust probability — order must FEEL like skill.
    expect(desc).toBeLessThan(asc * 0.8);
  });
});
