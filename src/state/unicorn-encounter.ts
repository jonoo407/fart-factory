/**
 * Mystery unicorn audience — rare Easter-egg encounter.
 * Per PLAN_v7 T4.2.
 *
 * Each encounter has a UNICORN_CHANCE % roll. When it hits, the daily
 * audience is replaced with the unicorn — a one-off audience with
 * weird cravings. Always a comedy beat, regardless of match outcome.
 */

import type { Audience } from './audience';
import { rngBetween } from './run-state';

export const UNICORN_CHANCE = 0.04; // 4%, ~1 in 25 encounters

export const UNICORN_AUDIENCE: Audience = {
  id: 'mystery-unicorn',
  name: 'The Mystery Unicorn',
  emoji: '🦄',
  cravings: { wet: 3, dry: 2, stink: 3, loud: 2, musical: 5, length: 3, temp: 2 },
  flavor: 'A unicorn wanders in. It is chewing a daisy. It does not appear to have come for the show.',
  description: 'A unicorn wanders in. It is chewing a daisy. It hums to itself. You feel that you must impress it musically, perhaps. Or not. It is hard to say.',
  difficultyTier: 'boss',
};

/**
 * Returns true if the unicorn should appear this encounter.
 * Deterministic per seed.
 */
export function rollUnicornEncounter(seed: number): boolean {
  const roll = rngBetween(seed, 0, 999);
  return roll < UNICORN_CHANCE * 1000;
}
