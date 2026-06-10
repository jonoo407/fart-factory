import { describe, it, expect } from 'vitest';
import { SEEDS, VOICE_CAST, VOICE_TIERS, voiceSeedId, type Seed } from '../../scripts/sfx-seeds';
import { AUDIENCES } from '../../src/state/audience';
import { REACTIONS, INTROS } from '../../src/scoring/audience-reactions';

const SFX_SEEDS = SEEDS.filter((s): s is Extract<typeof s, { kind: 'sfx' }> => s.kind === 'sfx');
const TTS_SEEDS = SEEDS.filter((s): s is Extract<typeof s, { kind: 'tts' }> => s.kind === 'tts');

describe('SFX seeds catalog (Phase K — Library Richness)', () => {
  it('has ≥20 named effects (A28 Library Richness gate)', () => {
    expect(SFX_SEEDS.length).toBeGreaterThanOrEqual(20);
  });

  it('every seed has unique id', () => {
    const ids = SEEDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every SFX seed has a non-empty prompt and a positive duration', () => {
    for (const s of SFX_SEEDS) {
      expect(s.prompt.length).toBeGreaterThan(0);
      expect(s.duration_seconds).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('every TTS seed has non-empty text + a voice_id + a name', () => {
    for (const s of TTS_SEEDS) {
      expect(s.text.length).toBeGreaterThan(0);
      expect(s.voice_id.length).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('covers all 3 SFX duration buckets (short ≤0.5s, medium 0.5-1.5s, long >1.5s)', () => {
    const short = SFX_SEEDS.filter((s) => s.duration_seconds <= 0.5);
    const medium = SFX_SEEDS.filter((s) => s.duration_seconds > 0.5 && s.duration_seconds <= 1.5);
    const long = SFX_SEEDS.filter((s) => s.duration_seconds > 1.5);
    expect(short.length).toBeGreaterThanOrEqual(1);
    expect(medium.length).toBeGreaterThanOrEqual(1);
    expect(long.length).toBeGreaterThanOrEqual(1);
  });

  it('covers ≥5 distinct moods (Library Richness — variety)', () => {
    const moods = new Set(SEEDS.map((s) => s.mood));
    expect(moods.size).toBeGreaterThanOrEqual(5);
  });

  it('includes the new Phase K audience-reaction seeds', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    const required = [
      'granny-cackle',
      'royal-court-applause',
      'frat-howl',
      'alien-tourists-gasp',
      'toddler-giggle',
    ];
    for (const r of required) expect(ids.has(r)).toBe(true);
  });

  it('includes the flop-reaction variant seeds (variety on a failed launch)', () => {
    const byId = new Map(SFX_SEEDS.map((s) => [s.id, s]));
    const required = ['flop-groan', 'flop-boo', 'flop-crickets', 'flop-whistle-down'];
    for (const r of required) {
      const seed = byId.get(r);
      expect(seed, `missing seed ${r}`).toBeDefined();
      expect(seed!.category).toBe('reaction');
      // The whole point: a quick sting, not the 2s haunted-mansion moan that
      // talked over the fart. Keep every flop variant short.
      expect(seed!.duration_seconds, `${r} too long`).toBeLessThanOrEqual(1.5);
    }
  });

  it('includes food-eating SFX seeds (Phase K item 62)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    const required = ['food-munch', 'food-crunch', 'food-slurp', 'food-gulp'];
    for (const r of required) expect(ids.has(r)).toBe(true);
  });

  it('includes legendary-fanfare SFX seeds (Phase K item 63)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    expect(ids.has('legendary-fanfare')).toBe(true);
    expect(ids.has('quest-claimed')).toBe(true);
  });

  it('includes 5 per-boss entrance SFX seeds (PLAN_v5 P8)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    for (const id of [
      'boss-entrance-granny',
      'boss-entrance-royal',
      'boss-entrance-haunted',
      'boss-entrance-volcano',
      'boss-entrance-cosmic',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

// Sound-overhaul cleanup: the live-layering stem system was scrapped for the
// 96-clip grid bank, and haunted-mansion-moan was orphaned by the flop-variety
// rework. Neither may ship — dead bytes in public/sfx and dead manifest rows.
describe('dead-asset cleanup (sound overhaul)', () => {
  it('has no stem-category seeds (live layering was scrapped)', () => {
    const stems = SEEDS.filter((s) => (s as { category?: string }).category === 'stem');
    expect(stems.map((s) => s.id)).toEqual([]);
  });

  it('has no haunted-mansion-moan seed (orphaned by flop variety)', () => {
    expect(SEEDS.some((s) => s.id === 'haunted-mansion-moan')).toBe(false);
  });
});

describe('audience signature SFX (Phase 3)', () => {
  it('every audience has a signature SFX seed (sig-<audId>)', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    for (const aud of AUDIENCES) {
      expect(ids.has(`sig-${aud.id}`)).toBe(true);
    }
  });
});

describe('audience voice TTS (Phase 4)', () => {
  it('every audience has a voice cast mapping with a non-empty voice_id', () => {
    for (const aud of AUDIENCES) {
      const cast = VOICE_CAST[aud.id];
      expect(cast).toBeDefined();
      expect(cast!.voice_id.length).toBeGreaterThan(8);
    }
  });

  it('every audience has a TTS seed for EVERY tier (no unvoiced lines)', () => {
    const byId = new Map(TTS_SEEDS.map((s) => [s.id, s]));
    for (const aud of AUDIENCES) {
      for (const tier of VOICE_TIERS) {
        const seed = byId.get(voiceSeedId(aud.id, tier));
        expect(seed, `missing ${voiceSeedId(aud.id, tier)}`).toBeDefined();
      }
    }
  });

  it("every TTS seed's text matches its source line verbatim (REACTIONS or INTROS)", () => {
    for (const seed of TTS_SEEDS) {
      // Parse the id pattern: voice-<audId>-<tier>
      const match = seed.id.match(/^voice-(.+)-(loved|liked|meh|disliked|evacuated|intro)$/);
      expect(match, `unparseable voice seed id ${seed.id}`).not.toBeNull();
      const [, audId, tier] = match!;
      const expected =
        tier === 'intro'
          ? INTROS[audId!]
          : REACTIONS[audId!]?.[tier as 'loved' | 'liked' | 'meh' | 'disliked' | 'evacuated'];
      expect(seed.text).toBe(expected);
    }
  });

  it('voices ALL 5 reaction tiers + intro for all 20 audiences (120 clips)', () => {
    // "not all lines are voiced, voice them all" — liked/meh/disliked were
    // text-only; every tier the player can land must now read its line aloud.
    expect([...VOICE_TIERS]).toEqual(['loved', 'liked', 'meh', 'disliked', 'evacuated', 'intro']);
    expect(TTS_SEEDS.length).toBe(AUDIENCES.length * VOICE_TIERS.length);
  });
});

// "The baby sounds like a woman" — every audience must sound like WHO THEY
// ARE. ElevenLabs' premade roster has no babies/kids/ghosts/aliens, so the
// cast carries a postFx (ffmpeg pitch/effect chain applied at generation
// time) that moves the register where casting alone can't.
describe('voice casting — characters sound like who they are', () => {
  it('baby-shower is pitched up to a baby register, not an adult woman', () => {
    expect(VOICE_CAST['baby-shower']!.postFx?.semitones).toBeGreaterThanOrEqual(6);
  });

  it('toddler-bday and kindergarten are pitched up to kid registers', () => {
    expect(VOICE_CAST['toddler-bday']!.postFx?.semitones).toBeGreaterThanOrEqual(4);
    expect(VOICE_CAST['kindergarten']!.postFx?.semitones).toBeGreaterThanOrEqual(3);
  });

  it('the baby is pitched higher than the toddler, the toddler above the kindergartner', () => {
    const baby = VOICE_CAST['baby-shower']!.postFx!.semitones!;
    const toddler = VOICE_CAST['toddler-bday']!.postFx!.semitones!;
    const kinder = VOICE_CAST['kindergarten']!.postFx!.semitones!;
    expect(baby).toBeGreaterThan(toddler);
    expect(toddler).toBeGreaterThan(kinder);
  });

  it('haunted-mansion gets a ghostly echo', () => {
    const fx = VOICE_CAST['haunted-mansion']!.postFx;
    expect(fx?.filters?.some((f) => f.includes('aecho'))).toBe(true);
  });

  it('alien-tourists get an unearthly warble', () => {
    const fx = VOICE_CAST['alien-tourists']!.postFx;
    expect(fx?.filters?.some((f) => f.includes('vibrato'))).toBe(true);
  });

  it('no two audiences share the exact same voice signature (voice_id + postFx)', () => {
    // Four pairs used to share a raw premade voice (George×2, Will×2, Eric×2,
    // Sarah×2) so e.g. the punk show sounded exactly like the wrestling fans.
    const sigs = AUDIENCES.map((a) => {
      const c = VOICE_CAST[a.id]!;
      return `${c.voice_id}|${JSON.stringify(c.postFx ?? null)}`;
    });
    expect(new Set(sigs).size).toBe(AUDIENCES.length);
  });

  it('TTS seeds inherit their cast postFx (the pitch ships into generation)', () => {
    const seed = TTS_SEEDS.find((s) => s.id === 'voice-baby-shower-intro');
    expect(seed?.postFx?.semitones).toBeGreaterThanOrEqual(6);
  });
});

// The old loops came from the SFX endpoint ("annoying beeping on repeat").
// Music must come from the dedicated Music API as real instrumental tracks.
describe('background music — Music API seeds, not SFX-endpoint beeps', () => {
  const MUSIC = SEEDS.filter((s): s is Extract<Seed, { kind: 'music' }> => s.kind === 'music');

  it('both loops exist as music-kind seeds and no sfx-kind music remains', () => {
    expect(MUSIC.map((s) => s.id).sort()).toEqual(['music-boss-loop', 'music-lab-loop']);
    expect(SEEDS.some((s) => s.kind === 'sfx' && s.category === 'music')).toBe(false);
  });

  it('asks for instrumental, loopable, 15-60s tracks', () => {
    for (const m of MUSIC) {
      expect(m.music_length_ms).toBeGreaterThanOrEqual(15_000);
      expect(m.music_length_ms).toBeLessThanOrEqual(60_000);
      expect(m.prompt.toLowerCase()).toContain('instrumental');
      expect(m.prompt.toLowerCase()).toContain('loop');
      expect(m.category).toBe('music');
    }
  });
});

describe('utility SFX (Phase 2)', () => {
  it('includes plate-pluck + drumroll', () => {
    const ids = new Set(SEEDS.map((s) => s.id));
    expect(ids.has('plate-pluck')).toBe(true);
    expect(ids.has('drumroll')).toBe(true);
  });
});

// The launch sound must always be a *fart*. `category` is the single source of
// truth the runtime filters on (pickSampleId) so audience reactions, signatures,
// voice lines, food + boss cues are never substituted for the headline fart.
describe('seed categories (launch picks farts only)', () => {
  const categoryOf = (id: string): string | undefined =>
    (SEEDS.find((s) => s.id === id) as { category?: string } | undefined)?.category;

  it('every seed carries a category', () => {
    for (const s of SEEDS) {
      expect((s as { category?: string }).category).toBeTruthy();
    }
  });

  it('classifies headline farts as "fart" and everything else as its own kind', () => {
    expect(categoryOf('wet-flapper')).toBe('fart');
    expect(categoryOf('thunder-roll')).toBe('fart');
    expect(categoryOf('tiny-toot')).toBe('fart');
    expect(categoryOf('royal-court-applause')).toBe('reaction');
    expect(categoryOf('food-munch')).toBe('food');
    expect(categoryOf('legendary-fanfare')).toBe('event');
    expect(categoryOf('boss-entrance-royal')).toBe('boss');
    expect(categoryOf('drumroll')).toBe('utility');
    expect(categoryOf('sig-royal-court')).toBe('signature');
    expect(categoryOf('voice-royal-court-loved')).toBe('voice');
  });

  it('fart category spans all three duration buckets (short/medium/long)', () => {
    const farts = SEEDS.filter(
      (s): s is Extract<Seed, { kind: 'sfx' }> =>
        s.kind === 'sfx' && (s as { category?: string }).category === 'fart',
    );
    const secs = farts.map((s) => s.duration_seconds);
    expect(secs.some((d) => d <= 0.8)).toBe(true); // short
    expect(secs.some((d) => d > 0.8 && d <= 1.7)).toBe(true); // medium
    expect(secs.some((d) => d > 1.7)).toBe(true); // long
  });
});
