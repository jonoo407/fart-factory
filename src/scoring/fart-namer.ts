/**
 * V8 T1.a — fart-namer
 *
 * Given a property vector, produce a comedic name that captures the fart's
 * personality. Deterministic: same input → same name. The name is built
 * from a modifier (sized by total intensity) plus a family word keyed off
 * the top-2 dominant axes.
 *
 * The point is to give the player a "you made THIS" handle on every launch
 * that they can quote, screenshot, or remember.
 */

import type { FoodProperties } from '../state/food';

type Axis = keyof FoodProperties;
const AXES: Axis[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

const FAMILIES: Record<string, string[]> = {
  // musical + length → liturgical / classical music
  'length+musical': ['Aria', 'Sonata', 'Hymn', 'Vespers', 'Cantata', 'Opus', 'Symphony'],
  // stink + wet → bog/swamp
  'stink+wet':      ['Bog', 'Swamp', 'Marsh', 'Sludge', 'Mire'],
  // loud + stink → explosive
  'loud+stink':     ['Blast', 'Honk', 'Roar', 'Bellow', 'Bomb', 'Detonation', 'Salvo'],
  // stink + temp → fire & brimstone
  'stink+temp':     ['Brimstone', 'Inferno', 'Cinder', 'Ember', 'Crucible', 'Furnace'],
  // dry + loud → percussion / snap
  'dry+loud':       ['Snap', 'Pop', 'Crackle', 'Trumpet', 'Whip'],
  // loud + musical → brass
  'loud+musical':   ['Brass', 'Trombone', 'Fanfare', 'Bugle', 'Chorus'],
  // length + stink → long-tailed plume
  'length+stink':   ['Drone', 'Marshcough', 'Plume', 'Curtain'],
  // musical + wet → lullaby / babble
  'musical+wet':    ['Lullaby', 'Murmur', 'Burble', 'Babble'],
  // loud + wet → splash / spout
  'loud+wet':       ['Splash', 'Gurgle', 'Geyser', 'Spout'],
  // length + temp → slow burn
  'length+temp':    ['Slow Burn', 'Smolder', 'Simmer'],
  // dry + stink → husk / crackle
  'dry+stink':      ['Crackpipe', 'Husk', 'Crackle'],
  // musical + stink → choir
  'musical+stink':  ['Hymnal', 'Vespers', 'Choir'],
  // dry + musical → whistle
  'dry+musical':    ['Whistle', 'Piccolo', 'Reed'],
  // wet + temp → steam
  'temp+wet':       ['Steam', 'Geyser', 'Mistfall'],
  // length + loud → megaphone
  'length+loud':    ['Megaphone', 'Bellow', 'Foghorn'],
  // length + wet → drizzle
  'length+wet':     ['Drizzle', 'Drone', 'Marshcough'],
  // dry + temp → spark
  'dry+temp':       ['Spark', 'Tinder', 'Sizzle'],
  // musical + temp → crescendo
  'musical+temp':   ['Crescendo', 'Forte', 'Burning Hymn'],
  // dry + wet (rare) → mist
  'dry+wet':        ['Drizzle', 'Mist'],
};

const HUMBLE = ['Mouse Squeak', 'Polite Cough', 'Whisper', 'Bashful Hush', 'Wee Toot'];

const MOD_HIGH = ['Cosmic', 'Apocalyptic', 'Legendary', 'Mighty', 'Glorious', 'Eternal', 'Forbidden', 'Grand', 'Almighty'];
const MOD_MID  = ['Bold', 'Hearty', 'Confident', 'Triumphant', 'Resounding', 'Reverberating', 'Stalwart'];
const MOD_LOW  = ['Tiny', 'Polite', 'Modest', 'Wee', 'Little', 'Gentle', 'Quiet', 'Bashful'];

function pairKey(a: Axis, b: Axis): string {
  return [a, b].sort().join('+');
}

function pickStable<T>(list: readonly T[], seed: number): T {
  const idx = ((seed % list.length) + list.length) % list.length;
  return list[idx]!;
}

function seedFromProps(props: FoodProperties): number {
  // Integer seed so modulo-indexing returns a valid array index even when
  // the caller passes fractional values (e.g., post area-modifier props).
  let s = 0;
  let mult = 1;
  for (const a of AXES) {
    s += Math.round(props[a] * 2) * mult; // x2 keeps half-step granularity
    mult *= 11;
  }
  return Math.floor(s);
}

export function nameFart(props: FoodProperties): string {
  const sum = AXES.reduce((acc, a) => acc + Math.round(props[a]), 0);
  const seed = seedFromProps(props);

  if (sum === 0) {
    return `The ${pickStable(HUMBLE, seed)}`;
  }

  const ranked = [...AXES].sort((a, b) => {
    if (props[b] !== props[a]) return props[b] - props[a];
    return a.localeCompare(b);
  });
  const [first, second] = ranked as [Axis, Axis, ...Axis[]];

  const key = pairKey(first, second);
  const family = FAMILIES[key] ?? HUMBLE;
  const familyWord = pickStable(family, seed);

  let modList: readonly string[];
  if (sum <= 4) modList = MOD_LOW;
  else if (sum >= 25) modList = MOD_HIGH;
  else modList = MOD_MID;

  const modifier = pickStable(modList, seed >> 4);

  return `The ${modifier} ${familyWord}`;
}
