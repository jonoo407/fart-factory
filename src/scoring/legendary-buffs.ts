/**
 * V8 T7.d — Permanent legendary passives.
 *
 * Each fully-decoded legendary recipe (via the Codex) grants a passive
 * defined on the recipe's `legendaryBuff`. The plate.ts launch pipeline
 * consults these helpers to layer the effects in.
 *
 * Wired buffs (subset of the catalog — the others remain as flavor for
 * later iteration):
 *   - forbidden-gold:   +10% gold reward on every launch
 *   - cosmic-musical:   +1 musical on every plate
 *
 * Future stretch (not yet wired):
 *   - grandmas-belly, cursed-fortune, apocalypse-reroll, void-whisper
 */

import { hasUnlockedBuff } from '../state/codex';
import type { FoodProperties } from '../state/food';

export function legendaryGoldMultiplier(): number {
  return hasUnlockedBuff('forbidden-gold') ? 1.1 : 1;
}

export function applyLegendaryProps(props: FoodProperties): FoodProperties {
  if (!hasUnlockedBuff('cosmic-musical')) return props;
  return { ...props, musical: Math.min(5, props.musical + 1) };
}
