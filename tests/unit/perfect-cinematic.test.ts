import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

afterEach(() => {
  // The matchMedia spy must not leak into the next test — with it leaked, the
  // hold-timer tests would silently pass via the reduced-motion instant path.
  vi.restoreAllMocks();
  vi.useRealTimers();
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
    // With fake timers and ZERO time advanced, the promise must already be
    // settled — proving no hold timer was scheduled (deterministic, unlike the
    // old wall-clock <50ms assertion).
    vi.useFakeTimers();
    let resolved = false;
    void playPerfectCinematic().then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
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
