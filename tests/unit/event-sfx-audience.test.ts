import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  audienceSignatureSfxId,
  audienceVoiceSfxId,
  playAudienceSignature,
  playAudienceVoice,
} from '../../src/audio/event-sfx';
import { AUDIENCES } from '../../src/state/audience';

// Mock the underlying sample-player so we don't try to touch AudioContext.
vi.mock('../../src/audio/sample-player', () => ({
  loadManifest: vi.fn(async () => null),
  playSample: vi.fn(async () => 0),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('audience-signature SFX id helper', () => {
  it('returns sig-<audienceId>', () => {
    expect(audienceSignatureSfxId('granny-edna')).toBe('sig-granny-edna');
  });

  it('every audience has a derivable signature id', () => {
    for (const aud of AUDIENCES) {
      const id = audienceSignatureSfxId(aud.id);
      expect(id.startsWith('sig-')).toBe(true);
      expect(id.length).toBeGreaterThan(4);
    }
  });
});

describe('audience-voice SFX id helper', () => {
  it('returns voice-<audienceId>-<tier>', () => {
    expect(audienceVoiceSfxId('granny-edna', 'loved')).toBe('voice-granny-edna-loved');
    expect(audienceVoiceSfxId('royal-court', 'evacuated')).toBe('voice-royal-court-evacuated');
  });

  it('every audience × tier yields a non-empty id', () => {
    for (const aud of AUDIENCES) {
      for (const tier of ['loved', 'evacuated'] as const) {
        expect(audienceVoiceSfxId(aud.id, tier).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('playAudienceSignature / playAudienceVoice resolve quietly when assets are missing', () => {
  it('playAudienceSignature does not throw for an unknown audience', async () => {
    await expect(playAudienceSignature('definitely-not-a-real-audience')).resolves.toBeUndefined();
  });

  it('playAudienceVoice does not throw for an unknown audience', async () => {
    await expect(
      playAudienceVoice('definitely-not-a-real-audience', 'loved'),
    ).resolves.toBeUndefined();
  });
});
