/**
 * V8 T2 — Plate property preview (mastery-aware).
 *
 * Renders the "🔮 PREDICTION" card that sits above the plate slots. As
 * the player adds/removes foods, the card shows the predicted fart
 * properties (naive sum, no synergies/treatments — those reveal at
 * launch). When any food on the plate is below Apprentice mastery
 * (<10 uses), the card flips into the "UNCERTAIN" state to signal that
 * the prediction is rough.
 *
 * Bars render only for axes the player has DISCOVERED.
 */

import type { FoodProperties } from '../state/food';
import type { AxisName } from '../state/axis-discovery';
import { renderAxisBarsHtml } from './fart-profile';

export function renderPlatePreviewHtml(
  props: FoodProperties,
  discoveredAxes: readonly AxisName[],
  uncertain: boolean,
): string {
  const stateClass = uncertain ? 'plate-preview-uncertain' : 'plate-preview-confident';
  const labelText = uncertain
    ? 'PREDICTION (UNCERTAIN — untested foods on plate)'
    : 'PREDICTION';
  return (
    `<div class="plate-preview-card ${stateClass}">` +
      `<div class="plate-preview-header">` +
        `<span class="plate-preview-icon">🔮</span>` +
        `<span class="plate-preview-label">${labelText}</span>` +
      `</div>` +
      `<div class="plate-preview-bars">${renderAxisBarsHtml(props, discoveredAxes)}</div>` +
    `</div>`
  );
}
