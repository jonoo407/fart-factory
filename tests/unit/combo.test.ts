import { describe, it, expect } from 'vitest';
import { reduceCombo, isComboGrade, type ComboState } from '../../src/state/combo';

describe('isComboGrade', () => {
  it.each([
    ['F-', false],
    ['D', false],
    ['C', false],
    ['C+', false],
    ['B', false],
    ['B+', false],
    ['A', true],
    ['A+', true],
    ['S+', true],
  ])('%s → %s', (grade, expected) => {
    expect(isComboGrade(grade)).toBe(expected);
  });
});

describe('reduceCombo', () => {
  const init: ComboState = { count: 0, peak: 0, lastGrade: null };

  it('first combo grade increments to 1', () => {
    const next = reduceCombo(init, 'A');
    expect(next.count).toBe(1);
    expect(next.peak).toBe(1);
  });

  it('three combo grades in a row → count=3, peak=3', () => {
    let s = init;
    s = reduceCombo(s, 'A');
    s = reduceCombo(s, 'A+');
    s = reduceCombo(s, 'S+');
    expect(s.count).toBe(3);
    expect(s.peak).toBe(3);
  });

  it('non-combo grade resets count to 0 but keeps peak', () => {
    let s = init;
    s = reduceCombo(s, 'A');
    s = reduceCombo(s, 'A+');
    s = reduceCombo(s, 'B'); // breaks streak
    expect(s.count).toBe(0);
    expect(s.peak).toBe(2);
    expect(s.lastGrade).toBe('B');
  });

  it('peak persists across resets', () => {
    let s = init;
    s = reduceCombo(s, 'A');
    s = reduceCombo(s, 'A');
    s = reduceCombo(s, 'A');
    s = reduceCombo(s, 'C');
    s = reduceCombo(s, 'A+');
    expect(s.count).toBe(1);
    expect(s.peak).toBe(3);
  });

  it('does not mutate prior state', () => {
    const a: ComboState = { count: 2, peak: 2, lastGrade: 'A' };
    const b = reduceCombo(a, 'A+');
    expect(a.count).toBe(2);
    expect(b.count).toBe(3);
    expect(a).not.toBe(b);
  });
});
