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
  // No cap at 5 — summed plate axes saturate at normalization (÷AXIS_CAP);
  // the old min(5, …) made the buff REDUCE a musical sum above 5.
  return { ...props, musical: props.musical + 1 };
}
