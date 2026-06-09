/**
 * Treatments catalog + treatment math. Per PLAN_v4.md §C.T items 90-93.
 *
 * Each treatment modifies a food's property vector and (optionally) belly
 * cost. Raw is the identity. Roast / Chill / Blend run instantly; Ferment
 * requires a 1-day wait queue (handled by ferment-rack.ts in Phase V).
 *
 * Property modifiers are ADDITIVE before clamping to [0, 5].
 */

import type { FoodProperties } from '../state/food';
import { getFood, foodBellySize } from '../state/food';

export type TreatmentId = 'raw' | 'roast' | 'ferment' | 'chill' | 'blend';

export interface Treatment {
  id: TreatmentId;
  name: string;
  emoji: string;
  /** Additive deltas to each axis. Clamped to [0, 5] after summing. */
  propertyModifier: FoodProperties;
  bellyCostDelta: number;
  requiresDayWait: boolean;
  /** True for Blend (merges 2 slots → 1). */
  merges: boolean;
  /** Flavor text shown in the Kitchen UI. */
  flavor: string;
}

const zero: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };

export const TREATMENTS: readonly Treatment[] = [
  {
    id: 'raw', name: 'Raw', emoji: '∅',
    propertyModifier: zero,
    bellyCostDelta: 0, requiresDayWait: false, merges: false,
    flavor: 'No prep. Eat as-is.',
  },
  {
    id: 'roast', name: 'Roast', emoji: '🔥',
    propertyModifier: { ...zero, stink: 1, temp: 1, wet: -1 },
    bellyCostDelta: 1, requiresDayWait: false, merges: false,
    flavor: 'Crispier + hotter + drier. Costs +1 belly.',
  },
  {
    id: 'ferment', name: 'Ferment', emoji: '🥒',
    propertyModifier: { ...zero, stink: 2, musical: 1, length: 1 },
    bellyCostDelta: 0, requiresDayWait: true, merges: false,
    flavor: 'Stash overnight. Comes back stronger and more musical.',
  },
  {
    id: 'chill', name: 'Chill', emoji: '❄',
    propertyModifier: { ...zero, wet: -1, temp: -1, loud: 1 },
    bellyCostDelta: 1, requiresDayWait: false, merges: false,
    flavor: 'Drier + colder + sharper sound. Costs +1 belly.',
  },
  {
    id: 'blend', name: 'Blend', emoji: '🥤',
    propertyModifier: zero, // Blend uses averaging, not additive.
    bellyCostDelta: -1, requiresDayWait: false, merges: true,
    flavor: 'Combine 2 foods into 1 averaged slot. Saves 1 belly.',
  },
];

export function getTreatment(id: string): Treatment | undefined {
  return TREATMENTS.find((t) => t.id === id);
}

function clampAxis(v: number): number {
  return Math.max(0, Math.min(5, v));
}

/**
 * Apply a treatment's property modifier to a food's properties.
 * Returns a NEW vector — does not mutate the input.
 */
export function applyTreatment(props: FoodProperties, treatmentId: TreatmentId): FoodProperties {
  const t = getTreatment(treatmentId);
  if (!t) return { ...props };
  const out: FoodProperties = { ...props };
  for (const k of Object.keys(out) as (keyof FoodProperties)[]) {
    out[k] = clampAxis(props[k] + t.propertyModifier[k]);
  }
  return out;
}

/**
 * Average two property vectors (used by Blend).
 */
export function blendProperties(a: FoodProperties, b: FoodProperties): FoodProperties {
  const out: FoodProperties = { ...a };
  for (const k of Object.keys(out) as (keyof FoodProperties)[]) {
    out[k] = clampAxis(Math.round((a[k] + b[k]) / 2));
  }
  return out;
}

// ---------- Prepped plate aggregation ----------

export interface PreppedSlot {
  foodId: string;
  treatment: TreatmentId;
  /** For Blend: the foodId being merged into this slot. */
  blendTargetFoodId?: string;
}

export interface PreppedAggregate {
  props: FoodProperties;
  totalBellyCost: number;
  appliedTreatments: TreatmentId[];
}

/**
 * Sum (per-axis) the properties of all prepped slots after treatments apply.
 * Blend slots merge with their `blendTargetFoodId` into a single
 * averaged contribution. The summed axes are NOT capped at 5 — these are
 * plate sums measured against AXIS_CAP=8 (see applyMasteryBonuses);
 * capping the sum re-pinned every treated plate to 5 per axis and made
 * high cravings unfillable whenever a treatment was equipped.
 */
export function computeFartFromPreppedPlate(slots: PreppedSlot[]): PreppedAggregate {
  const props: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
  let totalBelly = 0;
  const appliedTreatments: TreatmentId[] = [];

  for (const slot of slots) {
    const food = getFood(slot.foodId);
    if (!food) continue;
    let slotProps: FoodProperties;
    if (slot.treatment === 'blend' && slot.blendTargetFoodId) {
      const target = getFood(slot.blendTargetFoodId);
      slotProps = target ? blendProperties(food.properties, target.properties) : { ...food.properties };
    } else {
      slotProps = applyTreatment(food.properties, slot.treatment);
    }
    for (const k of Object.keys(props) as (keyof FoodProperties)[]) {
      props[k] = props[k] + slotProps[k];
    }
    const t = getTreatment(slot.treatment);
    totalBelly += foodBellySize(food) + (t?.bellyCostDelta ?? 0);
    appliedTreatments.push(slot.treatment);
  }
  return { props, totalBellyCost: Math.max(0, totalBelly), appliedTreatments };
}
