import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { foodBellySize, getFood } from '../../src/state/food';
import { renderBellyMeter, _resetPlateAndBelly } from '../../src/ui/plate';
import { BELLY_CAPACITY } from '../../src/state/persistence';

// New belly model: the stomach starts EMPTY and FILLS as you eat. A food's size
// scales with rarity (cooler foods take more room), and the meter shows how FULL
// you are (not how much is left).

describe('foodBellySize — bigger for cooler foods', () => {
  it('scales with rarity (common smallest, legendary biggest)', () => {
    const beans = getFood('beans')!; // common
    expect(foodBellySize(beans)).toBe(2);
    // strictly increasing by rarity tier
    const sizes = (['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map((r) =>
      foodBellySize({ rarity: r } as never),
    );
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]!);
  });
});

describe('belly meter shows FULLNESS (fills as you eat)', () => {
  beforeEach(() => {
    localStorage.clear();
  localStorage.setItem('fart_run_seed', '12345'); // pin: no unicorn roll, reproducible encounter seeds
    document.body.innerHTML =
      '<div class="belly-track" role="meter" aria-valuenow="0"><div class="belly-fill" id="bellyFill"></div></div>' +
      '<span id="bellyValue"></span><span id="bellyCap"></span>';
    _resetPlateAndBelly();
  });

  it('empty stomach reads 0 and the bar is empty', () => {
    renderBellyMeter();
    expect(document.getElementById('bellyValue')!.textContent).toBe('0');
    expect((document.getElementById('bellyFill') as HTMLElement).style.width).toBe('0%');
    expect(document.querySelector('.belly-track')!.getAttribute('aria-valuenow')).toBe('0');
  });

  it('shows how full you are = capacity minus remaining', () => {
    // remaining 14 of capacity -> used = cap - 14
    localStorage.setItem('fart_belly_e_0', '14');
    renderBellyMeter();
    const used = BELLY_CAPACITY - 14;
    expect(document.getElementById('bellyValue')!.textContent).toBe(String(used));
    expect(document.querySelector('.belly-track')!.getAttribute('aria-valuenow')).toBe(String(used));
  });
});
