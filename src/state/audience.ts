/**
 * Audience archetypes catalog for Tier 7 Story Mode. 20 named characters
 * who sit down to judge each daily fart launch. Per PLAN.md §D.A.27.
 *
 * Per FUN_CRITIC.md §4 axes: replaces the abstract "daily challenge" with
 * named characters carrying voice/personality (Personality / Charm axis),
 * adds restriction clauses for interesting decisions (Decision Quality),
 * and rotates deterministically per UTC day (Goal Stacking — across
 * sessions, you'll see every audience).
 */

import type { FoodProperties } from './food';

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
  /** One-line personality. Shown under the portrait in Easy Mode. */
  flavor: string;
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
  { id: 'granny-edna',       name: 'Granny Edna',          emoji: '👵', cravings: c(1, 2, 1, 1, 3, 2, 1),                                          flavor: 'Polite. Mild. Almost imperceptible.' },
  { id: 'royal-court',       name: 'The Royal Court',      emoji: '👑', cravings: c(0, 3, 1, 1, 5, 4, 2), restrictions: ['no-wet'],                flavor: 'Long, musical, dignified. NO fermentation.' },
  { id: 'frat-bros',         name: 'The Frat Bros',        emoji: '🍺', cravings: c(3, 1, 4, 5, 0, 4, 2), restrictions: ['min-foods:3'],            flavor: 'Louder is better. Bigger is better.' },
  { id: 'haunted-mansion',   name: 'The Haunted Mansion',  emoji: '👻', cravings: c(2, 1, 5, 1, 1, 4, 0), restrictions: ['need-cursed-or-rare'],    flavor: 'Eerie. Drawn-out. Mortal flesh need not apply.' },
  { id: 'alien-tourists',    name: 'Alien Tourists',       emoji: '👽', cravings: c(2, 2, 3, 2, 4, 3, 4),                                          flavor: 'They\'ve never smelled anything like it. Surprise them.' },
  { id: 'toddler-bday',      name: 'Toddler Birthday Party', emoji: '🎂', cravings: c(2, 1, 1, 4, 3, 2, 1),                                        flavor: 'Loud and funny noises win the day.' },
  { id: 'goth-teens',        name: 'Goth Teens',           emoji: '🖤', cravings: c(1, 2, 4, 1, 2, 4, 1),                                          flavor: 'Brooding. Quiet. Profoundly stinky.' },
  { id: 'kindergarten',      name: 'Kindergarten Class',   emoji: '🎈', cravings: c(2, 1, 2, 3, 2, 2, 2),                                          flavor: 'Giggles. Wonder. Mild surprise.' },
  { id: 'skunk-society',     name: 'The Skunk Society',    emoji: '🦨', cravings: c(3, 1, 5, 1, 1, 3, 1), restrictions: ['min-stink:4'],            flavor: 'Quiet but unmistakable. Their motto: "Do No Harm. But Do."' },
  { id: 'opera-house',       name: 'The Opera House',      emoji: '🎭', cravings: c(0, 3, 1, 1, 5, 5, 2),                                          flavor: 'Soprano-grade musicality. Drama mandatory.' },
  { id: 'wrestling-fans',    name: 'Wrestling Fans',       emoji: '🤼', cravings: c(3, 1, 3, 5, 1, 3, 3),                                          flavor: 'BIG. THEATRICAL. UNPREDICTABLE.' },
  { id: 'librarians',        name: 'Librarians',           emoji: '📚', cravings: c(1, 2, 3, 0, 2, 3, 1), restrictions: ['max-loud:2'],             flavor: 'Loud anything is forbidden. Silence amplifies stink.' },
  { id: 'volcano-cult',      name: 'The Volcano Cult',     emoji: '🌋', cravings: c(0, 2, 4, 4, 1, 4, 5),                                          flavor: 'Hot. Loud. Worthy of the magma god.' },
  { id: 'pet-rescue',        name: 'Pet Rescue Volunteers', emoji: '🐕', cravings: c(2, 1, 1, 2, 3, 2, 1), restrictions: ['max-stink:2'],          flavor: 'The dogs are sensitive. Keep it subtle.' },
  { id: 'astronauts',        name: 'Astronauts',           emoji: '🚀', cravings: c(1, 3, 1, 1, 3, 4, 2), restrictions: ['no-wet'],                 flavor: 'Confined quarters. Long missions. Subtle and musical wins.' },
  { id: 'food-critics',      name: 'Food Critics',         emoji: '🍽️', cravings: c(3, 1, 4, 2, 3, 4, 3),                                          flavor: 'They want notes. Complexity. Finish.' },
  { id: 'baby-shower',       name: 'Baby Shower',          emoji: '🍼', cravings: c(1, 2, 1, 1, 4, 2, 1),                                          flavor: 'Polite. Whimsical. Not in front of the baby.' },
  { id: 'punk-show',         name: 'Punk Rock Show',       emoji: '🤘', cravings: c(2, 1, 3, 5, 1, 3, 4),                                          flavor: 'Fast. Loud. Unapologetic.' },
  { id: 'silent-monks',      name: 'Silent Monks',         emoji: '🧘', cravings: c(0, 4, 2, 0, 4, 5, 1), restrictions: ['max-loud:1'],             flavor: 'Patient. Contemplative. A whisper says everything.' },
  { id: 'mystery-guest',     name: 'The Mystery Guest',    emoji: '❓', cravings: c(3, 2, 3, 3, 3, 3, 3),                                          flavor: 'You can\'t tell what they want. You have to feel it.' },
];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const ms = d.getTime() - start;
  return Math.floor(ms / 86_400_000);
}

export function getDailyAudience(d: Date = new Date(), pool?: readonly Audience[]): Audience {
  const arr = pool && pool.length > 0 ? pool : AUDIENCES;
  // P12: GamePlus splits the UTC day at noon — twice the audience rotation rate.
  // The check is done via a dynamic read of localStorage (boss-progress.ts) to
  // keep audience.ts free of UI/state dependencies.
  let gamePlus = false;
  try {
    const raw = localStorage.getItem('fart_gameplus');
    gamePlus = raw !== null && JSON.parse(raw) === true;
  } catch {
    gamePlus = false;
  }
  const base = dayOfYear(d);
  const idx = gamePlus
    ? (base * 2 + (d.getUTCHours() < 12 ? 0 : 1)) % arr.length
    : base % arr.length;
  return arr[idx]!;
}

export function getAudience(id: string): Audience | undefined {
  return AUDIENCES.find((a) => a.id === id);
}
