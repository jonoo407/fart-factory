/**
 * Per-audience reaction flavor text. Per PLAN_v5.md P10.
 *
 * Each of the 20 audiences gets a unique reaction line per tier so the
 * Personality / Charm v5 axis lifts above generic ("The audience LOVES
 * it!"). Reactions name the audience, use their voice, and stay
 * kid-safe.
 */

import type { Audience } from '../state/audience';

type Tier = 'loved' | 'liked' | 'meh' | 'disliked' | 'evacuated';

export interface AudienceReaction {
  tier: Tier;
  trend: 'warmer' | 'colder' | 'first' | 'same';
}

export function audienceReaction(matchPct: number, priorMatchPct: number | null): AudienceReaction {
  let tier: Tier;
  if (matchPct >= 90) tier = 'loved';
  else if (matchPct >= 70) tier = 'liked';
  else if (matchPct >= 50) tier = 'meh';
  else if (matchPct >= 30) tier = 'disliked';
  else tier = 'evacuated';
  let trend: AudienceReaction['trend'];
  if (priorMatchPct === null) trend = 'first';
  else if (matchPct > priorMatchPct) trend = 'warmer';
  else if (matchPct < priorMatchPct) trend = 'colder';
  else trend = 'same';
  return { tier, trend };
}

const REACTIONS: Record<string, Record<Tier, string>> = {
  'granny-edna': {
    loved:     'Granny Edna chuckles warmly. "Oh dear, that takes me back."',
    liked:     'Granny Edna smiles politely. "How nice."',
    meh:       'Granny Edna pats your hand. "Bless your heart."',
    disliked:  'Granny Edna frowns. "Well I never!"',
    evacuated: 'Granny Edna marches out muttering about manners.',
  },
  'royal-court': {
    loved:     'The Royal Court erupts in dignified applause. A knighthood is whispered of.',
    liked:     'The Royal Court nods approvingly. "Acceptable."',
    meh:       'The Royal Court murmurs uncertainly behind silk fans.',
    disliked:  'The Royal Court averts their gaze in horror.',
    evacuated: 'The Royal Court flees the hall, demanding the architect.',
  },
  'frat-bros': {
    loved:     "THE FRAT BROS HOLLER. BEER GETS SPILLED. SOMEONE YELLS 'LEGEND!'",
    liked:     'The Frat Bros high-five each other. "Bro, decent."',
    meh:       'The Frat Bros shrug. "Eh, I mean, sure."',
    disliked:  'The Frat Bros boo. "Come on, dude!"',
    evacuated: 'The Frat Bros stagger to the parking lot, swearing off you forever.',
  },
  'haunted-mansion': {
    loved:     'Spectral wails of approval echo through the halls.',
    liked:     'A ghost gives a slow, dripping nod.',
    meh:       'The ghosts shrug in unison.',
    disliked:  'The chandeliers shake with disapproval.',
    evacuated: 'Even the ghosts pack up and haunt elsewhere.',
  },
  'alien-tourists': {
    loved:     'The Alien Tourists emit synchronized chirps of delight.',
    liked:     'The Alien Tourists blink approvingly.',
    meh:       'The Alien Tourists tilt their heads, confused.',
    disliked:  'The Alien Tourists make a low warbling sound.',
    evacuated: 'The Alien Tourists beam back to their ship.',
  },
  'toddler-bday': {
    loved:     'The toddlers SHRIEK with laughter and demand cake.',
    liked:     'The toddlers giggle, mostly.',
    meh:       'The toddlers continue eating frosting.',
    disliked:  'A toddler cries. Then they all cry.',
    evacuated: 'Parents whisk their toddlers away, glaring at you.',
  },
  'goth-teens': {
    loved:     'The Goth Teens nod slowly, almost smiling. "Sick."',
    liked:     'The Goth Teens approve, in their joyless way.',
    meh:       'The Goth Teens were already disappointed in life.',
    disliked:  'The Goth Teens roll their eyes harder than humanly possible.',
    evacuated: 'The Goth Teens vanish into the shadows, more disappointed than ever.',
  },
  'kindergarten': {
    loved:     'The kindergartners erupt in giggles. A spontaneous dance breaks out.',
    liked:     'The kindergartners laugh and point.',
    meh:       'The kindergartners are mildly distracted.',
    disliked:  'A kindergartner says "ewww" loudly.',
    evacuated: 'The teacher leads the kindergartners away muttering.',
  },
  'skunk-society': {
    loved:     'The Skunk Society spritzes appreciation in your direction.',
    liked:     'The Skunk Society nods knowingly.',
    meh:       'The Skunk Society is unimpressed but tolerant.',
    disliked:  'The Skunk Society wrinkles their noses. From a SKUNK.',
    evacuated: 'The Skunk Society leaves AND ASKS FOR A RAINCHECK.',
  },
  'opera-house': {
    loved:     'The Opera House gives a standing ovation. Tears glisten.',
    liked:     'The Opera House applauds politely. Recital-quality.',
    meh:       'The Opera House remains seated, fanning themselves.',
    disliked:  'The Opera House mutters about cancelling their season tickets.',
    evacuated: 'The Opera House files out, demanding a refund and a duel.',
  },
  'wrestling-fans': {
    loved:     "THE WRESTLING FANS GO ABSOLUTELY UNHINGED. CHANTS START.",
    liked:     'The Wrestling Fans cheer. "DECENT, DECENT, DECENT!"',
    meh:       'The Wrestling Fans hold up signs saying "BORING."',
    disliked:  'The Wrestling Fans throw popcorn.',
    evacuated: 'The Wrestling Fans riot. They were going to anyway.',
  },
  'librarians': {
    loved:     'The Librarians give the rarest of compliments: a quiet "well done."',
    liked:     'The Librarians nod approvingly. Almost smile.',
    meh:       'The Librarians return to their books.',
    disliked:  'The Librarians shush you violently.',
    evacuated: 'The Librarians file a formal complaint and leave.',
  },
  'volcano-cult': {
    loved:     'The Volcano Cult chants your name. THE MAGMA GOD IS PLEASED.',
    liked:     'The Volcano Cult nods. "Acceptable offering."',
    meh:       'The Volcano Cult is contemplating doctrine.',
    disliked:  'The Volcano Cult mutters about heresy.',
    evacuated: 'The Volcano Cult retreats to the caldera, plotting.',
  },
  'pet-rescue': {
    loved:     'The dogs wag tails. The volunteers smile. Net donations spike.',
    liked:     'The Pet Rescue volunteers approve gently.',
    meh:       'The dogs sniff, unimpressed. The cats are unbothered.',
    disliked:  'A dog whimpers. The volunteers glare.',
    evacuated: 'The pets are removed for their own safety.',
  },
  'astronauts': {
    loved:     'The Astronauts radio back: "ZERO-G OBSERVATION, IMPRESSIVE."',
    liked:     'The Astronauts give a thumbs-up through their helmets.',
    meh:       'The Astronauts are mid-checklist. Unbothered.',
    disliked:  'The Astronauts say "Houston, we have a problem."',
    evacuated: 'The Astronauts initiate emergency cabin recycling.',
  },
  'food-critics': {
    loved:     'The Food Critics write glowing reviews. Three stars confirmed.',
    liked:     'The Food Critics scribble approvingly.',
    meh:       'The Food Critics make tiny notes you cannot read.',
    disliked:  'The Food Critics wrinkle their noses in unison.',
    evacuated: 'The Food Critics storm out, tweeting threads of fury.',
  },
  'baby-shower': {
    loved:     'The Baby Shower goes silent, then erupts in genteel applause.',
    liked:     'The Baby Shower smiles politely.',
    meh:       'The Baby Shower continues opening presents.',
    disliked:  'The Baby Shower exchanges worried glances.',
    evacuated: 'The Baby Shower relocates to "somewhere more peaceful."',
  },
  'punk-show': {
    loved:     'The Punk Show MOSHES. Someone yells "ENCORE!"',
    liked:     'The Punk Show nods aggressively.',
    meh:       'The Punk Show is busy starting other fights.',
    disliked:  'The Punk Show heckles you for selling out.',
    evacuated: 'The Punk Show storms the stage and gets ejected.',
  },
  'silent-monks': {
    loved:     'The Silent Monks meditate more deeply. A subtle nod.',
    liked:     'The Silent Monks blink their approval.',
    meh:       'The Silent Monks were already mid-contemplation.',
    disliked:  'The Silent Monks meditate harder, pointedly.',
    evacuated: 'The Silent Monks silently file out, leaving a trail of regret.',
  },
  'mystery-guest': {
    loved:     'The Mystery Guest gives a knowing smile. You will never know who they were.',
    liked:     'The Mystery Guest nods cryptically.',
    meh:       'The Mystery Guest is reading the room.',
    disliked:  'The Mystery Guest disapproves, in a way that feels personal.',
    evacuated: 'The Mystery Guest vanishes mid-blink.',
  },
};

/**
 * Sound overhaul — per-audience INTRO greeting, spoken (same ElevenLabs voice
 * as the reaction lines) when the audience walks in: on rotation, and on the
 * first gesture after page load. One or two short sentences, in-character,
 * kid-safe, ≤160 chars so the TTS lands as a greeting and not a speech.
 */
const INTROS: Record<string, string> = {
  'granny-edna':      "Oh, hello dearie! Granny Edna's here for the show. Do be gentle with an old lady's nose.",
  'royal-court':      'The Royal Court has arrived. You may begin... when the trumpets finish. Impress us.',
  'frat-bros':        "YOOOO, the bros are HERE! Let's GO, dude! Show us something LEGENDARY!",
  'haunted-mansion':  'Woooooo... the mansion stirs... entertain ussss, or join usssss...',
  'alien-tourists':   'Greetings, Earth specialist. We traveled forty light-years for your famous gas. Begin the demonstration.',
  'toddler-bday':     "It's my BIRTHDAY! Do the funny noise! DO THE FUNNY NOISE!",
  'goth-teens':       "Ugh. We're here, I guess. Whatever. Try not to be boring like everything else.",
  'kindergarten':     "Hi mister fart scientist! We promise we won't laugh. Okay, we'll laugh a LOT.",
  'skunk-society':    'The Skunk Society convenes. We are connoisseurs of fine aromas. Impress our professional noses.',
  'opera-house':      'Ahh, the Opera House awaits. We expect range. We expect drama. We expect... perfection, darling.',
  'wrestling-fans':   'LADIES AND GENTLEMEN... welcome to the MAIN EVENT! Bring! The! THUNDER!',
  'librarians':       'Shhh. The library is now in session. Quietly impress us... if you can.',
  'volcano-cult':     'The Volcano Cult gathers, o gassy one. The Magma God hungers for a worthy offering.',
  'pet-rescue':       'Welcome to the rescue shelter! The puppies are SO excited. Nothing too scary, please!',
  'astronauts':       'Mission control, we are go for launch. Repeat: we are GO for launch.',
  'food-critics':     'We are the Food Critics. We have tasted everything. Surprise us... if you dare.',
  'baby-shower':      "Welcome to the baby shower! Keep it cute, keep it classy, and mind the gift table.",
  'punk-show':        "OI! You're on! This crowd waits for NOBODY, so make it LOUD!",
  'silent-monks':     'The monks have taken their seats. We shall judge... in complete silence.',
  'mystery-guest':    'Someone has arrived. Who? That is the mystery. Proceed... carefully.',
};

const FALLBACK_TIERS: Record<Tier, string> = {
  loved:     '😍 The audience LOVES it!',
  liked:     '🙂 They liked that.',
  meh:       '😐 Mixed reactions.',
  disliked:  '🤢 Several covered their nose.',
  evacuated: '💀 The room is clearing out.',
};

// Exported for the SFX-seed generator so it can fetch the exact lines
// to voice (single source of truth — never re-typed in seeds).
export { REACTIONS, INTROS };
export type { Tier };

export function reactionTextForAudience(aud: Audience, tier: Tier): string {
  const perAudience = REACTIONS[aud.id];
  if (perAudience && perAudience[tier]) return perAudience[tier];
  return FALLBACK_TIERS[tier];
}
