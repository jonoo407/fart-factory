import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { renderPlatePreview, addFoodToPlate, _resetPlateAndBelly } from '../../src/ui/plate';
import { getFood } from '../../src/state/food';

// Design: the 🔮 PREDICTION must NOT reveal the exact launched fart until you've
// fully learned every plated ingredient (all its axes revealed) — otherwise you
// could read the answer off the card and trivialise the level. Before that it's
// a rough raw estimate, flagged UNCERTAIN. After, it's the precise launched fart
// (the mastery payoff). beans: raw loud 2; Backyard area boosts loud x1.5 -> 3.

const beans = getFood('beans')!;
const allNonZero = (['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'] as const).filter(
  (a) => beans.properties[a] > 0,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('fart_pantry', JSON.stringify(['beans']));
  localStorage.setItem('fart_axes_discovered', JSON.stringify(['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp']));
  document.body.innerHTML = '<div id="platePreview"></div>';
  _resetPlateAndBelly();
  addFoodToPlate('beans');
});

describe('PREDICTION stays uncertain until the ingredient is fully learned', () => {
  it('shows the rough RAW estimate (not the area-modified answer) when not fully revealed', () => {
    renderPlatePreview();
    const txt = document.getElementById('platePreview')!.textContent || "";
    expect(txt).toMatch(/UNCERTAIN/i);
    expect(txt).toMatch(/loud\D*2(\D|$)/i); // raw loud 2, NOT the launched 3
  });

  it('shows the EXACT launched fart once every axis is revealed (mastery payoff)', () => {
    localStorage.setItem('fart_food_reveals_beans', JSON.stringify([...allNonZero]));
    renderPlatePreview();
    const txt = document.getElementById('platePreview')!.textContent || "";
    expect(txt).not.toMatch(/UNCERTAIN/i);
    expect(txt).toMatch(/loud\D*3(\D|$)/i); // area-modified loud (2 x 1.5)
  });
});
