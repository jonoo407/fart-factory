import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasSeenFeatureIntro,
  markFeatureIntroSeen,
  resetAllFeatureIntros,
  showFeatureIntro,
} from '../../src/ui/feature-intro';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('feature-intro persistence', () => {
  it('hasSeenFeatureIntro is false by default', () => {
    expect(hasSeenFeatureIntro('kitchen')).toBe(false);
  });

  it('markFeatureIntroSeen flips the flag', () => {
    markFeatureIntroSeen('kitchen');
    expect(hasSeenFeatureIntro('kitchen')).toBe(true);
  });

  it('per-id scoping (kitchen seen does not affect boss)', () => {
    markFeatureIntroSeen('kitchen');
    expect(hasSeenFeatureIntro('boss')).toBe(false);
  });

  it('resetAllFeatureIntros clears every intro flag but leaves other keys', () => {
    markFeatureIntroSeen('kitchen');
    markFeatureIntroSeen('boss');
    localStorage.setItem('not_an_intro', 'keep');
    resetAllFeatureIntros();
    expect(hasSeenFeatureIntro('kitchen')).toBe(false);
    expect(hasSeenFeatureIntro('boss')).toBe(false);
    expect(localStorage.getItem('not_an_intro')).toBe('keep');
  });
});

describe('showFeatureIntro DOM behavior', () => {
  it('mounts an overlay with the supplied title + body the first time', () => {
    showFeatureIntro({ id: 'kitchen', emoji: '🍳', title: 'Kitchen!', body: 'Try treatments.' });
    expect(document.querySelectorAll('.feature-intro').length).toBe(1);
    expect(document.querySelector('.feature-intro-title')?.textContent).toBe('Kitchen!');
    expect(document.querySelector('.feature-intro-body')?.textContent).toBe('Try treatments.');
  });

  it('flips the seen flag after first show', () => {
    showFeatureIntro({ id: 'kitchen', emoji: '🍳', title: 'K', body: 'b' });
    expect(hasSeenFeatureIntro('kitchen')).toBe(true);
  });

  it('does NOT mount a second time once seen', () => {
    showFeatureIntro({ id: 'kitchen', emoji: '🍳', title: 'K', body: 'b' });
    // remove the first instance to make absence detectable
    document.body.innerHTML = '';
    showFeatureIntro({ id: 'kitchen', emoji: '🍳', title: 'K', body: 'b' });
    expect(document.querySelectorAll('.feature-intro').length).toBe(0);
  });

  it('close button removes the overlay', () => {
    showFeatureIntro({ id: 'boss', emoji: '⚔', title: 'B', body: 'b' });
    document.querySelector<HTMLButtonElement>('.feature-intro-close')!.click();
    expect(document.querySelectorAll('.feature-intro').length).toBe(0);
  });

  it('clicking the overlay backdrop closes', () => {
    showFeatureIntro({ id: 'boss', emoji: '⚔', title: 'B', body: 'b' });
    const overlay = document.querySelector<HTMLElement>('.feature-intro')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelectorAll('.feature-intro').length).toBe(0);
  });

  it('escapes HTML in title/body to prevent injection', () => {
    showFeatureIntro({ id: 'xss', emoji: '⚔', title: '<img src=x>', body: '<script>' });
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('.feature-intro-title')?.textContent).toBe('<img src=x>');
  });
});
