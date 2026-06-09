import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { renderBellyMeter, _resetPlateAndBelly } from '../../src/ui/plate';

// The belly NUMBER + fill bar update correctly, but the role="meter" element's
// aria-valuenow was static in index.html and never updated by renderBellyMeter,
// so screen readers always announced the full value ("30") — the accessible
// meter "never emptied" even as the visible value dropped.
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML =
    '<div class="belly-track" role="meter" aria-valuemin="0" aria-valuemax="30" aria-valuenow="30">' +
    '<div class="belly-fill" id="bellyFill"></div></div>' +
    '<span id="bellyValue"></span><span id="bellyCap"></span>';
  _resetPlateAndBelly();
});

describe('belly meter accessible value tracks the remaining belly', () => {
  it('updates aria-valuenow to match the displayed remaining belly', () => {
    localStorage.setItem('fart_belly_e_0', '18');
    renderBellyMeter();
    const track = document.querySelector('.belly-track')!;
    expect(document.getElementById('bellyValue')!.textContent).toBe('18'); // sanity: value works
    expect(track.getAttribute('aria-valuenow')).toBe('18'); // the bug: was stuck at 30
  });
});
