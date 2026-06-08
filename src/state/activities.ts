/**
 * Intermission activities. Per PLAN_v5 humming-frolicking-wilkes.md.
 *
 * After "Move On" ends an encounter, the player is offered 3 random
 * activities from this catalog. They pick 1 — the buff applies to the
 * NEXT LAUNCH (one-shot), or fires an immediate effect.
 *
 * 12 activities total. Mix:
 *   - Property buffs (most): +wet/dry/stink/loud/musical/length/temp on next launch
 *   - Belly buffs (immediate): more capacity right now
 *   - Reward buffs: +gold next launch
 *   - Restriction-canceller: Long Shower
 *   - Mode shifter: Meditation (Easy Mode for one launch)
 *
 * Funny + on-theme + kid-safe.
 */

import type { FoodProperties } from './food';
import { encounterSeed, rngBetween } from './run-state';

export type BuffKind = 'property' | 'gold-multiplier' | 'cancel-restriction';

export interface PropertyBuff {
  kind: 'property';
  delta: Partial<FoodProperties>;
}

export interface GoldMultiplierBuff {
  kind: 'gold-multiplier';
  multiplier: number; // e.g. 1.2 for +20%
}

export interface CancelRestrictionBuff {
  kind: 'cancel-restriction';
}

export type Buff = PropertyBuff | GoldMultiplierBuff | CancelRestrictionBuff;

export type ImmediateEffect =
  | { kind: 'refill-belly'; amount: number } // +N to belly right now
  | { kind: 'full-belly'; skipNextIntermission: boolean } // Power Nap
  | { kind: 'grant-food' }; // PLAN v9 — Forage: unlock 1 random new food (04 §9)

export interface Activity {
  id: string;
  name: string;
  emoji: string;
  description: string;
  buff?: Buff;
  immediate?: ImmediateEffect;
}

export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'bean-burrito',
    name: 'Bean Burrito',
    emoji: '🌯',
    description: 'Eat a giant burrito. +6 belly right now.',
    immediate: { kind: 'refill-belly', amount: 6 },
  },
  {
    id: 'hot-pepper-chew',
    name: 'Hot Pepper Chew',
    emoji: '🌶',
    description: 'Chew a fiery pepper. Next launch: +2 temp, +1 stink.',
    buff: { kind: 'property', delta: { temp: 2, stink: 1 } },
  },
  {
    id: 'cheese-sample',
    name: 'Cheese Sample',
    emoji: '🧀',
    description: 'Sample some aged cheese. Next launch: +1 stink, +1 wet.',
    buff: { kind: 'property', delta: { stink: 1, wet: 1 } },
  },
  {
    id: 'glass-of-milk',
    name: 'Glass of Milk',
    emoji: '🥛',
    description: 'Drink some milk. Next launch: +2 wet.',
    buff: { kind: 'property', delta: { wet: 2 } },
  },
  {
    id: 'long-shower',
    name: 'Long Shower',
    emoji: '🚿',
    description: 'Wash up. Refill belly + cancel one restriction next launch.',
    buff: { kind: 'cancel-restriction' },
    immediate: { kind: 'refill-belly', amount: 10 },
  },
  {
    id: 'musical-scales',
    name: 'Hum Scales',
    emoji: '🎵',
    description: 'Hum some musical scales. Next launch: +2 musical.',
    buff: { kind: 'property', delta: { musical: 2 } },
  },
  {
    id: 'stretch-routine',
    name: 'Stretch Routine',
    emoji: '💪',
    description: 'Loosen up. Next launch: +2 length.',
    buff: { kind: 'property', delta: { length: 2 } },
  },
  {
    id: 'belly-massage',
    name: 'Belly Massage',
    emoji: '🤲',
    description: 'Knead your tummy. +3 belly right now.',
    immediate: { kind: 'refill-belly', amount: 3 },
  },
  {
    id: 'watch-comedy',
    name: 'Watch Comedy',
    emoji: '😂',
    description: 'Catch a comedy show. Next launch: +20% gold reward.',
    buff: { kind: 'gold-multiplier', multiplier: 1.2 },
  },
  {
    id: 'power-nap',
    name: 'Power Nap',
    emoji: '💤',
    description: 'Take a power nap. Full belly refill, but skip next intermission.',
    immediate: { kind: 'full-belly', skipNextIntermission: true },
  },
  {
    id: 'fizzy-drink',
    name: 'Fizzy Drink',
    emoji: '🥤',
    description: 'Down some soda. Next launch: +2 loud.',
    buff: { kind: 'property', delta: { loud: 2 } },
  },
  {
    id: 'meditation',
    name: 'Meditation',
    emoji: '🧘',
    description: 'Center yourself. Next launch: +1 musical, +1 length (steadier under pressure).',
    buff: { kind: 'property', delta: { musical: 1, length: 1 } },
  },
  {
    id: 'forage',
    name: 'Forage',
    emoji: '🧺',
    description: 'Rummage the bushes. Unlock 1 random new food.',
    immediate: { kind: 'grant-food' },
  },
];

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}

/**
 * Deterministic 3-of-12 pick per encounter idx. The same idx always
 * surfaces the same 3 activities (so refreshing the page doesn't change
 * the choices), but different idxs roll variety.
 */
export function rollIntermission(idx: number): Activity[] {
  const seed = encounterSeed(idx);
  const pool = [...ACTIVITIES];
  const out: Activity[] = [];
  for (let pick = 0; pick < 3 && pool.length > 0; pick++) {
    const j = rngBetween(seed + pick * 0x9e3779b1, 0, pool.length - 1);
    out.push(pool[j]!);
    pool.splice(j, 1);
  }
  return out;
}
