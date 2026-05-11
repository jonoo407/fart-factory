import { describe, it, expect } from 'vitest';
import { reactionTextForAudience } from '../../src/scoring/audience-reactions';
import { AUDIENCES } from '../../src/state/audience';

describe('reactionTextForAudience (P10)', () => {
  it('returns a per-audience flavor string for each tier', () => {
    const aud = AUDIENCES.find((a) => a.id === 'granny-edna')!;
    const lovedText = reactionTextForAudience(aud, 'loved');
    expect(lovedText.length).toBeGreaterThan(0);
    expect(lovedText.toLowerCase()).toContain('granny');
  });

  it('every audience has reactions for all 5 tiers', () => {
    for (const aud of AUDIENCES) {
      for (const tier of ['loved', 'liked', 'meh', 'disliked', 'evacuated'] as const) {
        const text = reactionTextForAudience(aud, tier);
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it('reactions vary per-audience (Royal Court ≠ Frat Bros at "loved")', () => {
    const royal = AUDIENCES.find((a) => a.id === 'royal-court')!;
    const frat = AUDIENCES.find((a) => a.id === 'frat-bros')!;
    expect(reactionTextForAudience(royal, 'loved')).not.toBe(reactionTextForAudience(frat, 'loved'));
  });
});
