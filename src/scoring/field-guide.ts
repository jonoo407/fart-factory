/**
 * V8 T4 — Field Guide pure logic.
 *
 * Progressive reveal of each food's properties, gated by use-count. The
 * player's lab notebook treats each food as a research subject: at first
 * a Mystery, then a Hunch, then deepening Apprentice / Adept work, then
 * Master expertise where the full property vector is laid bare.
 *
 * The bands match the existing food-mastery levels closely but are
 * named for the Field Guide framing — "novice" sounds like a player
 * grade, "mystery" sounds like a subject of study.
 */

import type { Food, FoodProperties } from '../state/food';
import type { AxisName } from '../state/axis-discovery';

export type Band = 'mystery' | 'hunch' | 'apprentice' | 'adept' | 'master';

const AXIS_ORDER: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

export function bandForUses(uses: number): Band {
  if (uses >= 50) return 'master';
  if (uses >= 25) return 'adept';
  if (uses >= 10) return 'apprentice';
  if (uses >= 1)  return 'hunch';
  return 'mystery';
}

export function barCountFor(band: Band): number {
  switch (band) {
    case 'mystery':    return 0;
    case 'hunch':      return 1;
    case 'apprentice': return 3;
    case 'adept':      return 5;
    case 'master':     return 7;
  }
}

/**
 * Returns the N axes that should be visible for this food at this band.
 * Sorted by property value descending; alphabetical tie-break for
 * determinism so the same food at the same band always shows the same
 * axes in the same order.
 */
export function visibleAxes(food: Food, band: Band): AxisName[] {
  const n = barCountFor(band);
  if (n <= 0) return [];
  const sorted = [...AXIS_ORDER].sort((a, b) => {
    const va = food.properties[a as keyof FoodProperties];
    const vb = food.properties[b as keyof FoodProperties];
    if (vb !== va) return vb - va;
    return a.localeCompare(b);
  });
  return sorted.slice(0, n);
}

const BAND_LABEL: Record<Band, string> = {
  mystery:    '🕳 Mystery',
  hunch:      '🔬 Hunch',
  apprentice: '⭐ Apprentice',
  adept:      '⭐⭐ Adept',
  master:     '⭐⭐⭐ Master',
};

export function bandLabel(band: Band): string {
  return BAND_LABEL[band];
}

const HUNCH_TEMPLATES = [
  'Subject {name} is under early study. After a few trials, a single property stands out — further observation pending.',
  'Initial trials with {name} suggest one dominant axis. The rest of the profile remains under study.',
  'Notebook entry — {name}: noticed a tendency in one direction. More launches required to confirm.',
];

const APPRENTICE_TEMPLATES = [
  'Three axes of {name} are now corroborated by repeated trials. Four more remain a hunch.',
  'Apprentice notes on {name}: pattern confirmed across the top three properties. Outliers still unresolved.',
];

const ADEPT_TEMPLATES = [
  'Adept-level study of {name}: five of seven axes are reliably measured. The last two are not far off.',
  'Most of {name}\'s profile is now reproducible across trials. Two stubborn axes remain elusive.',
];

const MASTER_TEMPLATES = [
  'Mastery achieved. Full property vector for {name} is locked in.',
  '{name}: every axis catalogued. The notebook page is complete.',
];

function pickByName(list: readonly string[], food: Food): string {
  // Deterministic per-food selection.
  let seed = 0;
  for (let i = 0; i < food.id.length; i++) seed = (seed * 31 + food.id.charCodeAt(i)) | 0;
  const idx = ((seed % list.length) + list.length) % list.length;
  return list[idx]!.replace(/\{name\}/g, food.name);
}

export function fauxScientificText(food: Food, band: Band): string {
  switch (band) {
    case 'mystery':
      return `Subject ${food.name}: untested. The notebook page is blank. Use this food in a trial to begin study.`;
    case 'hunch':
      return pickByName(HUNCH_TEMPLATES, food);
    case 'apprentice':
      return pickByName(APPRENTICE_TEMPLATES, food);
    case 'adept':
      return pickByName(ADEPT_TEMPLATES, food);
    case 'master':
      // Master text uses the food's own description so the player sees
      // the canonical flavor line as their reward for completing study.
      return food.description ?? pickByName(MASTER_TEMPLATES, food);
  }
}
