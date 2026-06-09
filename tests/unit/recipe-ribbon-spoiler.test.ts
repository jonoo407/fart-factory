import { describe, it, expect, beforeEach, vi } from 'vitest';

// Avoid touching the AudioContext when plate.ts's graph loads.
vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { renderRecipeRibbon, addFoodToPlate, _resetPlateAndBelly } from '../../src/ui/plate';

// beans + cheese = "Swamp Beast" (recipes.ts). Both are starter foods.
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('fart_pantry', JSON.stringify(['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage']));
  document.body.innerHTML = '<div id="recipeRibbon" hidden></div>';
  _resetPlateAndBelly();
});

describe('recipe ribbon does not spoil undiscovered recipes', () => {
  it('hides the ribbon when the matched recipe is NOT yet discovered', () => {
    localStorage.setItem('fart_recipes_seen', JSON.stringify([])); // nothing discovered
    addFoodToPlate('beans');
    addFoodToPlate('cheese');
    renderRecipeRibbon();
    const el = document.getElementById('recipeRibbon')!;
    expect(el.hasAttribute('hidden')).toBe(true);
    expect(el.textContent).not.toContain('Swamp Beast');
  });

  it('shows the ribbon once the recipe has been discovered', () => {
    localStorage.setItem('fart_recipes_seen', JSON.stringify(['swamp-beast']));
    addFoodToPlate('beans');
    addFoodToPlate('cheese');
    renderRecipeRibbon();
    const el = document.getElementById('recipeRibbon')!;
    expect(el.hasAttribute('hidden')).toBe(false);
    expect(el.textContent).toContain('Swamp Beast');
  });
});
