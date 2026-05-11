/**
 * V8 T4 — Field Guide rendering.
 *
 * The notebook's old "🌟 Food Mastery" list becomes a richer "📚 Field
 * Guide" where each food is a research subject. Property bars fill in
 * progressively by use-count: Mystery (0 bars) → Hunch (1) → Apprentice
 * (3) → Adept (5) → Master (7).
 *
 * Bars are further filtered by the player's discovered-axes set
 * (Scheme 1) — a Master Garlic entry won't show "temp" if the player
 * hasn't yet experienced a temp-axis fart.
 */

import type { Food } from '../state/food';
import type { AxisName } from '../state/axis-discovery';
import {
  bandForUses,
  visibleAxes,
  fauxScientificText,
  bandLabel,
} from '../scoring/field-guide';
import { renderAxisBarsHtml } from './fart-profile';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderFieldGuideEntryHtml(
  food: Food,
  uses: number,
  discoveredAxes: readonly AxisName[],
): string {
  const band = bandForUses(uses);
  // Axes to show = intersection(visible-for-band, discovered).
  const bandAxes = visibleAxes(food, band);
  const discoveredSet = new Set(discoveredAxes);
  const shownAxes = bandAxes.filter((a) => discoveredSet.has(a));
  const barsHtml = shownAxes.length > 0
    ? renderAxisBarsHtml(food.properties, shownAxes)
    : '';
  const text = escapeHtml(fauxScientificText(food, band));
  const usesText = `${uses} use${uses === 1 ? '' : 's'}`;

  return (
    `<div class="field-guide-entry rarity-${food.rarity}" data-food="${food.id}" data-band="${band}">` +
      `<div class="field-guide-entry-head">` +
        `<span class="field-guide-entry-emoji">${food.emoji}</span>` +
        `<span class="field-guide-entry-name">${escapeHtml(food.name)}</span>` +
        `<span class="field-guide-entry-band">${bandLabel(band)}</span>` +
        `<span class="field-guide-entry-uses">${usesText}</span>` +
      `</div>` +
      (barsHtml ? `<div class="field-guide-entry-bars">${barsHtml}</div>` : '') +
      `<div class="field-guide-entry-text">${text}</div>` +
    `</div>`
  );
}
