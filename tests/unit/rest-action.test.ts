import { describe, it, expect, beforeEach } from 'vitest';
import { attemptRestRefill, REST_NOTES_COST, BELLY_CAPACITY } from '../../src/scoring/rest';
import { loadBelly, spendBelly, loadResearchNotes, setResearchNotes } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('Rest action (belly refill via research notes)', () => {
  it('BELLY_CAPACITY is at least 30 (per the user-reported soft-block fix)', () => {
    expect(BELLY_CAPACITY).toBeGreaterThanOrEqual(30);
  });

  it('REST_NOTES_COST is a small positive integer', () => {
    expect(REST_NOTES_COST).toBeGreaterThan(0);
    expect(REST_NOTES_COST).toBeLessThanOrEqual(20);
  });

  it('refuses when player has fewer notes than REST_NOTES_COST', () => {
    setResearchNotes(REST_NOTES_COST - 1);
    spendBelly(15); // partially exhaust
    const result = attemptRestRefill();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient-notes');
  });

  it('refuses when belly is already full', () => {
    setResearchNotes(REST_NOTES_COST + 10);
    // No spend — belly is at full capacity by default.
    const result = attemptRestRefill();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('already-full');
  });

  it('on success: deducts notes AND refills belly to capacity', () => {
    setResearchNotes(REST_NOTES_COST + 5);
    spendBelly(20); // exhaust most of belly
    const before = loadBelly();
    expect(before).toBeLessThan(BELLY_CAPACITY);
    const result = attemptRestRefill();
    expect(result.ok).toBe(true);
    expect(loadResearchNotes()).toBe(5);
    expect(loadBelly()).toBe(BELLY_CAPACITY);
  });

  it('multiple rests in a row work (no caching bug)', () => {
    setResearchNotes(REST_NOTES_COST * 3);
    spendBelly(20);
    expect(attemptRestRefill().ok).toBe(true);
    spendBelly(20);
    expect(attemptRestRefill().ok).toBe(true);
  });
});
