import { describe, it, expect, beforeEach } from 'vitest';
import {
  legendaryGoldMultiplier,
  applyLegendaryProps,
} from '../../src/scoring/legendary-buffs';
import { testCodexSlot } from '../../src/state/codex';
import { getRecipe } from '../../src/state/recipes';
import { setGold, setResearchNotes, unlockFood } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
  setGold(500);
  setResearchNotes(100);
});

const zero = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };

function decodeForbiddenBlast(): void {
  unlockFood('forbidden-burrito');
  unlockFood('volcano-chili');
  unlockFood('ghost-pepper');
  testCodexSlot('forbidden-blast', 0, 'forbidden-burrito');
  testCodexSlot('forbidden-blast', 1, 'volcano-chili');
  testCodexSlot('forbidden-blast', 2, 'ghost-pepper');
}

function decodeCosmicSymphony(): void {
  unlockFood('sky-bean');
  unlockFood('glowing-mushroom');
  unlockFood('kombucha');
  const r = getRecipe('cosmic-symphony')!;
  for (let i = 0; i < r.ingredients.length; i++) {
    testCodexSlot('cosmic-symphony', i, r.ingredients[i]!);
  }
}

describe('legendary-buffs (V8 T7.d)', () => {
  it('legendaryGoldMultiplier defaults to 1', () => {
    expect(legendaryGoldMultiplier()).toBe(1);
  });

  it('forbidden-gold buff bumps gold multiplier to 1.1 once decoded', () => {
    decodeForbiddenBlast();
    expect(legendaryGoldMultiplier()).toBeCloseTo(1.1);
  });

  it('applyLegendaryProps is identity by default', () => {
    expect(applyLegendaryProps({ ...zero, musical: 2 })).toEqual({ ...zero, musical: 2 });
  });

  it('cosmic-musical buff adds +1 musical (clamped to 5)', () => {
    decodeCosmicSymphony();
    expect(applyLegendaryProps({ ...zero, musical: 2 }).musical).toBe(3);
    // Clamping at 5
    expect(applyLegendaryProps({ ...zero, musical: 5 }).musical).toBe(5);
  });

  it('multiple legendary buffs stack cleanly', () => {
    decodeForbiddenBlast();
    decodeCosmicSymphony();
    expect(legendaryGoldMultiplier()).toBeCloseTo(1.1);
    expect(applyLegendaryProps({ ...zero, musical: 1 }).musical).toBe(2);
  });
});
