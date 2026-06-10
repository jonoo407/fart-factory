import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wireAudioUnlock, onAudioUnlocked } from '../../src/audio/procedural';

/**
 * Sound overhaul — onAudioUnlocked lets features queue audio for the moment
 * the first user gesture unlocks the context (audience arrival greeting,
 * background music start). Before this, anything played at page load was
 * silently dropped: getAudioContext() returned null until the first gesture.
 *
 * Fresh module instance per FILE in vitest — these tests own the pre-unlock
 * state, so they live apart from audio-unlock.test.ts (which unlocks early).
 */

class FakeAudioContext {
  state: 'suspended' | 'running' = 'suspended';
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    return Promise.resolve();
  }
}

beforeEach(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

describe('onAudioUnlocked', () => {
  it('queues callbacks before unlock and fires each exactly once on the first gesture', () => {
    const cb = vi.fn();
    onAudioUnlocked(cb);
    expect(cb).not.toHaveBeenCalled();

    wireAudioUnlock(document);
    document.dispatchEvent(new Event('pointerdown'));
    expect(cb).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires immediately when registered after the unlock already happened', () => {
    const late = vi.fn();
    onAudioUnlocked(late);
    expect(late).toHaveBeenCalledTimes(1);
  });
});
