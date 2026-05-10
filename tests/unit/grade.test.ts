import { describe, it, expect } from 'vitest';
import { gradeFart, stinkEmoji, durationLabel } from '../../src/scoring/grade';

describe('gradeFart — every threshold boundary', () => {
  const cases: Array<[total: number, expected: string]> = [
    [0, 'F-'],
    [11, 'F-'],
    [12, 'D'],
    [17, 'D'],
    [18, 'C'],
    [23, 'C'],
    [24, 'C+'],
    [29, 'C+'],
    [30, 'B'],
    [35, 'B'],
    [36, 'B+'],
    [41, 'B+'],
    [42, 'A'],
    [47, 'A'],
    [48, 'A+'],
    [53, 'A+'],
    [54, 'S+'],
    [60, 'S+'],
  ];
  for (const [total, expected] of cases) {
    it(`total=${total} → ${expected}`, () => {
      expect(gradeFart(total).grade).toBe(expected);
    });
  }
  it('S+ color is exactly #ff0000', () => {
    expect(gradeFart(60).color).toBe('#ff0000');
  });
  it('has a non-empty desc on every grade', () => {
    for (let t = 0; t <= 60; t += 6) {
      expect(gradeFart(t).desc.length).toBeGreaterThan(0);
    }
  });
});

describe('stinkEmoji thresholds', () => {
  it('< 3 → flower', () => expect(stinkEmoji(0)).toBe('🌸'));
  it('= 3 → 😐 (boundary)', () => expect(stinkEmoji(3)).toBe('😐'));
  it('< 5 → 😐', () => expect(stinkEmoji(4)).toBe('😐'));
  it('< 7 → 🤢', () => expect(stinkEmoji(5)).toBe('🤢'));
  it('< 9 → 💀', () => expect(stinkEmoji(7)).toBe('💀'));
  it('≥ 9 → ☠️🔥', () => expect(stinkEmoji(9)).toBe('☠️🔥'));
  it('= 10 → ☠️🔥', () => expect(stinkEmoji(10)).toBe('☠️🔥'));
});

describe('durationLabel thresholds', () => {
  it('< 3 → Blink-and-miss', () =>
    expect(durationLabel(1)).toBe('Blink-and-miss'));
  it('< 5 → Standard Issue', () =>
    expect(durationLabel(3)).toBe('Standard Issue'));
  it('< 7 → Extended Play', () =>
    expect(durationLabel(5)).toBe('Extended Play'));
  it("< 9 → Director's Cut", () =>
    expect(durationLabel(7)).toBe("Director's Cut"));
  it('≥ 9 → NEVER-ENDING', () =>
    expect(durationLabel(10)).toBe('NEVER-ENDING'));
});
