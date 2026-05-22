import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawnConfetti } from '../../src/visuals/confetti';

beforeEach(() => {
  document.body.innerHTML = '<div id="gasOverlay"></div>';
  vi.useRealTimers();
});

describe('spawnConfetti', () => {
  it('spawns the requested number of confetti pieces into #gasOverlay', () => {
    spawnConfetti(12);
    const host = document.getElementById('gasOverlay')!;
    expect(host.querySelectorAll('.confetti-piece').length).toBe(12);
  });

  it('each piece gets a custom-property starting x position', () => {
    spawnConfetti(3);
    const pieces = document.querySelectorAll<HTMLElement>('.confetti-piece');
    for (const p of pieces) {
      expect(p.style.getPropertyValue('--cx')).toMatch(/vw$/);
    }
  });

  it('is a no-op when prefers-reduced-motion is reduce', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList));
    spawnConfetti(20);
    expect(document.querySelectorAll('.confetti-piece').length).toBe(0);
    matchMediaSpy.mockRestore();
  });

  it('is a no-op when host element is missing', () => {
    document.body.innerHTML = '';
    expect(() => spawnConfetti(10)).not.toThrow();
  });
});
