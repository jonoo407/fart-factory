import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Sound overhaul — background music. Two ~20s ambient loops (lab / boss arena)
 * through the until-now-unused Music channel. Design constraints under test:
 *  - LOW by default: base gain 0.22 × music channel (new-player default 35)
 *  - never talks over the comedy: duckMusic() drops it during the launch window
 *  - live volume: refreshMusicGain() follows the settings popover sliders
 *  - graceful: no context / missing asset → silent no-op, never a crash
 */

const fakeBuffer = { duration: 20 } as AudioBuffer;

class FakeParam {
  value = 0;
  setValueAtTime(v: number): void { this.value = v; }
  linearRampToValueAtTime(v: number): void { this.value = v; }
  cancelScheduledValues(): void {}
  setTargetAtTime(v: number): void { this.value = v; }
}
class FakeSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  started = 0;
  stopped = 0;
  onended: (() => void) | null = null;
  connect(): void {}
  start(): void { this.started++; }
  stop(): void { this.stopped++; }
}
class FakeGain {
  gain = new FakeParam();
  connect(): void {}
  disconnect(): void {}
}
const created: { sources: FakeSource[]; gains: FakeGain[] } = { sources: [], gains: [] };
class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';
  createBufferSource(): FakeSource {
    const s = new FakeSource();
    created.sources.push(s);
    return s;
  }
  createGain(): FakeGain {
    const g = new FakeGain();
    created.gains.push(g);
    return g;
  }
  decodeAudioData(): Promise<AudioBuffer> { return Promise.resolve(fakeBuffer); }
  resume(): Promise<void> { return Promise.resolve(); }
  suspend(): Promise<void> { return Promise.resolve(); }
}

let ctx: FakeAudioContext | null = null;
vi.mock('../../src/audio/procedural', () => ({
  getAudioContext: () => ctx as unknown as AudioContext | null,
}));

let fetchOk = true;
beforeEach(() => {
  localStorage.clear();
  created.sources.length = 0;
  created.gains.length = 0;
  ctx = new FakeAudioContext();
  fetchOk = true;
  vi.stubGlobal('fetch', vi.fn(async () =>
    fetchOk
      ? ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as Response)
      : ({ ok: false, status: 404 } as Response),
  ));
  vi.useFakeTimers();
});

afterEach(async () => {
  const { _resetMusicForTests } = await import('../../src/audio/music');
  _resetMusicForTests();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('audio-settings: music defaults LOW', () => {
  it('new players get music at 35 (mood-setting, not distracting)', async () => {
    const { loadAudioSettings } = await import('../../src/audio/audio-settings');
    expect(loadAudioSettings().music).toBe(35);
  });
});

describe('musicGainValue', () => {
  it('scales the low base gain by the effective music volume', async () => {
    const { musicGainValue, MUSIC_BASE_GAIN } = await import('../../src/audio/music');
    // default music 35, master 100
    expect(musicGainValue()).toBeCloseTo(MUSIC_BASE_GAIN * 0.35, 5);
  });

  it('is 0 when the music channel is muted', async () => {
    const { setChannelVolume } = await import('../../src/audio/audio-settings');
    setChannelVolume('music', 0);
    const { musicGainValue } = await import('../../src/audio/music');
    expect(musicGainValue()).toBe(0);
  });
});

describe('startMusic / switch / stop', () => {
  it('returns false with no AudioContext (pre-gesture) and stays silent', async () => {
    ctx = null;
    const { startMusic, currentMusicTrack } = await import('../../src/audio/music');
    expect(await startMusic('lab')).toBe(false);
    expect(currentMusicTrack()).toBeNull();
  });

  it('starts the lab loop: looped source through a gain at musicGainValue', async () => {
    const { startMusic, currentMusicTrack, musicGainValue } = await import('../../src/audio/music');
    expect(await startMusic('lab')).toBe(true);
    expect(currentMusicTrack()).toBe('lab');
    expect(created.sources.length).toBe(1);
    expect(created.sources[0]!.loop).toBe(true);
    expect(created.sources[0]!.started).toBe(1);
    expect(created.gains[0]!.gain.value).toBeCloseTo(musicGainValue(), 5);
  });

  it('switching tracks stops the old source and starts the new one', async () => {
    const { startMusic, currentMusicTrack } = await import('../../src/audio/music');
    await startMusic('lab');
    await startMusic('boss');
    vi.advanceTimersByTime(1000); // let the fade-out stop fire
    expect(created.sources[0]!.stopped).toBeGreaterThanOrEqual(1);
    expect(created.sources.length).toBe(2);
    expect(currentMusicTrack()).toBe('boss');
  });

  it('re-starting the same track is a no-op (no second source)', async () => {
    const { startMusic } = await import('../../src/audio/music');
    await startMusic('lab');
    await startMusic('lab');
    expect(created.sources.length).toBe(1);
  });

  it('missing asset (404) → false, nothing playing', async () => {
    fetchOk = false;
    const { startMusic, currentMusicTrack } = await import('../../src/audio/music');
    expect(await startMusic('lab')).toBe(false);
    expect(currentMusicTrack()).toBeNull();
  });
});

describe('duckMusic — the fart is the readout', () => {
  it('drops the gain during the launch window and restores it after', async () => {
    const { startMusic, duckMusic, musicGainValue, MUSIC_DUCK_FACTOR } = await import('../../src/audio/music');
    await startMusic('lab');
    const full = musicGainValue();
    duckMusic(2);
    expect(created.gains[0]!.gain.value).toBeCloseTo(full * MUSIC_DUCK_FACTOR, 5);
    vi.advanceTimersByTime(2100);
    expect(created.gains[0]!.gain.value).toBeCloseTo(full, 5);
  });
});

describe('refreshMusicGain — follows the settings sliders live', () => {
  it('applies a changed music volume to the playing loop', async () => {
    const { startMusic, refreshMusicGain, MUSIC_BASE_GAIN } = await import('../../src/audio/music');
    const { setChannelVolume } = await import('../../src/audio/audio-settings');
    await startMusic('lab');
    setChannelVolume('music', 80);
    refreshMusicGain();
    expect(created.gains[0]!.gain.value).toBeCloseTo(MUSIC_BASE_GAIN * 0.8, 5);
  });
});

describe('music track seeds', () => {
  it('both loops are seeded via the Music API (sound overhaul v2 — real music, not SFX beeps)', async () => {
    const { SEEDS } = await import('../../scripts/sfx-seeds');
    const lab = SEEDS.find((s) => s.id === 'music-lab-loop');
    const boss = SEEDS.find((s) => s.id === 'music-boss-loop');
    for (const seed of [lab, boss]) {
      expect(seed).toBeDefined();
      expect((seed as { category?: string }).category).toBe('music');
      if (seed!.kind !== 'music') throw new Error('music seed must be music kind (Music API)');
      expect(seed!.music_length_ms).toBeGreaterThanOrEqual(15_000);
      expect(seed!.music_length_ms).toBeLessThanOrEqual(60_000);
      expect(seed!.prompt).toMatch(/loop/i);
      expect(seed!.prompt).toMatch(/instrumental/i);
    }
  });
});
