import { describe, it, expect, beforeEach } from 'vitest';
import { AUDIENCE_REACTION_SFX } from '../../src/audio/event-sfx';
import { SEEDS } from '../../scripts/sfx-seeds';

beforeEach(() => {
  localStorage.clear();
});

describe('Event SFX constants (P3)', () => {
  // (FOOD_EATING_SFX ↔ seed coverage is asserted in sfx-seeds.test.ts against
  // the real SEEDS table — the verbatim restatement that lived here was a
  // constant-equals-itself test and was removed.)

  it('AUDIENCE_REACTION_SFX maps EVERY tier to a non-empty pool (meh got its shrug)', () => {
    expect(AUDIENCE_REACTION_SFX.loved.length).toBeGreaterThanOrEqual(1);
    expect(AUDIENCE_REACTION_SFX.liked.length).toBeGreaterThanOrEqual(1);
    expect(AUDIENCE_REACTION_SFX.meh.length).toBeGreaterThanOrEqual(1);
    expect(AUDIENCE_REACTION_SFX.disliked.length).toBeGreaterThanOrEqual(1);
    expect(AUDIENCE_REACTION_SFX.evacuated.length).toBeGreaterThanOrEqual(1);
  });

  it('fail tiers have ≥3 variants so an F does not sound identical every time', () => {
    expect(AUDIENCE_REACTION_SFX.disliked.length).toBeGreaterThanOrEqual(3);
    expect(AUDIENCE_REACTION_SFX.evacuated.length).toBeGreaterThanOrEqual(3);
  });

  it('fail tiers no longer use the 2s haunted-mansion-moan (too long/loud over the fart)', () => {
    expect(AUDIENCE_REACTION_SFX.disliked).not.toContain('haunted-mansion-moan');
    expect(AUDIENCE_REACTION_SFX.evacuated).not.toContain('haunted-mansion-moan');
  });

  it('every pooled reaction id has a real seed (no silent typos)', () => {
    const seedIds = new Set(SEEDS.map((s) => s.id));
    for (const pool of Object.values(AUDIENCE_REACTION_SFX)) {
      for (const id of pool) expect(seedIds.has(id), `unknown sfx id ${id}`).toBe(true);
    }
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
