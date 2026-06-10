import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Sound overhaul: playCelebrationSting used a FLAT 0.18 master gain — gated on
 * the SFX channel being audible but deaf to its LEVEL. Every other sound scales
 * by effectiveVolume(channel)/100; a player at SFX=30 still got a full-loudness
 * sting. These tests pin the scaling.
 */

vi.mock('../../src/audio/sample-player', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/sample-player')>();
  return { ...actual, loadManifest: vi.fn(async () => null) };
});

class FakeParam {
  value = 0;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = '';
  connect(): void {}
  start(): void {}
  stop(): void {}
}
const createdGains: FakeNode[] = [];
class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';
  createGain(): FakeNode {
    const n = new FakeNode();
    createdGains.push(n);
    return n;
  }
  createOscillator(): FakeNode { return new FakeNode(); }
  resume(): Promise<void> { return Promise.resolve(); }
  suspend(): Promise<void> { return Promise.resolve(); }
}

beforeEach(() => {
  localStorage.clear();
  createdGains.length = 0;
  vi.clearAllMocks();
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

describe('playCelebrationSting volume', () => {
  it('scales the master gain by the effective SFX volume', async () => {
    const { setChannelVolume } = await import('../../src/audio/audio-settings');
    setChannelVolume('sfx', 50);
    const { playCelebrationSting } = await import('../../src/audio/procedural');
    const dur = playCelebrationSting();
    expect(dur).toBeGreaterThan(0);
    // The first gain created is the sting's master bus.
    expect(createdGains[0]!.gain.value).toBeCloseTo(0.18 * 0.5, 5);
  });

  it('plays at full sting level when SFX is at 100', async () => {
    const { playCelebrationSting } = await import('../../src/audio/procedural');
    playCelebrationSting();
    expect(createdGains[0]!.gain.value).toBeCloseTo(0.18, 5);
  });

  it('is silent (returns 0) when the SFX channel is muted', async () => {
    const { setChannelVolume } = await import('../../src/audio/audio-settings');
    setChannelVolume('sfx', 0);
    const { playCelebrationSting } = await import('../../src/audio/procedural');
    expect(playCelebrationSting()).toBe(0);
    expect(createdGains.length).toBe(0);
  });
});
