import { describe, it, expect, beforeEach, vi } from 'vitest';

// The belly-meter tap easter egg called playFart on EVERY click with no
// cooldown, so mashing it stacked overlapping mini-farts into a buzzy chord
// (same unbounded-polyphony root as the launch). Debounce it to one per window.

const playFart = vi.hoisted(() => vi.fn(() => 0));
vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart };
});

import { wireBellyMeterTap } from '../../src/ui/plate';

beforeEach(() => {
  localStorage.clear();
  playFart.mockClear();
  document.body.innerHTML = '<div class="belly-track"></div>';
});

describe('belly-meter tap debounce', () => {
  it('collapses a rapid burst of taps to a single fart', () => {
    wireBellyMeterTap();
    const track = document.querySelector<HTMLElement>('.belly-track')!;
    for (let i = 0; i < 5; i++) {
      track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(playFart).toHaveBeenCalledTimes(1);
  });
});
