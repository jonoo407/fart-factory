/**
 * Launch property resolution. Per PLAN_v5.md P1.
 *
 * The single function that decides whether a launch uses the raw recipe
 * path (computeFartFromPlate) or the prepped path (computeFartFromPreppedPlate).
 * Centralized so onStoryLaunch isn't doing branching logic itself, and
 * so we can unit-test the decision deterministically.
 *
 * Rules:
 *   - No treatments → raw path (v3 baseline, synergies + conflicts apply).
 *   - Treatments length === ids length → prepped path (treatments apply
 *     to each food individually; raw path's synergy catalog still feeds
 *     in via triggeredSynergies/triggeredConflicts on the raw vector,
 *     but the AGGREGATE properties come from the prepped math).
 *   - Length mismatch → fall back to raw (safety; covers cases where
 *     the player added a food to the plate AFTER coming back from
 *     Kitchen, e.g.).
 */

import { computeFartFromPlate, type RecipeResult } from './fart-recipe';
import {
  computeFartFromPreppedPlate,
  TREATMENTS,
  type TreatmentId,
  type PreppedSlot,
} from './treatments';
import type { FoodProperties } from '../state/food';

export interface ResolvedLaunch {
  props: FoodProperties;
  usedTreatments: boolean;
  /** Always populated from the raw path so synergies/conflicts can be displayed. */
  rawRecipe: RecipeResult;
  /** Total belly cost (kitchen path includes treatment deltas). */
  totalBellyCost: number;
}

export function resolveLaunchProps(
  ingredientIds: string[],
  treatments: TreatmentId[],
): ResolvedLaunch {
  const rawRecipe = computeFartFromPlate(ingredientIds);
  const hasTreatments =
    treatments.length > 0 &&
    treatments.length === ingredientIds.length &&
    treatments.some((t) => t !== 'raw');

  if (!hasTreatments) {
    return {
      props: rawRecipe.props,
      usedTreatments: false,
      rawRecipe,
      totalBellyCost: 0,
    };
  }

  const slots: PreppedSlot[] = ingredientIds.map((id, i) => ({
    foodId: id,
    treatment: treatments[i] ?? 'raw',
  }));
  const prepped = computeFartFromPreppedPlate(slots);
  return {
    props: prepped.props,
    usedTreatments: true,
    rawRecipe,
    totalBellyCost: prepped.totalBellyCost,
  };
}

/**
 * PLAN v9 Phase 6 — single-equip Kitchen. Expand ONE equipped treatment id to a
 * per-food array (one entry per plated food), so the equipped treatment applies
 * to every brew. `null`, `'raw'`, an unknown id, or a zero-length plate all
 * collapse to `[]` (a raw launch).
 */
export function equippedToTreatments(equipped: string | null, count: number): TreatmentId[] {
  if (count <= 0) return [];
  if (!equipped || equipped === 'raw') return [];
  if (!TREATMENTS.some((t) => t.id === equipped)) return [];
  return Array.from({ length: count }, () => equipped as TreatmentId);
}

/**
 * The single seam the launch handler uses for the single-equip Kitchen: apply
 * the one equipped treatment to every plated food, then resolve through the
 * existing prep-aware path.
 */
export function resolveEquippedLaunch(
  ingredientIds: string[],
  equipped: string | null,
): ResolvedLaunch {
  return resolveLaunchProps(ingredientIds, equippedToTreatments(equipped, ingredientIds.length));
}
