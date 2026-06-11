/**
 * Danger Zone — the push-your-luck overcharge past the charge meter's top
 * ("The Live Show" feature). Once the sweep pins at 100 the player can keep
 * holding: `depth` ramps 0→1 over OVERCHARGE.rampMs. Releasing pays a quality
 * multiplier lerped minMult→maxMult by depth, but rolls a misfire whose
 * chance scales `maxMisfire * depth^riskCurve` — push deep enough and the
 * blast can fizzle into a comic squeak (an automatic flop).
 *
 * Pure math module. The misfire roll is deterministic per encounter + launch
 * index (seeded), so replays and tests can pin it.
 */

import { OVERCHARGE } from './tuning';
import { encounterSeed, rngBetween } from '../state/run-state';

function clamp01(d: number): number {
  return Math.max(0, Math.min(1, d));
}

/** Release quality for an overcharged blast: minMult→maxMult by depth. */
export function overchargeMultiplier(depth: number): number {
  return OVERCHARGE.minMult + (OVERCHARGE.maxMult - OVERCHARGE.minMult) * clamp01(depth);
}

/** Misfire chance at a given depth — superlinear so shallow dips stay cheap. */
export function misfireChance(depth: number): number {
  return OVERCHARGE.maxMisfire * Math.pow(clamp01(depth), OVERCHARGE.riskCurve);
}

/** Deterministic misfire roll: true = the blast fizzles. */
export function rollMisfire(chance: number, seed: number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return rngBetween(seed, 0, 9999) < Math.round(chance * 10000);
}

/**
 * Seed for the misfire roll: encounter seed XOR a golden-ratio spin of the
 * 1-based launch index, so repeat overcharges at the same crowd reroll.
 * Call with upcomingLaunchIdx() BEFORE recordLaunch increments the counter.
 */
export function misfireSeed(encounterIdx: number, launchN: number): number {
  return (encounterSeed(encounterIdx) ^ Math.imul(launchN, 0x9e3779b9)) >>> 0;
}
