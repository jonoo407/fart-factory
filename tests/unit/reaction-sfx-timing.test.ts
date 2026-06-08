import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The bug: the post-launch crowd reaction stinger was fired SYNCHRONOUSLY with
// the fart (startAt=0), so it started ~0.2s before the fart's main hit, ran
// longer, and was ~3x louder — masking the fart. The fix staggers the stinger
// (and the voice line) to land AFTER the fart, so the fart is heard first.

const { playEventSfx, playAudienceVoice } = vi.hoisted(() => ({
  playEventSfx: vi.fn(async () => {}),
  playAudienceVoice: vi.fn(async () => {}),
}));

// Keep AUDIENCE_REACTION_SFX real; spy only the playback functions.
vi.mock('../../src/audio/event-sfx', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/event-sfx')>();
  return { ...actual, playEventSfx, playAudienceVoice };
});

// Avoid the dynamic canvas/particle import touching jsdom.
vi.mock('../../src/visuals/reaction-particles', () => ({
  spawnReactionParticles: vi.fn(),
}));

import {
  renderAudienceReaction,
  REACTION_SFX_DELAY_MS,
  VOICE_AFTER_REACTION_MS,
} from '../../src/ui/result-panel';
import { AUDIENCES } from '../../src/state/audience';

const granny = AUDIENCES.find((a) => a.id === 'granny-edna')!;

beforeEach(() => {
  localStorage.clear();
  playEventSfx.mockClear();
  playAudienceVoice.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('audience reaction SFX is staggered AFTER the fart (not simultaneous)', () => {
  it('does NOT fire the reaction stinger synchronously with the launch', () => {
    renderAudienceReaction(10, granny); // 10% -> evacuated -> haunted-mansion-moan
    expect(playEventSfx).not.toHaveBeenCalled();
  });

  it('fires the stinger only after the reaction delay', () => {
    renderAudienceReaction(10, granny);
    expect(playEventSfx).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REACTION_SFX_DELAY_MS);
    expect(playEventSfx).toHaveBeenCalledTimes(1);
    expect(playEventSfx).toHaveBeenCalledWith('haunted-mansion-moan', 5);
  });

  it('does not voice-line until after the stinger (stinger delay + voice delay)', () => {
    renderAudienceReaction(100, granny); // 100% -> loved -> applause + voice
    vi.advanceTimersByTime(REACTION_SFX_DELAY_MS);
    expect(playEventSfx).toHaveBeenCalledWith('royal-court-applause', 5);
    expect(playAudienceVoice).not.toHaveBeenCalled();
    vi.advanceTimersByTime(VOICE_AFTER_REACTION_MS);
    expect(playAudienceVoice).toHaveBeenCalledWith('granny-edna', 'loved');
  });

  it('meh tier stays silent (no stinger, no voice) even after delays', () => {
    renderAudienceReaction(60, granny); // 60% -> meh -> null sfx
    vi.advanceTimersByTime(REACTION_SFX_DELAY_MS + VOICE_AFTER_REACTION_MS);
    expect(playEventSfx).not.toHaveBeenCalled();
    expect(playAudienceVoice).not.toHaveBeenCalled();
  });
});
