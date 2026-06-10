import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Two generations of the same bug: the post-launch crowd stinger masking the
// fart. Gen 1: it fired synchronously with the launch (fixed by a 700ms
// stagger). Gen 2: the rebuilt fart bank plays clips up to ~4.5s, so the FIXED
// 700ms stagger again landed the stinger on top of the fart. The fix makes the
// delay dynamic — fart duration + a comic beat — with 700ms as the floor when
// the duration is unknown.

const { playEventSfx, playEventSfxOneOf, playAudienceVoice } = vi.hoisted(() => ({
  playEventSfx: vi.fn(async () => {}),
  playEventSfxOneOf: vi.fn(async () => {}),
  playAudienceVoice: vi.fn(async () => {}),
}));

// Keep AUDIENCE_REACTION_SFX real; spy only the playback functions.
vi.mock('../../src/audio/event-sfx', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/event-sfx')>();
  return { ...actual, playEventSfx, playEventSfxOneOf, playAudienceVoice };
});

// Avoid the dynamic canvas/particle import touching jsdom.
vi.mock('../../src/visuals/reaction-particles', () => ({
  spawnReactionParticles: vi.fn(),
}));

import {
  renderAudienceReaction,
  reactionDelayMs,
  performanceWindowMs,
  REACTION_SFX_DELAY_MS,
  REACTION_BREATH_MS,
  VOICE_AFTER_REACTION_MS,
  VOICE_LINE_ALLOWANCE_MS,
} from '../../src/ui/result-panel';
import { AUDIENCE_REACTION_SFX } from '../../src/audio/event-sfx';
import { AUDIENCES } from '../../src/state/audience';

const granny = AUDIENCES.find((a) => a.id === 'granny-edna')!;

beforeEach(() => {
  localStorage.clear();
  playEventSfx.mockClear();
  playEventSfxOneOf.mockClear();
  playAudienceVoice.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reactionDelayMs — the crowd waits for the fart to finish', () => {
  it('falls back to the 700ms floor when the fart duration is unknown', () => {
    expect(reactionDelayMs(undefined)).toBe(REACTION_SFX_DELAY_MS);
    expect(reactionDelayMs(0)).toBe(REACTION_SFX_DELAY_MS);
  });

  it('waits out a long fart, then adds a comic beat', () => {
    expect(reactionDelayMs(3000)).toBe(3000 + REACTION_BREATH_MS);
    expect(reactionDelayMs(4500)).toBe(4500 + REACTION_BREATH_MS);
  });

  it('never reacts sooner than the floor on a very short fart', () => {
    expect(reactionDelayMs(100)).toBe(REACTION_SFX_DELAY_MS);
  });
});

describe('performanceWindowMs — music stays SILENT through the whole launch arc', () => {
  it('covers fart + crowd stinger + voice line for a known fart duration', () => {
    expect(performanceWindowMs(3000)).toBe(
      reactionDelayMs(3000) + VOICE_AFTER_REACTION_MS + VOICE_LINE_ALLOWANCE_MS,
    );
  });

  it('falls back to the floor delay when the fart duration is unknown', () => {
    expect(performanceWindowMs(undefined)).toBe(
      REACTION_SFX_DELAY_MS + VOICE_AFTER_REACTION_MS + VOICE_LINE_ALLOWANCE_MS,
    );
  });

  it('the voice allowance outlasts the longest reaction clip (~5.0s)', () => {
    expect(VOICE_LINE_ALLOWANCE_MS).toBeGreaterThanOrEqual(5000);
  });
});

describe('audience reaction SFX is staggered AFTER the fart (not simultaneous)', () => {
  it('does NOT fire the reaction stinger synchronously with the launch', () => {
    renderAudienceReaction(10, granny); // 10% -> evacuated
    expect(playEventSfxOneOf).not.toHaveBeenCalled();
    expect(playEventSfx).not.toHaveBeenCalled();
  });

  it('with a known fart duration, holds the stinger until fart end + beat', () => {
    renderAudienceReaction(10, granny, 3000);
    vi.advanceTimersByTime(3000 + REACTION_BREATH_MS - 1);
    expect(playEventSfxOneOf).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(playEventSfxOneOf).toHaveBeenCalledTimes(1);
  });

  it('an F picks from the evacuated pool at reduced volume (the fart is the showcase)', () => {
    renderAudienceReaction(10, granny, 1000);
    vi.advanceTimersByTime(reactionDelayMs(1000));
    expect(playEventSfxOneOf).toHaveBeenCalledWith(AUDIENCE_REACTION_SFX.evacuated, 4);
  });

  it('a loved result picks from the loved pool at full stinger volume', () => {
    renderAudienceReaction(100, granny, 1000);
    vi.advanceTimersByTime(reactionDelayMs(1000));
    expect(playEventSfxOneOf).toHaveBeenCalledWith(AUDIENCE_REACTION_SFX.loved, 5);
  });

  it('does not voice-line until after the stinger (stinger delay + voice delay)', () => {
    renderAudienceReaction(100, granny, 2000); // loved -> stinger + voice
    vi.advanceTimersByTime(reactionDelayMs(2000));
    expect(playEventSfxOneOf).toHaveBeenCalledTimes(1);
    expect(playAudienceVoice).not.toHaveBeenCalled();
    vi.advanceTimersByTime(VOICE_AFTER_REACTION_MS);
    expect(playAudienceVoice).toHaveBeenCalledWith('granny-edna', 'loved');
  });

  it('meh tier plays the soft shrug pool AND still reads its line', () => {
    renderAudienceReaction(60, granny, 2000); // 60% -> meh
    vi.advanceTimersByTime(reactionDelayMs(2000) + VOICE_AFTER_REACTION_MS);
    expect(playEventSfxOneOf).toHaveBeenCalledWith(AUDIENCE_REACTION_SFX.meh, 3);
    expect(playAudienceVoice).toHaveBeenCalledWith('granny-edna', 'meh');
  });

  // "if you pass it should still read it for all of them" — every tier the
  // player can land gets its line read aloud, not just loved/evacuated.
  it.each([
    [100, 'loved'],
    [75, 'liked'],
    [60, 'meh'],
    [40, 'disliked'],
    [10, 'evacuated'],
  ] as const)('%i%% voices the %s line as the punchline', (pct, tier) => {
    renderAudienceReaction(pct, granny, 1000);
    vi.advanceTimersByTime(reactionDelayMs(1000) + VOICE_AFTER_REACTION_MS - 1);
    expect(playAudienceVoice).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(playAudienceVoice).toHaveBeenCalledWith('granny-edna', tier);
  });
});
