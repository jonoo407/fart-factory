import { describe, it, expect } from 'vitest';
import { buildFoodCard } from '../../src/ui/pantry-grid';
import { getFood } from '../../src/state/food';

/**
 * PLAN v9 P3 / 01 §6.2 — the inline learned-axis strip on a pantry tile.
 */
describe('pantry learned-axis strip', () => {
  const broccoli = getFood('broccoli')!; // musical:3 + a few others

  it('shows a ✨ on a never-launched food (0 uses) and all dots', () => {
    const html = buildFoodCard(broccoli, { clickable: true, masteryUses: 0, revealedAxes: [] });
    expect(html).toContain('pax-new');
    expect(html).toContain('·'); // hidden axes are dots
    expect(html).not.toContain('pax-i'); // nothing revealed yet
  });

  it('shows emoji+value for a revealed axis and one fewer dot', () => {
    const html = buildFoodCard(broccoli, { clickable: true, masteryUses: 2, revealedAxes: ['musical'] });
    expect(html).toContain('pax-i'); // a revealed axis chip
    expect(html).toContain('<b>3</b>'); // musical's true value
    expect(html).not.toContain('pax-new'); // used → no sparkle
  });

  it('locked tiles render no strip', () => {
    const html = buildFoodCard(broccoli, { locked: true });
    expect(html).not.toContain('class="pax"');
  });
});
