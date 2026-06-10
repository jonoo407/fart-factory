/**
 * Named SFX seeds for the Fart Factory library. Each seed is a single named
 * effect (per AUDIO_CRITIC.md A21 Stalling test — cold listener should be
 * able to name each effect in <1s) plus a mood tag (A28 mood distribution)
 * and a duration bucket (A28 duration distribution).
 *
 * Kid-safety: all prompts/text are STATIC (compile-time constants) — no
 * runtime user input ever flows into the ElevenLabs request. Per
 * docs/PLAN.md §C kid-safety constraint.
 *
 * Schema: discriminated union on `kind`.
 *   - kind: 'sfx' → POST /v1/sound-generation with `prompt` + duration
 *   - kind: 'tts' → POST /v1/text-to-speech/{voice_id} with `text`
 */

import { AUDIENCES } from '../src/state/audience';
import { REACTIONS, INTROS } from '../src/scoring/audience-reactions';

export type Mood =
  | 'comedic'
  | 'triumphant'
  | 'embarrassed'
  | 'sneaky'
  | 'surprised'
  | 'exhausted'
  | 'enthralled'
  | 'eerie'
  | 'voice';

/**
 * What role a sound plays in the game. This is the single source of truth the
 * runtime filters on: the Launch picker (pickSampleId) only ever selects
 * `fart` samples, so audience reactions / signatures / voice lines / food /
 * boss cues are never substituted for the headline fart. The other categories
 * are fired explicitly by event-sfx at their own moments.
 */
export type SfxCategory =
  | 'fart'
  | 'reaction'
  | 'food'
  | 'event'
  | 'boss'
  | 'utility'
  | 'signature'
  | 'voice';

export interface SfxSeed {
  kind: 'sfx';
  id: string;
  name: string;
  prompt: string;
  duration_seconds: number;
  mood: Mood;
  category: SfxCategory;
}

export interface TtsSeed {
  kind: 'tts';
  id: string;
  name: string;
  text: string;
  voice_id: string;
  /** Mood is informational for TTS — stored in manifest, doesn't change the request. */
  mood: Mood;
  category: 'voice';
}

export type Seed = SfxSeed | TtsSeed;

/**
 * Tag a group of SFX specs with a shared category. Keeps `category` attached to
 * the whole group (it can't drift per-line) and keeps the seed literals tidy.
 */
type SfxSpec = Omit<SfxSeed, 'category'>;
function withCat(specs: SfxSpec[], category: SfxCategory): SfxSeed[] {
  return specs.map((s) => ({ ...s, category }));
}

// ====== Phase 1: legacy SFX library (procedural fart cues + reactions) ======
// Headline fart samples — the ONLY group the Launch picker draws from.
const FART_SFX: SfxSeed[] = withCat([
  // --- short pops ---
  { kind: 'sfx', id: 'mouse-squeak',  name: 'Mouse Squeak',     mood: 'sneaky',      duration_seconds: 0.6, prompt: 'tiny squeaky mouse-like fart, brief high-pitched cartoon raspberry, comedic' },
  { kind: 'sfx', id: 'champagne-pop', name: 'Champagne Pop',    mood: 'surprised',   duration_seconds: 0.6, prompt: 'a brief sharp pop like a small champagne cork, bright high-frequency burst' },
  { kind: 'sfx', id: 'tiny-toot',     name: 'Tiny Toot',        mood: 'embarrassed', duration_seconds: 0.5, prompt: 'a tiny embarrassed toot, soft breathy short raspberry, polite' },

  // --- medium farts ---
  { kind: 'sfx', id: 'wet-flapper',   name: 'Wet Flapper',      mood: 'comedic',     duration_seconds: 1.2, prompt: 'a wet juicy raspberry fart, cartoonish, with sputter, comedic' },
  { kind: 'sfx', id: 'dry-trumpet',   name: 'Dry Trumpet',      mood: 'triumphant',  duration_seconds: 1.4, prompt: 'a dry brassy trumpet-like fart, like a tuba, melodic, comedic' },
  { kind: 'sfx', id: 'kazoo-honk',    name: 'Kazoo Honk',       mood: 'comedic',     duration_seconds: 1.1, prompt: 'a kazoo honk-like fart, buzzing comedic raspberry, mid-pitch' },
  { kind: 'sfx', id: 'duck-quack',    name: 'Duck Quack',       mood: 'surprised',   duration_seconds: 1.0, prompt: 'a duck quack-like fart, comedic raspberry with quacking texture' },
  { kind: 'sfx', id: 'sad-trombone',  name: 'Sad Trombone',     mood: 'embarrassed', duration_seconds: 1.5, prompt: 'a sad descending trombone fart, womp-womp comedic disappointment' },

  // --- long sustained ---
  { kind: 'sfx', id: 'thunder-roll',  name: 'Thunder Roll',     mood: 'triumphant',  duration_seconds: 2.4, prompt: 'a long deep thunder-like rolling fart, low rumble, cartoon, sustained' },
  { kind: 'sfx', id: 'never-ending',  name: 'Never Ending',     mood: 'exhausted',   duration_seconds: 2.8, prompt: 'a long exhausted never-ending raspberry fart, slowly running out of breath, comedic' },
  { kind: 'sfx', id: 'machine-gun',   name: 'Machine Gun',      mood: 'comedic',     duration_seconds: 2.0, prompt: 'a rapid machine-gun staccato burst of short cartoon farts, comedic' },
  { kind: 'sfx', id: 'volcano',       name: 'Volcano',          mood: 'triumphant',  duration_seconds: 2.6, prompt: 'a hot rumbling volcanic fart with bubbling and pressure release, comedic' },

  // --- specialty ---
  { kind: 'sfx', id: 'silent-killer', name: 'Silent Killer',    mood: 'sneaky',      duration_seconds: 0.8, prompt: 'a soft barely-audible whoosh of a silent fart, sneaky cartoon stealth' },
  { kind: 'sfx', id: 'symphony',      name: 'Symphony',         mood: 'triumphant',  duration_seconds: 1.8, prompt: 'a melodic harmonized cartoon fart that sounds almost musical, with rising arpeggio, comedic' },

], 'fart');

// ====== Phase K audience-reaction seeds (item 61) ======
const REACTION_SFX: SfxSeed[] = withCat([
  { kind: 'sfx', id: 'granny-cackle',         name: "Granny's Cackle",        mood: 'comedic',    duration_seconds: 1.8, prompt: 'an elderly grandmother gentle cackling laugh, warm and surprised, family-friendly cartoon style' },
  { kind: 'sfx', id: 'royal-court-applause',  name: 'Royal Court Applause',   mood: 'enthralled', duration_seconds: 2.4, prompt: 'a dignified royal-court polite applause, refined hand-clapping with brief approving murmur, family-friendly' },
  { kind: 'sfx', id: 'frat-howl',             name: 'Frat House Howl',        mood: 'triumphant', duration_seconds: 1.6, prompt: 'a small group of college friends cheering and hollering enthusiastically, comedic celebration, family-friendly tone' },
  { kind: 'sfx', id: 'alien-tourists-gasp',   name: 'Alien Tourists Gasp',    mood: 'surprised',  duration_seconds: 1.4, prompt: 'small group of cartoon aliens emitting an astonished collective gasp followed by curious chirps, family-friendly' },
  { kind: 'sfx', id: 'toddler-giggle',        name: 'Toddler Giggle',         mood: 'comedic',    duration_seconds: 1.5, prompt: 'a small toddler giggling and laughing with delight, gentle and warm, family-friendly' },

  // --- flop variants (failed launch) ---
  // Deliberately SHORT and soft: the fart is the showcase, the crowd reaction
  // is a quick punchline after it — never a 2s wail talking over it.
  { kind: 'sfx', id: 'flop-groan',         name: 'Crowd Groan',         mood: 'embarrassed', duration_seconds: 1.0, prompt: 'a small crowd letting out one short disappointed aww groan, brief comedic letdown, family-friendly' },
  { kind: 'sfx', id: 'flop-boo',           name: 'Playful Boo',         mood: 'embarrassed', duration_seconds: 1.0, prompt: 'a small crowd giving one brief playful pantomime boo, lighthearted and gentle, family-friendly' },
  { kind: 'sfx', id: 'flop-crickets',      name: 'Awkward Crickets',    mood: 'sneaky',      duration_seconds: 1.4, prompt: 'awkward silence with two soft cricket chirps, comedic empty-room beat, family-friendly' },
  { kind: 'sfx', id: 'flop-whistle-down',  name: 'Slide Whistle Down',  mood: 'embarrassed', duration_seconds: 0.8, prompt: 'a single quick descending slide whistle womp, brief cartoon failure sting, family-friendly' },

  // --- meh variants (sound overhaul) ---
  // The 50-69% shrug. Quieter and shorter than the flops: an audible "we're
  // unmoved" beat, not a punishment. Played at MEH_STINGER_VOLUME (3).
  { kind: 'sfx', id: 'meh-cough',   name: 'Polite Cough',     mood: 'embarrassed', duration_seconds: 0.8, prompt: 'one single polite quiet cough in a silent room, small awkward beat, family-friendly' },
  { kind: 'sfx', id: 'meh-shuffle', name: 'Awkward Shuffle',  mood: 'embarrassed', duration_seconds: 1.0, prompt: 'a small audience shifting in creaky seats with a faint unimpressed hmm, brief awkward pause, family-friendly' },

], 'reaction');

// ====== Phase K food-eating seeds (item 62) ======
const FOOD_SFX: SfxSeed[] = withCat([
  { kind: 'sfx', id: 'food-munch',  name: 'Food Munch',   mood: 'comedic',  duration_seconds: 0.6, prompt: 'a quick comedic cartoon chewing crunch, brief munching foley, family-friendly' },
  { kind: 'sfx', id: 'food-crunch', name: 'Food Crunch',  mood: 'comedic',  duration_seconds: 0.5, prompt: 'a sharp crispy food crunch like biting an apple, comedic foley, brief' },
  { kind: 'sfx', id: 'food-slurp',  name: 'Food Slurp',   mood: 'comedic',  duration_seconds: 0.7, prompt: 'a wet cartoon slurp like noodles, quick foley, comedic' },
  { kind: 'sfx', id: 'food-gulp',   name: 'Food Gulp',    mood: 'comedic',  duration_seconds: 0.5, prompt: 'a comedic cartoon swallowing gulp, brief foley, family-friendly' },

], 'food');

// ====== Phase K legendary fanfare seeds (item 63) ======
const EVENT_SFX: SfxSeed[] = withCat([
  { kind: 'sfx', id: 'legendary-fanfare', name: 'Legendary Fanfare', mood: 'enthralled', duration_seconds: 2.6, prompt: 'a short triumphant brass fanfare with bright glittery chimes, victorious cartoon, family-friendly' },
  { kind: 'sfx', id: 'quest-claimed',     name: 'Quest Claimed',     mood: 'triumphant', duration_seconds: 1.8, prompt: 'a magical sparkly chime ascending arpeggio with subtle bell shimmer, achievement-unlocked feel, family-friendly' },

  // --- economy + milestone cues (sound overhaul) ---
  { kind: 'sfx', id: 'coin-clink',    name: 'Coin Clink',     mood: 'triumphant', duration_seconds: 0.6, prompt: 'two or three small gold coins dropping into a pouch with a bright clink, brief, family-friendly cartoon foley' },
  { kind: 'sfx', id: 'shop-purchase', name: 'Shop Purchase',  mood: 'triumphant', duration_seconds: 0.9, prompt: 'an old-fashioned cash register ka-ching with a small coin jingle, quick satisfying purchase sound, family-friendly' },
  { kind: 'sfx', id: 'streak-5',      name: 'Streak ×5',      mood: 'enthralled', duration_seconds: 1.4, prompt: 'a small crowd rising oooh into a short cheer with one bright chime, building excitement, family-friendly' },
  { kind: 'sfx', id: 'streak-10',     name: 'Streak ×10',     mood: 'enthralled', duration_seconds: 2.0, prompt: 'a big crowd eruption with a firework pop and glittering chime cascade, legendary celebration, family-friendly' },

], 'event');

// ====== PLAN_v5 P8 boss entrance seeds (5 themed cues) ======
const BOSS_SFX: SfxSeed[] = withCat([
  { kind: 'sfx', id: 'boss-entrance-granny',   name: 'Granny Entrance',   mood: 'comedic',     duration_seconds: 2.0, prompt: 'a warm cozy kazoo + accordion flourish, grandmotherly arrival, family-friendly cartoon' },
  { kind: 'sfx', id: 'boss-entrance-royal',    name: 'Royal Entrance',    mood: 'enthralled',  duration_seconds: 2.4, prompt: 'a regal short brass fanfare with trumpets and timpani, royal court arrival, family-friendly' },
  { kind: 'sfx', id: 'boss-entrance-haunted',  name: 'Haunted Entrance',  mood: 'eerie',       duration_seconds: 2.2, prompt: 'a low spooky cartoon organ chord with subtle ghost whoosh, haunted mansion door creak, family-friendly Halloween' },
  { kind: 'sfx', id: 'boss-entrance-volcano',  name: 'Volcano Entrance',  mood: 'triumphant',  duration_seconds: 2.4, prompt: 'a deep rumbling timpani roll with sharp metallic clang, volcanic ritual gong, family-friendly' },
  { kind: 'sfx', id: 'boss-entrance-cosmic',   name: 'Cosmic Entrance',   mood: 'surprised',   duration_seconds: 2.6, prompt: 'an otherworldly synth pad rising sweep with bell shimmer, alien council gathering, family-friendly sci-fi' },
], 'boss');

// ====== Phase 2 (new): utility SFX for interaction polish ======
const UTILITY_SFX: SfxSeed[] = withCat([
  { kind: 'sfx', id: 'plate-pluck', name: 'Plate Pluck', mood: 'comedic',     duration_seconds: 0.6, prompt: 'a soft cartoon mouth pop or finger pluck, brief light comedic foley, family-friendly' },
  { kind: 'sfx', id: 'drumroll',    name: 'Drum Roll',   mood: 'triumphant',  duration_seconds: 1.6, prompt: 'a brief snare drum roll building into a soft crescendo, theatrical anticipation, family-friendly' },
], 'utility');

// ====== Phase 3 (new): per-audience signature SFX (20) ======
//
// Short (1-2s) ambient cue that says "this audience just walked in." Played
// when the audience-of-the-day rotates AND when the player taps the
// audience portrait. Each is concretely audible — not silence, not a vague
// drone. Family-friendly.
const AUDIENCE_SIGNATURES: SfxSeed[] = withCat([
  { kind: 'sfx', id: 'sig-granny-edna',      name: 'Signature: Granny Edna',       mood: 'comedic',    duration_seconds: 1.6, prompt: 'cozy knitting needle clicks with a faint warm grandmother chuckle, gentle and inviting, family-friendly cartoon foley' },
  { kind: 'sfx', id: 'sig-royal-court',      name: 'Signature: Royal Court',       mood: 'enthralled', duration_seconds: 1.6, prompt: 'a brief regal trumpet flourish announcing court arrival, two short fanfare notes, family-friendly' },
  { kind: 'sfx', id: 'sig-frat-bros',        name: 'Signature: Frat Bros',         mood: 'triumphant', duration_seconds: 1.6, prompt: 'a small group of frat bros whooping with brief party cheer and a cup tap, family-friendly tone' },
  { kind: 'sfx', id: 'sig-haunted-mansion',  name: 'Signature: Haunted Mansion',   mood: 'eerie',      duration_seconds: 1.6, prompt: 'a slow creaking wooden door with a faint spooky cartoon woooo, gentle Halloween, family-friendly' },
  { kind: 'sfx', id: 'sig-alien-tourists',   name: 'Signature: Alien Tourists',    mood: 'surprised',  duration_seconds: 1.6, prompt: 'a UFO landing whoosh with bright synth chirps and curious alien beeps, family-friendly sci-fi cartoon' },
  { kind: 'sfx', id: 'sig-toddler-bday',     name: 'Signature: Toddler Birthday',  mood: 'comedic',    duration_seconds: 1.6, prompt: 'a toy party-blower kazoo with toddler giggles and a tiny clap, joyful, family-friendly' },
  { kind: 'sfx', id: 'sig-goth-teens',       name: 'Signature: Goth Teens',        mood: 'embarrassed',duration_seconds: 1.6, prompt: 'a single dark synth pad chord with a teen sigh, moody but family-friendly cartoon' },
  { kind: 'sfx', id: 'sig-kindergarten',     name: 'Signature: Kindergarten',      mood: 'comedic',    duration_seconds: 1.6, prompt: 'a small group of kindergartners shouting yay with a recess bell ring, family-friendly' },
  { kind: 'sfx', id: 'sig-skunk-society',    name: 'Signature: Skunk Society',     mood: 'sneaky',     duration_seconds: 1.6, prompt: 'a soft sniffing sound followed by a brief approving murmur from a small animal-society gathering, family-friendly' },
  { kind: 'sfx', id: 'sig-opera-house',      name: 'Signature: Opera House',       mood: 'enthralled', duration_seconds: 1.6, prompt: 'an operatic soprano warm-up trill on a single note with concert-hall reverb, family-friendly' },
  { kind: 'sfx', id: 'sig-wrestling-fans',   name: 'Signature: Wrestling Fans',    mood: 'triumphant', duration_seconds: 1.6, prompt: 'a big stadium crowd cheer with a brief ring-bell ding, sports broadcaster energy, family-friendly' },
  { kind: 'sfx', id: 'sig-librarians',       name: 'Signature: Librarians',        mood: 'sneaky',     duration_seconds: 1.6, prompt: 'a single sharp shush followed by the soft rustle of turning paper pages, family-friendly' },
  { kind: 'sfx', id: 'sig-volcano-cult',     name: 'Signature: Volcano Cult',      mood: 'eerie',      duration_seconds: 1.6, prompt: 'a low ritual gong followed by distant low chanting, family-friendly cartoon mystic tone' },
  { kind: 'sfx', id: 'sig-pet-rescue',       name: 'Signature: Pet Rescue',        mood: 'comedic',    duration_seconds: 1.6, prompt: 'a friendly dog bark with a soft cat meow and gentle paws-on-floor patter, warm and family-friendly' },
  { kind: 'sfx', id: 'sig-astronauts',       name: 'Signature: Astronauts',        mood: 'surprised',  duration_seconds: 1.6, prompt: 'a brief radio static crackle with mission-control beep, cold sterile sci-fi, family-friendly' },
  { kind: 'sfx', id: 'sig-food-critics',     name: 'Signature: Food Critics',      mood: 'embarrassed',duration_seconds: 1.6, prompt: 'a delicate silver spoon tapping a porcelain teacup followed by a polite refined cough, family-friendly' },
  { kind: 'sfx', id: 'sig-baby-shower',      name: 'Signature: Baby Shower',       mood: 'comedic',    duration_seconds: 1.6, prompt: 'a gentle rattle shake and a soft baby coo with paper-wrap rustle, warm, family-friendly' },
  { kind: 'sfx', id: 'sig-punk-show',        name: 'Signature: Punk Show',         mood: 'triumphant', duration_seconds: 1.6, prompt: 'a brief power-chord guitar riff with a crash cymbal hit, punk-rock energy, family-friendly cartoon' },
  { kind: 'sfx', id: 'sig-silent-monks',     name: 'Signature: Silent Monks',      mood: 'enthralled', duration_seconds: 1.6, prompt: 'a single soft meditation bowl ringing slowly fading, contemplative, family-friendly' },
  { kind: 'sfx', id: 'sig-mystery-guest',    name: 'Signature: Mystery Guest',     mood: 'eerie',      duration_seconds: 1.6, prompt: 'a low mysterious synth swell with a distant indistinct whisper, family-friendly intrigue' },
], 'signature');

// ====== Phase 4 (new): TTS voice lines (40 — loved + evacuated × 20) ======
//
// Voice-cast mapping per audience. Voice IDs are from ElevenLabs' shared
// voice library — stable string identifiers. Text is pulled VERBATIM from
// REACTIONS in src/scoring/audience-reactions.ts so there's exactly one
// source of truth for what the audience says.

interface VoiceCast {
  voice_id: string;
  /** Optional human-readable label for the voice (informational only). */
  voiceLabel: string;
}

const VOICE_CAST: Record<string, VoiceCast> = {
  'granny-edna':      { voice_id: '9BWtsMINqrJLrRacOk9x', voiceLabel: 'Aria — warm older woman' },
  'royal-court':      { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', voiceLabel: 'Alice — formal Brit' },
  'frat-bros':        { voice_id: 'IKne3meq5aSn9XLyUdCD', voiceLabel: 'Charlie — hyped male' },
  'haunted-mansion':  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', voiceLabel: 'George — deep slow' },
  'alien-tourists':   { voice_id: 'XB0fDUnXU5powFXDhCwa', voiceLabel: 'Charlotte — airy' },
  'toddler-bday':     { voice_id: 'XrExE9yKIg1WjnnlVkGX', voiceLabel: 'Matilda — bright' },
  'goth-teens':       { voice_id: 'cgSgspJ2msm6clMCkdW9', voiceLabel: 'Jessica — flat teen' },
  'kindergarten':     { voice_id: 'pFZP5JQG7iQjIQuC4Bku', voiceLabel: 'Lily — youthful' },
  'skunk-society':    { voice_id: 'nPczCjzI2devNBz1zQrb', voiceLabel: 'Brian — gravelly' },
  'opera-house':      { voice_id: 'EXAVITQu4vr4xnSDxMaL', voiceLabel: 'Sarah — operatic' },
  'wrestling-fans':   { voice_id: 'bIHbv24MWmeRgasZH58o', voiceLabel: 'Will — broadcaster' },
  'librarians':       { voice_id: 'cjVigY5qzO86Huf0OWal', voiceLabel: 'Eric — soft formal' },
  'volcano-cult':     { voice_id: 'iP95p4xoKVk53GoZ742B', voiceLabel: 'Chris — chant low' },
  'pet-rescue':       { voice_id: 'FGY2WhTYpPnrIDTdsKH5', voiceLabel: 'Laura — warm' },
  'astronauts':       { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', voiceLabel: 'Roger — confident' },
  'food-critics':     { voice_id: 'SAz9YHcvj6GT2YYXdXww', voiceLabel: 'River — snooty' },
  'baby-shower':      { voice_id: 'EXAVITQu4vr4xnSDxMaL', voiceLabel: 'Sarah — motherly' },
  'punk-show':        { voice_id: 'bIHbv24MWmeRgasZH58o', voiceLabel: 'Will — shouty' },
  'silent-monks':     { voice_id: 'cjVigY5qzO86Huf0OWal', voiceLabel: 'Eric — whisper' },
  'mystery-guest':    { voice_id: 'JBFqnCBsd6RMkjVDRZzb', voiceLabel: 'George — mysterious' },
};

// 'intro' (sound overhaul): the audience greets the player as it walks in —
// text from INTROS, same voice as the reaction lines so the character holds.
const VOICE_TIERS = ['loved', 'evacuated', 'intro'] as const;
type VoiceTier = (typeof VOICE_TIERS)[number];

export function voiceSeedId(audienceId: string, tier: VoiceTier): string {
  return `voice-${audienceId}-${tier}`;
}

function buildVoiceSeeds(): TtsSeed[] {
  const out: TtsSeed[] = [];
  for (const aud of AUDIENCES) {
    const cast = VOICE_CAST[aud.id];
    if (!cast) continue;
    const reactions = REACTIONS[aud.id];
    if (!reactions) continue;
    for (const tier of VOICE_TIERS) {
      const text = tier === 'intro' ? INTROS[aud.id] : reactions[tier];
      if (!text) continue;
      out.push({
        kind: 'tts',
        id: voiceSeedId(aud.id, tier),
        name: `Voice: ${aud.name} — ${tier}`,
        text,
        voice_id: cast.voice_id,
        mood: 'voice',
        category: 'voice',
      });
    }
  }
  return out;
}

const VOICE_SEEDS = buildVoiceSeeds();

export const SEEDS: readonly Seed[] = [
  ...FART_SFX,
  ...REACTION_SFX,
  ...FOOD_SFX,
  ...EVENT_SFX,
  ...BOSS_SFX,
  ...UTILITY_SFX,
  ...AUDIENCE_SIGNATURES,
  ...VOICE_SEEDS,
];

// Export the voice cast so the runtime can look up which voice an audience
// uses (e.g. for debug overlays); also lets tests assert per-audience coverage.
export { VOICE_CAST, VOICE_TIERS };
export type { VoiceTier };
