import { describe, it, expect } from 'vitest';
import { reactionTextForAudience, audienceReaction } from '../../src/scoring/audience-reactions';
import { AUDIENCES } from '../../src/state/audience';

describe('audienceReaction — tier cuts + trend (live in result-panel + plate)', () => {
  it.each([
    [100, 'loved'], [90, 'loved'],
    [89, 'liked'], [70, 'liked'],
    [69, 'meh'], [50, 'meh'],
    [49, 'disliked'], [30, 'disliked'],
    [29, 'evacuated'], [0, 'evacuated'],
  ] as const)('%i%% → tier "%s" (boundary-exact)', (pct, tier) => {
    expect(audienceReaction(pct, null).tier).toBe(tier);
  });

  it('trend: first launch → "first", improvement → "warmer", decline → "colder", equal → "same"', () => {
    expect(audienceReaction(60, null).trend).toBe('first');
    expect(audienceReaction(60, 50).trend).toBe('warmer');
    expect(audienceReaction(60, 70).trend).toBe('colder');
    expect(audienceReaction(60, 60).trend).toBe('same');
  });
});

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
