import { describe, it, expect, beforeEach } from 'vitest';
import { AUDIENCE_REACTION_SFX } from '../../src/audio/event-sfx';

beforeEach(() => {
  localStorage.clear();
});

describe('Event SFX constants (P3)', () => {
  // (FOOD_EATING_SFX ↔ seed coverage is asserted in sfx-seeds.test.ts against
  // the real SEEDS table — the verbatim restatement that lived here was a
  // constant-equals-itself test and was removed.)

  it('AUDIENCE_REACTION_SFX maps each tier to an id or null', () => {
    expect(AUDIENCE_REACTION_SFX.loved).toBeTruthy();
    expect(AUDIENCE_REACTION_SFX.liked).toBeTruthy();
    expect(AUDIENCE_REACTION_SFX.meh).toBeNull();
    expect(AUDIENCE_REACTION_SFX.disliked).toBeTruthy();
    expect(AUDIENCE_REACTION_SFX.evacuated).toBeTruthy();
  });
});

describe('Event SFX playback safety', () => {
  it('playEventSfx does not throw when no AudioContext exists (jsdom)', async () => {
    const { playEventSfx } = await import('../../src/audio/event-sfx');
    // jsdom has no AudioContext, so getAudioContext() returns null and the
    // call exits at that guard (it never reaches the manifest check). The
    // contract under test is "must not throw."
    await expect(playEventSfx('legendary-fanfare')).resolves.toBeUndefined();
  });

  it('playEventSfxOneOf with empty array exits silently', async () => {
    const { playEventSfxOneOf } = await import('../../src/audio/event-sfx');
    await expect(playEventSfxOneOf([])).resolves.toBeUndefined();
  });
});
