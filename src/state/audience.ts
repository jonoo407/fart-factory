/**
 * Audience archetypes catalog for Tier 7 Story Mode. 20 named characters
 * who sit down to judge each fart launch. Per PLAN.md §D.A.27.
 *
 * V8 T6 — Hard/Easy mode is gone. Each audience now carries a `description`
 * blurb (1-2 sentences of funny in-character prose with embedded clues),
 * and a `difficultyTier` that controls clue density:
 *
 *   easy   — 4 of 7 axes hinted qualitatively ("very", "barely")
 *   medium — 3 of 7 axes, restrictions paraphrased
 *   hard   — 2 of 7 axes, restrictions hinted via vibe only
 *   boss   — 1 of 7 axes + cryptic, no restrictions stated
 *
 * No description leaks literal n/5 numbers. The prose IS the hint.
 */

import type { FoodProperties } from './food';
import { TARGET_DIV } from '../scoring/tuning';

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'boss';

/** A single judged axis derived from an audience's cravings + restrictions. */
export interface AudienceWant {
  axis: keyof FoodProperties;
  /** desired level, normalized into 0-1 (craving/TARGET_DIV; 0 for a hated axis). */
  target: number;
  /** relative importance in the weakest-link blend (1 until per-axis weights exist). */
  weight: number;
  /** true for a "no-<axis>" rule — being this thing tanks the score (multiplicative penalty). */
  hate: boolean;
}

const AXIS_KEYS: ReadonlyArray<keyof FoodProperties> = [
  'wet',
  'dry',
  'stink',
  'loud',
  'musical',
  'length',
  'temp',
];

export interface Audience {
  id: string;
  name: string;
  emoji: string;
  /** What this audience LOVES — target property profile, each axis 0-5. */
  cravings: FoodProperties;
  /**
   * Optional rules: things the launch MUST satisfy or auto-zeros.
   * Examples: "no-dairy", "must-include-fermented", "min-foods:3".
   */
  restrictions?: string[];
  /** Legacy short flavor (kept for tooltips/tests; the new prose is `description`). */
  flavor: string;
  /** V8 T6 — funny 1-2 sentence in-character blurb. Clue density scales with tier. */
  description: string;
  /** V8 T6 — drives clue density in `description`. */
  difficultyTier: DifficultyTier;
  /**
   * PLAN v9 D4 — base gold paid at a 100% match. When omitted, defaults from
   * `difficultyTier` via GOLD_BY_TIER. The anti-grind rule pays only the
   * improvement over the stored best (see scoring/reward.ts awardGoldForEncounter).
   */
  baseGold?: number;
}

const c = (
  wet: number,
  dry: number,
  stink: number,
  loud: number,
  musical: number,
  length: number,
  temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

export const AUDIENCES: readonly Audience[] = [
  // ============ EASY (5) — Hometown starter pool, clearest hints ============
  {
    id: 'granny-edna',
    name: 'Granny Edna',
    emoji: '👵',
    cravings: c(1, 2, 1, 1, 3, 2, 1),
    flavor: 'Polite. Mild. Almost imperceptible.',
    description: 'Edna prefers a polite little hum — nothing too loud, nothing too long, just a tidy tune she can pretend not to hear.',
    difficultyTier: 'easy',
  },
  {
    id: 'toddler-bday',
    name: 'Toddler Birthday Party',
    emoji: '🎂',
    cravings: c(2, 1, 1, 4, 3, 2, 1),
    flavor: 'Loud and funny noises win the day.',
    description: 'A cake-smeared mob who reward the LOUDEST, silliest, most musical raspberry in the room. Quiet farts get a juice-box thrown at them.',
    difficultyTier: 'easy',
  },
  {
    id: 'baby-shower',
    name: 'Baby Shower',
    emoji: '🍼',
    cravings: c(1, 2, 1, 1, 4, 2, 1),
    flavor: 'Polite. Whimsical. Not in front of the baby.',
    description: 'A whimsical, hush-toned crowd who want something musical and adorable — the kind of toot a stuffed bear might do. Nothing rude in front of the baby.',
    difficultyTier: 'easy',
  },
  {
    id: 'kindergarten',
    name: 'Kindergarten Class',
    emoji: '🎈',
    cravings: c(2, 1, 2, 3, 2, 2, 2),
    flavor: 'Giggles. Wonder. Mild surprise.',
    description: 'Twenty five-year-olds wired on cookies. They want a fart that surprises them — a little loud, a little wet, a little musical, but not scary. Giggles are the goal.',
    difficultyTier: 'easy',
  },
  {
    id: 'pet-rescue',
    name: 'Pet Rescue Volunteers',
    emoji: '🐕',
    cravings: c(2, 1, 1, 2, 3, 2, 1),
    restrictions: ['max-stink:2'],
    flavor: 'The dogs are sensitive. Keep it subtle.',
    description: 'Sweet folks with sweeter rescue dogs. They love a musical little burble — but please, the puppies have delicate noses, so go easy on anything *aromatic*.',
    difficultyTier: 'easy',
  },

  // ============ MEDIUM (9) — City + Wilderness, 3 axes + paraphrased restrictions ============
  {
    id: 'frat-bros',
    name: 'The Frat Bros',
    emoji: '🍺',
    cravings: c(3, 1, 4, 5, 0, 4, 2),
    restrictions: ['min-foods:3'],
    flavor: 'Louder is better. Bigger is better.',
    description: "Chad and the boys are chanting for something LOUD, NASTY, and BIG — and if your plate's looking thin, don't even bother walking in.",
    difficultyTier: 'medium',
  },
  {
    id: 'goth-teens',
    name: 'Goth Teens',
    emoji: '🖤',
    cravings: c(1, 2, 4, 1, 2, 4, 1),
    flavor: 'Brooding. Quiet. Profoundly stinky.',
    description: 'They sigh, they brood, and they reward a quiet, drawn-out fart that smells like a damp graveyard. Loud is so basic.',
    difficultyTier: 'medium',
  },
  {
    id: 'alien-tourists',
    name: 'Alien Tourists',
    emoji: '👽',
    cravings: c(2, 2, 3, 2, 4, 3, 4),
    flavor: "They've never smelled anything like it. Surprise them.",
    description: 'The tourists from Zorptron-7 want something warm, musical, and just stinky enough to write home about — anything earthly will do.',
    difficultyTier: 'medium',
  },
  {
    id: 'wrestling-fans',
    name: 'Wrestling Fans',
    emoji: '🤼',
    cravings: c(3, 1, 3, 5, 1, 3, 3),
    flavor: 'BIG. THEATRICAL. UNPREDICTABLE.',
    description: 'They want THEATRICS — a wet, hot slam of a fart, loud enough to shake the cheap seats. Bonus for body-slam aftermath.',
    difficultyTier: 'medium',
  },
  {
    id: 'punk-show',
    name: 'Punk Rock Show',
    emoji: '🤘',
    cravings: c(2, 1, 3, 5, 1, 3, 4),
    flavor: 'Fast. Loud. Unapologetic.',
    description: 'The pit is moshing. They want LOUD, FAST, and HOT — no apology, no encore, no mercy.',
    difficultyTier: 'medium',
  },
  {
    id: 'skunk-society',
    name: 'The Skunk Society',
    emoji: '🦨',
    cravings: c(3, 1, 5, 1, 1, 3, 1),
    restrictions: ['min-stink:4'],
    flavor: 'Quiet but unmistakable. Their motto: "Do No Harm. But Do."',
    description: 'A hush-voiced fellowship of connoisseurs. They reward something quietly wet but UNAPOLOGETICALLY pungent — if you can\'t bring the stink, kindly leave.',
    difficultyTier: 'medium',
  },
  {
    id: 'food-critics',
    name: 'Food Critics',
    emoji: '🍽️',
    cravings: c(3, 1, 4, 2, 3, 4, 3),
    flavor: 'They want notes. Complexity. Finish.',
    description: 'They scribble notes. A long, complex fart with stinky finish and a hint of melody. They will absolutely take a second sniff.',
    difficultyTier: 'medium',
  },
  {
    id: 'volcano-cult',
    name: 'The Volcano Cult',
    emoji: '🌋',
    cravings: c(0, 2, 4, 4, 1, 4, 5),
    flavor: 'Hot. Loud. Worthy of the magma god.',
    description: 'Robed devotees of Mt. Smelly. They want SEARING heat, thunderous volume, and a long pungent plume — fit to be offered to the magma god.',
    difficultyTier: 'medium',
  },
  {
    id: 'haunted-mansion',
    name: 'The Haunted Mansion',
    emoji: '👻',
    cravings: c(2, 1, 5, 1, 1, 4, 0),
    restrictions: ['need-cursed-or-rare'],
    flavor: 'Eerie. Drawn-out. Mortal flesh need not apply.',
    description: 'The ghosts demand something foul, drawn-out, and *unworldly* — only the rarer or cursed ingredients in your pantry will satisfy.',
    difficultyTier: 'medium',
  },

  // ============ HARD (4) — Royal pool, 2 axes + vibe-only restrictions ============
  {
    id: 'librarians',
    name: 'Librarians',
    emoji: '📚',
    cravings: c(1, 2, 3, 0, 2, 3, 1),
    restrictions: ['max-loud:2'],
    flavor: 'Loud anything is forbidden. Silence amplifies stink.',
    description: 'A pages-rustling sort of crowd. They reward what they can almost-not-hear — discreet, lingering, slightly musty.',
    difficultyTier: 'hard',
  },
  {
    id: 'royal-court',
    name: 'The Royal Court',
    emoji: '👑',
    cravings: c(0, 3, 1, 1, 5, 4, 2),
    restrictions: ['no-wet'],
    flavor: 'Long, musical, dignified. NO fermentation.',
    description: 'The court is gathered. They expect a long aria of a fart — refined, dignified, and dry as a bone. A damp note here would be… *unforgivable*.',
    difficultyTier: 'hard',
  },
  {
    id: 'opera-house',
    name: 'The Opera House',
    emoji: '🎭',
    cravings: c(0, 3, 1, 1, 5, 5, 2),
    flavor: 'Soprano-grade musicality. Drama mandatory.',
    description: 'A standing-room crowd at La Scala. They want soprano-grade melody, held for the full third act — anything else gets thrown roses, the bad way.',
    difficultyTier: 'hard',
  },
  {
    id: 'astronauts',
    name: 'Astronauts',
    emoji: '🚀',
    cravings: c(1, 3, 1, 1, 3, 4, 2),
    restrictions: ['no-wet'],
    flavor: 'Confined quarters. Long missions. Subtle and musical wins.',
    description: 'Three crewmates, one tin can, 200 days from home. They\'ll thank you for something dry, melodic, and long — *please*, nothing damp in here.',
    difficultyTier: 'hard',
  },

  // ============ BOSS (2) — 1 axis + cryptic, no restrictions stated ============
  {
    id: 'silent-monks',
    name: 'Silent Monks',
    emoji: '🧘',
    cravings: c(0, 4, 2, 0, 4, 5, 1),
    restrictions: ['max-loud:1'],
    flavor: 'Patient. Contemplative. A whisper says everything.',
    description: 'The Abbot has not spoken in forty years. He will know if you breathe wrong.',
    difficultyTier: 'boss',
  },
  {
    id: 'mystery-guest',
    name: 'The Mystery Guest',
    emoji: '❓',
    cravings: c(3, 2, 3, 3, 3, 3, 3),
    flavor: "You can't tell what they want. You have to feel it.",
    description: 'A figure in the back row. They want what every audience wants, all at once, balanced. There is no wrong answer — only a less-correct one.',
    difficultyTier: 'boss',
  },
];

import { currentEncounterIdx } from './run-state';

/**
 * Audience for the given encounter idx. Optional pool — if omitted, uses
 * the global AUDIENCES catalog.
 *
 * GamePlus effect (when fart_gameplus flag is set): each encounter rolls
 * 2 audience positions instead of 1, so the rotation cycles twice as fast.
 */
export function audienceForEncounter(idx: number = currentEncounterIdx(), pool?: readonly Audience[]): Audience {
  const arr = pool && pool.length > 0 ? pool : AUDIENCES;
  let gamePlus = false;
  try {
    const raw = localStorage.getItem('fart_gameplus');
    gamePlus = raw !== null && JSON.parse(raw) === true;
  } catch {
    gamePlus = false;
  }
  const step = gamePlus ? 2 : 1;
  return arr[(idx * step) % arr.length]!;
}

/** Legacy wrapper for callers still using `getDailyAudience()`. */
export function getDailyAudience(_d: Date = new Date(), pool?: readonly Audience[]): Audience {
  return audienceForEncounter(currentEncounterIdx(), pool);
}

export function getAudience(id: string): Audience | undefined {
  return AUDIENCES.find((a) => a.id === id);
}

/**
 * The machine-readable judged set for the closeness scorer + Order Ticket
 * chips (PLAN v9 P0.2). Each non-zero craving becomes a positive want with
 * `target = craving/TARGET_DIV` (0-1); each `no-<axis>` restriction becomes a
 * hate want (`target 0`). Ingredient/quantity restrictions (no-dairy,
 * min-foods:N, need-cursed-or-rare, min/max-<axis>:N) are NOT axis wants and
 * stay with `checkRestrictions`. No raw 0-5 integer ever leaves this boundary
 * (doc 06 §3 — never expose literal targets).
 */
export function deriveWants(audience: Audience): AudienceWant[] {
  const hated = new Set<keyof FoodProperties>();
  for (const r of audience.restrictions ?? []) {
    const m = /^no-([a-z]+)$/.exec(r);
    if (m && (AXIS_KEYS as readonly string[]).includes(m[1]!)) {
      hated.add(m[1] as keyof FoodProperties);
    }
  }
  const wants: AudienceWant[] = [];
  for (const axis of AXIS_KEYS) {
    if (hated.has(axis)) {
      wants.push({ axis, target: 0, weight: 1, hate: true });
    } else if (audience.cravings[axis] > 0) {
      wants.push({ axis, target: audience.cravings[axis] / TARGET_DIV, weight: 1, hate: false });
    }
  }
  return wants;
}
