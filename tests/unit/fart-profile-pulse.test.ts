import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pulseFartProfile, renderFartProfileHtml } from '../../src/ui/fart-profile';
import type { FoodProperties } from '../../src/state/food';

const props = (
  wet: number, dry: number, stink: number, loud: number,
  musical: number, length: number, temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

/**
 * V8 T3 — pulse-on-playback.
 *
 * When a fart's audio plays, the Fart Profile's bars should "pulse"
 * in step with the sound. We implement this by adding a CSS class
 * (`fart-profile-pulsing`) to the card; the staggered CSS animations
 * do the rest.
 *
 * Contract:
 *   - pulseFartProfile(container) adds the class.
 *   - After 2s the class is removed (re-trigger-able on next launch).
 *   - Safe to call with null / missing markup (no throw).
 */

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `<div id="fartProfile">${renderFartProfileHtml(
    props(3, 0, 3, 2, 0, 0, 0),
    ['wet', 'loud', 'stink'],
  )}</div>`;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('pulseFartProfile (V8 T3)', () => {
  it('adds the fart-profile-pulsing class to the card', () => {
    const wrap = document.getElementById('fartProfile');
    pulseFartProfile(wrap);
    const card = wrap?.querySelector('.fart-profile-card');
    expect(card?.classList.contains('fart-profile-pulsing')).toBe(true);
  });

  it('removes the class after 2 seconds', () => {
    const wrap = document.getElementById('fartProfile');
    pulseFartProfile(wrap);
    const card = wrap?.querySelector('.fart-profile-card');
    expect(card?.classList.contains('fart-profile-pulsing')).toBe(true);
    vi.advanceTimersByTime(2100);
    expect(card?.classList.contains('fart-profile-pulsing')).toBe(false);
  });

  it('is safe to call with a null container', () => {
    expect(() => pulseFartProfile(null)).not.toThrow();
  });

  it('is safe to call when the .fart-profile-card is missing', () => {
    document.body.innerHTML = '<div id="fartProfile"></div>';
    const wrap = document.getElementById('fartProfile');
    expect(() => pulseFartProfile(wrap)).not.toThrow();
  });

  it('can be re-triggered (class returns after second call)', () => {
    const wrap = document.getElementById('fartProfile');
    pulseFartProfile(wrap);
    vi.advanceTimersByTime(2100);
    const card = wrap?.querySelector('.fart-profile-card');
    expect(card?.classList.contains('fart-profile-pulsing')).toBe(false);
    pulseFartProfile(wrap);
    expect(card?.classList.contains('fart-profile-pulsing')).toBe(true);
  });
});
