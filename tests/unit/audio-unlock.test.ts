import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wireAudioUnlock, getAudioContext } from '../../src/audio/procedural';

// The bug: the AudioContext is created lazily and is born 'suspended' per the
// browser autoplay policy. Nothing resumed it on the first user gesture (only
// tab-visibility and the mute toggle resumed), so on stricter browsers (iOS
// Safari) every sound — fart included — was silently scheduled into a dead
// context. wireAudioUnlock() must create + resume the context on first input.

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  resumeCalls = 0;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

beforeEach(() => {
  FakeAudioContext.instances = [];
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

describe('wireAudioUnlock — first-gesture AudioContext unlock', () => {
  it('creates and resumes the context on the first pointerdown', () => {
    wireAudioUnlock(document);
    document.dispatchEvent(new Event('pointerdown'));
    const ctx = getAudioContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.state).toBe('running');
    expect((ctx as unknown as FakeAudioContext).resumeCalls).toBeGreaterThanOrEqual(1);
  });

  it('unbinds after the first gesture (does not create a second context)', () => {
    wireAudioUnlock(document);
    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown'));
    document.dispatchEvent(new Event('pointerdown'));
    // Only the original context should exist; later gestures are no-ops.
    expect(FakeAudioContext.instances.length).toBeLessThanOrEqual(1);
  });
});
