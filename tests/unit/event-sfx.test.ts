import { describe, it, expect, beforeEach } from 'vitest';
import { FOOD_EATING_SFX, AUDIENCE_REACTION_SFX } from '../../src/audio/event-sfx';

beforeEach(() => {
  localStorage.clear();
});

describe('Event SFX constants (P3)', () => {
  it('FOOD_EATING_SFX has 4 ids matching the Phase K seeds', () => {
    expect(FOOD_EATING_SFX).toEqual(['food-munch', 'food-crunch', 'food-slurp', 'food-gulp']);
  });

  it('AUDIENCE_REACTION_SFX maps each tier to an id or null', () => {
    expect(AUDIENCE_REACTION_SFX.loved).toBeTruthy();
    expect(AUDIENCE_REACTION_SFX.liked).toBeTruthy();
    expect(AUDIENCE_REACTION_SFX.meh).toBeNull();
    expect(AUDIENCE_REACTION_SFX.disliked).toBeTruthy();
    expect(AUDIENCE_REACTION_SFX.evacuated).toBeTruthy();
  });
});

describe('Event SFX playback safety', () => {
  it('playEventSfx does not throw when manifest is unloaded', async () => {
    const { playEventSfx } = await import('../../src/audio/event-sfx');
    // In a jsdom environment there is no AudioContext, so getAudioContext()
    // returns null and the call exits silently. The contract is "must not
    // throw."
    await expect(playEventSfx('legendary-fanfare')).resolves.toBeUndefined();
  });

  it('playEventSfxOneOf with empty array exits silently', async () => {
    const { playEventSfxOneOf } = await import('../../src/audio/event-sfx');
    await expect(playEventSfxOneOf([])).resolves.toBeUndefined();
  });
});
