import { describe, it, expect } from 'vitest';
import { deriveCravingChips, renderCravingChipsHtml } from '../../src/ui/crowd-ticket';
import { getAudience } from '../../src/state/audience';

/**
 * PLAN v9 P4 / 04 §2 — the ticket's craving chips. Labels only, no integers;
 * a 🚫 no chip for every "no-X" rule; clue density by difficultyTier.
 */
describe('crowd ticket craving chips', () => {
  it('shows a 🚫 no chip for a no-<axis> restriction', () => {
    const royal = getAudience('royal-court')!; // no-wet
    const chips = deriveCravingChips(royal);
    expect(chips).toContainEqual({ axis: 'wet', type: 'no' });
  });

  it('shows the strongest cravings as want chips', () => {
    const granny = getAudience('granny-edna')!; // headline craving: musical
    const chips = deriveCravingChips(granny);
    expect(chips.some((c) => c.axis === 'musical' && c.type === 'want')).toBe(true);
  });

  it('boss tier reveals only 1 positive want (cryptic)', () => {
    const monk = getAudience('silent-monks')!; // boss tier
    const wants = deriveCravingChips(monk).filter((c) => c.type === 'want');
    expect(wants.length).toBeLessThanOrEqual(1);
  });

  it('never leaks raw integers in the rendered HTML', () => {
    const html = renderCravingChipsHtml(getAudience('granny-edna')!);
    expect(html).toContain('They’re craving');
    expect(html).not.toMatch(/[0-9]\/5|target/i);
  });
});
