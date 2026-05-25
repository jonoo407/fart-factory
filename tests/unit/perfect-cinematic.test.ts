import { describe, it, expect, beforeEach, vi } from 'vitest';
import { playPerfectCinematic } from '../../src/ui/perfect-cinematic';

vi.mock('../../src/audio/procedural', () => ({
  playCelebrationSting: vi.fn(() => 0),
}));

beforeEach(() => {
  document.body.innerHTML = `
    <button id="storyLaunchBtn"></button>
    <div id="gasOverlay"></div>
  `;
});

describe('playPerfectCinematic', () => {
  it('disables the launch button immediately and re-enables after the hold', async () => {
    vi.useFakeTimers();
    const promise = playPerfectCinematic();
    const btn = document.getElementById('storyLaunchBtn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(1300);
    await promise;
    expect(btn.disabled).toBe(false);
    vi.useRealTimers();
  });

  it('skips the hold under prefers-reduced-motion', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList));
    const start = Date.now();
    await playPerfectCinematic();
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('does not throw if launch button is missing', async () => {
    document.body.innerHTML = '<div id="gasOverlay"></div>';
    vi.useFakeTimers();
    const promise = playPerfectCinematic();
    await vi.advanceTimersByTimeAsync(1300);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
