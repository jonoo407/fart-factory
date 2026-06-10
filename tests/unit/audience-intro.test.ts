import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Sound overhaul — audience INTRO lines. When an audience walks in (rotation,
 * or the first gesture after page load) it greets the player out loud: same
 * per-audience ElevenLabs voice as the loved/evacuated reaction lines, fired
 * a beat after the signature cue so arrival reads signature → greeting.
 */

const { playSample, loadManifest } = vi.hoisted(() => ({
  playSample: vi.fn(async (..._args: unknown[]) => 0),
  loadManifest: vi.fn(async () => ({ version: 'v2', generatedAt: '', entries: [] })),
}));

vi.mock('../../src/audio/sample-player', () => ({
  loadManifest,
  playSample,
}));

vi.mock('../../src/audio/procedural', () => ({
  getAudioContext: () => ({}) as AudioContext,
}));

import { INTROS, REACTIONS } from '../../src/scoring/audience-reactions';
import { AUDIENCES } from '../../src/state/audience';
import { SEEDS, VOICE_CAST, VOICE_TIERS } from '../../scripts/sfx-seeds';
import {
  audienceVoiceSfxId,
  playAudienceArrival,
  INTRO_AFTER_SIGNATURE_MS,
} from '../../src/audio/event-sfx';

beforeEach(() => {
  localStorage.clear();
  playSample.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('INTROS — every audience has a fun greeting line', () => {
  it('covers all 20 audiences with non-empty lines', () => {
    for (const aud of AUDIENCES) {
      const line = INTROS[aud.id];
      expect(line, `missing intro for ${aud.id}`).toBeTruthy();
      expect(line!.length).toBeGreaterThan(10);
    }
  });

  it('keeps lines short enough to land as a greeting (TTS ≤ ~6s)', () => {
    for (const aud of AUDIENCES) {
      expect(INTROS[aud.id]!.length, `${aud.id} intro too long`).toBeLessThanOrEqual(160);
    }
  });

  it('intro lines are distinct from the reaction lines (new writing, not reuse)', () => {
    for (const aud of AUDIENCES) {
      expect(INTROS[aud.id]).not.toBe(REACTIONS[aud.id]?.loved);
      expect(INTROS[aud.id]).not.toBe(REACTIONS[aud.id]?.evacuated);
    }
  });
});

describe('intro TTS seeds — same voice as the reaction lines', () => {
  it("VOICE_TIERS includes 'intro'", () => {
    expect(VOICE_TIERS).toContain('intro');
  });

  it('every audience has a voice-<id>-intro seed voiced by its reaction voice', () => {
    const byId = new Map(SEEDS.map((s) => [s.id, s]));
    for (const aud of AUDIENCES) {
      const seed = byId.get(`voice-${aud.id}-intro`);
      expect(seed, `missing intro seed for ${aud.id}`).toBeDefined();
      if (seed!.kind !== 'tts') throw new Error(`intro seed for ${aud.id} is not TTS`);
      expect(seed!.text).toBe(INTROS[aud.id]);
      expect(seed!.voice_id).toBe(VOICE_CAST[aud.id]!.voice_id);
    }
  });
});

describe('playAudienceArrival — signature first, greeting a beat later', () => {
  it('derives the intro voice id', () => {
    expect(audienceVoiceSfxId('granny-edna', 'intro')).toBe('voice-granny-edna-intro');
  });

  it('plays the signature immediately, then the intro after the gap', async () => {
    const arrival = playAudienceArrival('granny-edna');
    await vi.advanceTimersByTimeAsync(0);
    const idsNow = playSample.mock.calls.map((c) => c[2] as string);
    expect(idsNow).toContain('sig-granny-edna');
    expect(idsNow).not.toContain('voice-granny-edna-intro');

    await vi.advanceTimersByTimeAsync(INTRO_AFTER_SIGNATURE_MS);
    const idsAfter = playSample.mock.calls.map((c) => c[2] as string);
    expect(idsAfter).toContain('voice-granny-edna-intro');
    await arrival;
  });
});
