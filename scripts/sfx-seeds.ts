/**
 * Named SFX seeds for the Fart Factory library. Each seed is a single named
 * effect (per AUDIO_CRITIC.md A21 Stalling test — cold listener should be
 * able to name each effect in <1s) plus a mood tag (A28 mood distribution)
 * and a duration bucket (A28 duration distribution).
 *
 * Kid-safety: all prompts are static — no runtime user input ever flows
 * into the ElevenLabs request. Per docs/PLAN.md §C kid-safety constraint.
 */

export type Mood =
  | 'comedic'
  | 'triumphant'
  | 'embarrassed'
  | 'sneaky'
  | 'surprised'
  | 'exhausted'
  | 'enthralled' // Phase K: applause, fanfare, legendary cues
  | 'eerie';     // Phase K: haunted-mansion moans, alien gasps

export interface Seed {
  id: string;
  name: string;
  prompt: string;
  duration_seconds: number;
  mood: Mood;
}

// 14 seeds covering all 3 duration buckets (short ≤0.5s, medium 0.5-1.5s,
// long >1.5s) and ≥4 distinct moods. Library Richness gate (A28) requires
// ≥3 mood affects + ≥2 duration buckets — this clears with margin.
export const SEEDS: readonly Seed[] = [
  // --- short pops ---
  { id: 'mouse-squeak',  name: 'Mouse Squeak',     mood: 'sneaky',      duration_seconds: 0.6, prompt: 'tiny squeaky mouse-like fart, brief high-pitched cartoon raspberry, comedic' },
  { id: 'champagne-pop', name: 'Champagne Pop',    mood: 'surprised',   duration_seconds: 0.6, prompt: 'a brief sharp pop like a small champagne cork, bright high-frequency burst' },
  { id: 'tiny-toot',     name: 'Tiny Toot',        mood: 'embarrassed', duration_seconds: 0.5, prompt: 'a tiny embarrassed toot, soft breathy short raspberry, polite' },

  // --- medium farts ---
  { id: 'wet-flapper',   name: 'Wet Flapper',      mood: 'comedic',     duration_seconds: 1.2, prompt: 'a wet juicy raspberry fart, cartoonish, with sputter, comedic' },
  { id: 'dry-trumpet',   name: 'Dry Trumpet',      mood: 'triumphant',  duration_seconds: 1.4, prompt: 'a dry brassy trumpet-like fart, like a tuba, melodic, comedic' },
  { id: 'kazoo-honk',    name: 'Kazoo Honk',       mood: 'comedic',     duration_seconds: 1.1, prompt: 'a kazoo honk-like fart, buzzing comedic raspberry, mid-pitch' },
  { id: 'duck-quack',    name: 'Duck Quack',       mood: 'surprised',   duration_seconds: 1.0, prompt: 'a duck quack-like fart, comedic raspberry with quacking texture' },
  { id: 'sad-trombone',  name: 'Sad Trombone',     mood: 'embarrassed', duration_seconds: 1.5, prompt: 'a sad descending trombone fart, womp-womp comedic disappointment' },

  // --- long sustained ---
  { id: 'thunder-roll',  name: 'Thunder Roll',     mood: 'triumphant',  duration_seconds: 2.4, prompt: 'a long deep thunder-like rolling fart, low rumble, cartoon, sustained' },
  { id: 'never-ending',  name: 'Never Ending',     mood: 'exhausted',   duration_seconds: 2.8, prompt: 'a long exhausted never-ending raspberry fart, slowly running out of breath, comedic' },
  { id: 'machine-gun',   name: 'Machine Gun',      mood: 'comedic',     duration_seconds: 2.0, prompt: 'a rapid machine-gun staccato burst of short cartoon farts, comedic' },
  { id: 'volcano',       name: 'Volcano',          mood: 'triumphant',  duration_seconds: 2.6, prompt: 'a hot rumbling volcanic fart with bubbling and pressure release, comedic' },

  // --- specialty ---
  { id: 'silent-killer', name: 'Silent Killer',    mood: 'sneaky',      duration_seconds: 0.8, prompt: 'a soft barely-audible whoosh of a silent fart, sneaky cartoon stealth' },
  { id: 'symphony',      name: 'Symphony',         mood: 'triumphant',  duration_seconds: 1.8, prompt: 'a melodic harmonized cartoon fart that sounds almost musical, with rising arpeggio, comedic' },

  // ====== Phase K audience-reaction seeds (item 61) ======
  { id: 'granny-cackle',         name: "Granny's Cackle",        mood: 'comedic',    duration_seconds: 1.8, prompt: 'an elderly grandmother gentle cackling laugh, warm and surprised, family-friendly cartoon style' },
  { id: 'royal-court-applause',  name: 'Royal Court Applause',   mood: 'enthralled', duration_seconds: 2.4, prompt: 'a dignified royal-court polite applause, refined hand-clapping with brief approving murmur, family-friendly' },
  { id: 'frat-howl',             name: 'Frat House Howl',        mood: 'triumphant', duration_seconds: 1.6, prompt: 'a small group of college friends cheering and hollering enthusiastically, comedic celebration, family-friendly tone' },
  { id: 'haunted-mansion-moan',  name: 'Haunted Mansion Moan',   mood: 'eerie',      duration_seconds: 2.0, prompt: 'a low spooky cartoon ghostly moan and woooo, kid-friendly Halloween, gentle eerie' },
  { id: 'alien-tourists-gasp',   name: 'Alien Tourists Gasp',    mood: 'surprised',  duration_seconds: 1.4, prompt: 'small group of cartoon aliens emitting an astonished collective gasp followed by curious chirps, family-friendly' },
  { id: 'toddler-giggle',        name: 'Toddler Giggle',         mood: 'comedic',    duration_seconds: 1.5, prompt: 'a small toddler giggling and laughing with delight, gentle and warm, family-friendly' },

  // ====== Phase K food-eating seeds (item 62) ======
  { id: 'food-munch',  name: 'Food Munch',   mood: 'comedic',  duration_seconds: 0.6, prompt: 'a quick comedic cartoon chewing crunch, brief munching foley, family-friendly' },
  { id: 'food-crunch', name: 'Food Crunch',  mood: 'comedic',  duration_seconds: 0.5, prompt: 'a sharp crispy food crunch like biting an apple, comedic foley, brief' },
  { id: 'food-slurp',  name: 'Food Slurp',   mood: 'comedic',  duration_seconds: 0.7, prompt: 'a wet cartoon slurp like noodles, quick foley, comedic' },
  { id: 'food-gulp',   name: 'Food Gulp',    mood: 'comedic',  duration_seconds: 0.5, prompt: 'a comedic cartoon swallowing gulp, brief foley, family-friendly' },

  // ====== Phase K legendary fanfare seeds (item 63) ======
  { id: 'legendary-fanfare', name: 'Legendary Fanfare', mood: 'enthralled', duration_seconds: 2.6, prompt: 'a short triumphant brass fanfare with bright glittery chimes, victorious cartoon, family-friendly' },
  { id: 'quest-claimed',     name: 'Quest Claimed',     mood: 'triumphant', duration_seconds: 1.8, prompt: 'a magical sparkly chime ascending arpeggio with subtle bell shimmer, achievement-unlocked feel, family-friendly' },

  // ====== PLAN_v5 P8 boss entrance seeds (5 themed cues) ======
  { id: 'boss-entrance-granny',   name: 'Granny Entrance',   mood: 'comedic',     duration_seconds: 2.0, prompt: 'a warm cozy kazoo + accordion flourish, grandmotherly arrival, family-friendly cartoon' },
  { id: 'boss-entrance-royal',    name: 'Royal Entrance',    mood: 'enthralled',  duration_seconds: 2.4, prompt: 'a regal short brass fanfare with trumpets and timpani, royal court arrival, family-friendly' },
  { id: 'boss-entrance-haunted',  name: 'Haunted Entrance',  mood: 'eerie',       duration_seconds: 2.2, prompt: 'a low spooky cartoon organ chord with subtle ghost whoosh, haunted mansion door creak, family-friendly Halloween' },
  { id: 'boss-entrance-volcano',  name: 'Volcano Entrance',  mood: 'triumphant',  duration_seconds: 2.4, prompt: 'a deep rumbling timpani roll with sharp metallic clang, volcanic ritual gong, family-friendly' },
  { id: 'boss-entrance-cosmic',   name: 'Cosmic Entrance',   mood: 'surprised',   duration_seconds: 2.6, prompt: 'an otherworldly synth pad rising sweep with bell shimmer, alien council gathering, family-friendly sci-fi' },
];
