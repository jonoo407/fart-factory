import { describe, it, expect } from 'vitest';
import { snarkForBossLoss, snarkLineCount } from '../../src/state/boss-snark';
import { BOSSES } from '../../src/state/bosses';

describe('boss-snark', () => {
  it('every boss has at least 8 snark lines (PR7 expansion)', () => {
    for (const b of BOSSES) {
      expect(snarkLineCount(b.id)).toBeGreaterThanOrEqual(8);
    }
  });

  it('returns a non-empty string for each boss across the full seed range', () => {
    for (const b of BOSSES) {
      for (let seed = 0; seed < 16; seed++) {
        const line = snarkForBossLoss(b.id, seed);
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to a generic line for unknown bosses', () => {
    expect(snarkForBossLoss('not-a-boss', 0)).toBe('Try again — they expected more.');
  });

  it('handles negative seeds without throwing', () => {
    expect(() => snarkForBossLoss('granny-family-reunion', -5)).not.toThrow();
  });
});
