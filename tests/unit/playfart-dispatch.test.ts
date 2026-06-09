import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FoodProperties } from '../../src/state/food';

/**
 * SEAM: playFart's dispatch into the rebuilt grid bank. fart-select.test.ts
 * proves the selector maps props→cells and manifest/content-integrity tests
 * prove the clips exist — but nothing pinned the ROUTING: rawProps present →
 * resolveFart + playGridClip after the 200ms anticipation cue. A refactor that
 * stopped passing rawProps (or re-ordered the branches) would silently swap
 * the launch sound while every other audio test stayed green — exactly how the
 * orphaned stems path was born.
 */

const playGridClip = vi.fn(async () => true);
const playSample = vi.fn(async () => 0);
const pickSampleId = vi.fn(() => null);

vi.mock('../../src/audio/sample-player', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/sample-player')>();
  return {
    ...actual,
    loadManifest: vi.fn(async () => null), // silence the module-init fetch
    playGridClip: (...args: unknown[]) => playGridClip(...(args as [])),
    playSample: (...args: unknown[]) => playSample(...(args as [])),
    pickSampleId: (...args: unknown[]) => pickSampleId(...(args as [])),
  };
});

// Minimal WebAudio fake — just enough for the anticipation-cue oscillator and
// playFart's ensureAudio() guard (jsdom ships no AudioContext at all).
class FakeParam {
  value = 0;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = '';
  connect(): void {}
  start(): void {}
  stop(): void {}
}
class FakeAudioContext {
  currentTime = 1.5;
  destination = {};
  state = 'running';
  createGain(): FakeNode { return new FakeNode(); }
  createOscillator(): FakeNode { return new FakeNode(); }
  resume(): Promise<void> { return Promise.resolve(); }
  suspend(): Promise<void> { return Promise.resolve(); }
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

const props = (wet = 0, dry = 0, stink = 0, loud = 0, musical = 0, length = 0, temp = 0): FoodProperties => ({
  wet, dry, stink, loud, musical, length, temp,
});

describe('playFart dispatch — the grid bank is the primary launch path', () => {
  it('rawProps → resolveFart clip scheduled via playGridClip 200ms after the cue', async () => {
    const { playFart, getLastFartSchedule } = await import('../../src/audio/procedural');
    const { resolveFart } = await import('../../src/audio/fart-select');
    const raw = props(3, 0, 3, 2, 0, 3, 1); // one bean
    const expected = resolveFart(raw);

    const total = playFart(2, 1, 2, 1, 1, 0, raw);

    expect(playGridClip).toHaveBeenCalledTimes(1);
    const [ctx, clipId, startAt, gain] = playGridClip.mock.calls[0]! as unknown as [
      FakeAudioContext, string, number, number,
    ];
    expect(ctx).toBeInstanceOf(FakeAudioContext);
    expect(clipId).toBe(expected.clipId);
    expect(startAt).toBeCloseTo(1.5 + 0.2, 5); // ctx.currentTime + cue 150ms + gap 50ms
    expect(gain).toBe(expected.gain);
    // The legacy sample path must NOT fire on a grid launch.
    expect(pickSampleId).not.toHaveBeenCalled();
    expect(playSample).not.toHaveBeenCalled();

    expect(total).toBeCloseTo(0.2 + expected.durationSeconds, 5);
    const sched = getLastFartSchedule();
    expect(sched?.cuePresent).toBe(true);
    expect(sched?.mainStartOffsetMs).toBe(200);
    expect(sched?.mainDurationMs).toBe(Math.round(expected.durationSeconds * 1000));
  });

  it('CHARACTERIZATION: a failed grid clip is fire-and-forget — no procedural fallback', async () => {
    // playGridClip resolving false (404 / decode error) leaves the cue played
    // and the main fart SILENT. The content-integrity test is the guard that
    // keeps this from happening (all 96 clips must exist on disk); this test
    // pins the runtime behavior so adding a fallback later is a conscious change.
    playGridClip.mockResolvedValueOnce(false);
    const { playFart } = await import('../../src/audio/procedural');
    const total = playFart(2, 1, 2, 1, 1, 0, props(3, 0, 3, 2, 0, 3, 1));
    await Promise.resolve(); // let the rejected playback settle
    expect(playSample).not.toHaveBeenCalled(); // no fallback fires
    expect(total).toBeGreaterThan(0); // caller still believes a fart played
  });

  it('muted farts channel → no audio at all (returns 0, no grid call)', async () => {
    const { setMuted } = await import('../../src/audio/audio-settings');
    setMuted(true);
    const { playFart } = await import('../../src/audio/procedural');
    const total = playFart(2, 1, 2, 1, 1, 0, props(3, 0, 3, 2, 0, 3, 1));
    expect(total).toBe(0);
    expect(playGridClip).not.toHaveBeenCalled();
  });
});
