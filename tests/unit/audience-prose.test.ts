import { describe, it, expect } from 'vitest';
import { AUDIENCES, type Audience } from '../../src/state/audience';

/**
 * V8 T6 — Audience prose hints (replaces Hard/Easy mode).
 *
 * Contract: every audience carries a `description` blurb (1-2 sentences
 * of funny in-character prose with embedded clues) and a `difficultyTier`
 * that drives clue density. The prose IS the hint — we never show
 * literal "wants stinky 3/5" exposition.
 */

const VALID_TIERS: ReadonlyArray<Audience['difficultyTier']> = ['easy', 'medium', 'hard', 'boss'];

describe('audience prose contract (V8 T6)', () => {
  it('still has 20 audiences', () => {
    expect(AUDIENCES.length).toBe(20);
  });

  it('every audience has a non-empty description', () => {
    for (const a of AUDIENCES) {
      expect(a.description, `${a.id} missing description`).toBeTruthy();
      expect(a.description.length, `${a.id} description empty`).toBeGreaterThan(0);
    }
  });

  it('every description is ≤ 220 characters (1-2 sentence cap)', () => {
    for (const a of AUDIENCES) {
      expect(a.description.length, `${a.id}: "${a.description}"`).toBeLessThanOrEqual(220);
    }
  });

  it('no description leaks literal n/5 values', () => {
    for (const a of AUDIENCES) {
      expect(a.description).not.toMatch(/\d\/5/);
    }
  });

  it('no description references "Hard Mode" / "Easy Mode"', () => {
    for (const a of AUDIENCES) {
      expect(a.description).not.toMatch(/hard mode|easy mode/i);
    }
  });

  it('every audience has a valid difficultyTier', () => {
    for (const a of AUDIENCES) {
      expect(VALID_TIERS).toContain(a.difficultyTier);
    }
  });

  it('every tier is represented at least once', () => {
    const present = new Set(AUDIENCES.map((a) => a.difficultyTier));
    for (const t of VALID_TIERS) {
      expect(present.has(t), `no audience with tier ${t}`).toBe(true);
    }
  });

  it('boss-tier audiences are sparse (≤4)', () => {
    const bosses = AUDIENCES.filter((a) => a.difficultyTier === 'boss');
    expect(bosses.length).toBeLessThanOrEqual(4);
    expect(bosses.length).toBeGreaterThanOrEqual(1);
  });

  it('descriptions are not duplicates of the existing flavor line', () => {
    // The new prose is the hint — should be more evocative than the old
    // one-liner, and almost never the same string.
    for (const a of AUDIENCES) {
      expect(a.description).not.toBe(a.flavor);
    }
  });
});
