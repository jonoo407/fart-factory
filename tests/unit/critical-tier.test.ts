import { describe, it, expect } from 'vitest';
import { classifyCriticalTier, criticalGoldBonus, criticalNotesBonus, type MatchResult } from '../../src/scoring/critical-tier';

const m = (pct: number, violations: string[] = []): MatchResult => ({ pct, violations });

describe('classifyCriticalTier (T1.2)', () => {
  it('returns "perfect" for ≥95%', () => {
    expect(classifyCriticalTier(m(100))).toBe('perfect');
    expect(classifyCriticalTier(m(95))).toBe('perfect');
  });
  it('returns "great" for ≥75% but <95%', () => {
    expect(classifyCriticalTier(m(94))).toBe('great');
    expect(classifyCriticalTier(m(75))).toBe('great');
  });
  it('returns "ok" between 30 and 74%', () => {
    expect(classifyCriticalTier(m(74))).toBe('ok');
    expect(classifyCriticalTier(m(50))).toBe('ok');
    expect(classifyCriticalTier(m(30))).toBe('ok');
  });
  it('returns "disaster" for <=15% AND ≥2 violations (failure-is-funny)', () => {
    expect(classifyCriticalTier(m(15, ['no-wet', 'min-foods:3']))).toBe('disaster');
    expect(classifyCriticalTier(m(0, ['no-wet', 'no-dairy', 'min-stink:5']))).toBe('disaster');
  });
  it('returns "bad" for low matches without 2+ violations', () => {
    expect(classifyCriticalTier(m(10))).toBe('bad');
    expect(classifyCriticalTier(m(15, ['no-wet']))).toBe('bad');
  });
});

describe('Bonuses (T1.2 reward shaping)', () => {
  it('PERFECT awards bonus gold (+5)', () => {
    expect(criticalGoldBonus('perfect')).toBe(5);
  });
  it('GREAT awards modest bonus (+2)', () => {
    expect(criticalGoldBonus('great')).toBe(2);
  });
  it('DISASTER awards consolation notes (+5) — failure-banks-progression', () => {
    expect(criticalNotesBonus('disaster')).toBe(5);
  });
  it('no bonus for "ok" / "bad"', () => {
    expect(criticalGoldBonus('ok')).toBe(0);
    expect(criticalGoldBonus('bad')).toBe(0);
    expect(criticalNotesBonus('ok')).toBe(0);
    expect(criticalNotesBonus('bad')).toBe(0);
  });
});
