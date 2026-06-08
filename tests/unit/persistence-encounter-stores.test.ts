import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadEarnedGold,
  bumpEarnedGold,
  loadStars,
  bumpStars,
  loadEquippedTreatment,
  setEquippedTreatment,
  loadIntroShown,
  markIntroShown,
} from '../../src/state/persistence';

/**
 * PLAN v9 P0.3 — new Story-mode stores the pass/retry gate + venue ladder need:
 *   earnedGold (anti-grind ledger, distinct from the fart_best_ pct ratchet),
 *   per-crowd stars (ladder node state), equipped treatment, intro-shown flag.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('earnedGold ledger (anti-grind, 01 §4.3)', () => {
  it('defaults to 0', () => {
    expect(loadEarnedGold('granny-edna')).toBe(0);
  });

  it('ratchets up to the best full-gold, never down', () => {
    bumpEarnedGold('granny-edna', 17);
    expect(loadEarnedGold('granny-edna')).toBe(17);
    bumpEarnedGold('granny-edna', 12); // a worse clear pays nothing new
    expect(loadEarnedGold('granny-edna')).toBe(17);
    bumpEarnedGold('granny-edna', 21); // an improvement raises the ledger
    expect(loadEarnedGold('granny-edna')).toBe(21);
  });

  it('is per-audience', () => {
    bumpEarnedGold('granny-edna', 17);
    expect(loadEarnedGold('frat-bros')).toBe(0);
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem('fart_earned_granny-edna', '{bad');
    expect(loadEarnedGold('granny-edna')).toBe(0);
  });
});

describe('per-crowd stars (ladder node state)', () => {
  it('defaults to 0 and ratchets to the best', () => {
    expect(loadStars('granny-edna')).toBe(0);
    bumpStars('granny-edna', 2);
    expect(loadStars('granny-edna')).toBe(2);
    bumpStars('granny-edna', 1); // worse — ignored
    expect(loadStars('granny-edna')).toBe(2);
    bumpStars('granny-edna', 3);
    expect(loadStars('granny-edna')).toBe(3);
  });

  it('rejects out-of-range star values', () => {
    bumpStars('granny-edna', 9);
    expect(loadStars('granny-edna')).toBe(0);
  });
});

describe('equipped kitchen treatment', () => {
  it('defaults to null', () => {
    expect(loadEquippedTreatment()).toBeNull();
  });

  it('round-trips an id and can be cleared', () => {
    setEquippedTreatment('ferment');
    expect(loadEquippedTreatment()).toBe('ferment');
    setEquippedTreatment(null);
    expect(loadEquippedTreatment()).toBeNull();
  });
});

describe('per-crowd intro-shown flag', () => {
  it('defaults to false, flips true once, idempotent', () => {
    expect(loadIntroShown('granny-edna')).toBe(false);
    markIntroShown('granny-edna');
    expect(loadIntroShown('granny-edna')).toBe(true);
    markIntroShown('granny-edna');
    expect(loadIntroShown('granny-edna')).toBe(true);
  });
});
