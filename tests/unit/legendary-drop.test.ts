import { describe, it, expect, beforeEach } from 'vitest';
import { rollLegendaryDrop } from '../../src/scoring/loot-drops';
import { FOODS } from '../../src/state/food';

const legendaries = FOODS.filter((f) => f.rarity === 'legendary');

// The Mystery Unicorn is supposed to gift a guaranteed LEGENDARY when pleased —
// but rollLootDrop only ever drops non-legendary foods. rollLegendaryDrop is the
// legendary-pool draw for that payoff.
beforeEach(() => {
  localStorage.clear();
});

describe('rollLegendaryDrop — the unicorn legendary gift', () => {
  it('always returns a not-yet-owned legendary food', () => {
    const drop = rollLegendaryDrop(12345);
    expect(drop).not.toBeNull();
    expect(drop!.rarity).toBe('legendary');
  });

  it('returns null when every legendary is already owned', () => {
    localStorage.setItem('fart_pantry', JSON.stringify(legendaries.map((f) => f.id)));
    expect(rollLegendaryDrop(12345)).toBeNull();
  });
});
