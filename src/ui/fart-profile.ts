/**
 * V8 T1.c — FartProfileCard
 *
 * The "you made THIS" panel that anchors every launch result. Renders
 * the named fart at the top, then a horizontal bar for each axis the
 * player has DISCOVERED (Scheme 1 progressive reveal — undiscovered
 * axes stay invisible until the player makes a fart with non-zero
 * value on that axis).
 *
 * Pure render — takes data, returns HTML string. The wiring lives in
 * plate.ts (`renderStoryResult` consumes this).
 */

import type { FoodProperties } from '../state/food';
import type { AxisName } from '../state/axis-discovery';
import { nameFart } from '../scoring/fart-namer';
import { AXIS_CAP } from '../scoring/tuning';

const AXIS_ORDER: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

function axisEmoji(axis: AxisName): string {
  switch (axis) {
    case 'wet': return '💧';
    case 'dry': return '🌵';
    case 'stink': return '🦨';
    case 'loud': return '🔊';
    case 'musical': return '🎵';
    case 'length': return '⏱';
    case 'temp': return '🌡';
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render a stack of axis bars — used by the Fart Profile, the Plate Preview AND
 * the per-food Field Guide. Only axes in `discoveredAxes` get a row.
 *
 * `scaleMax` is the bar's full-scale denominator: per-FOOD callers pass 5 (a
 * food's authored axes are 0-5); PLATE/FART-total callers pass AXIS_CAP=8 (the
 * summed plate reaches ~0-20 and is scored against AXIS_CAP). The PRINTED value
 * is always the TRUE rounded magnitude — only the bar fill is scaled/clamped.
 */
export function renderAxisBarsHtml(
  props: FoodProperties,
  discoveredAxes: readonly AxisName[],
  scaleMax = 5,
): string {
  const discoveredSet = new Set(discoveredAxes);
  return AXIS_ORDER
    .filter((a) => discoveredSet.has(a))
    .map((axis) => {
      const raw = Math.max(0, props[axis]);
      const value = Math.round(raw);
      const pct = Math.min(100, (raw / scaleMax) * 100);
      return (
        `<div class="fart-profile-row" data-axis="${axis}" data-value="${value}">` +
          `<span class="fart-profile-axis-label">${axisEmoji(axis)} ${axis}</span>` +
          `<span class="fart-profile-bar">` +
            `<span class="fart-profile-bar-fill" style="width:${pct}%"></span>` +
          `</span>` +
          `<span class="fart-profile-value">${value}</span>` +
        `</div>`
      );
    })
    .join('');
}

/**
 * V8 T3 — trigger the pulse animation on the rendered profile card. CSS
 * keyframes (.fart-profile-pulsing) do the visual work; this just toggles
 * the class. Removes itself after 2 s so the next launch can re-trigger.
 *
 * Safe to call with a null container, with a container that has no card,
 * or with a container that already has the pulsing class (it restarts).
 */
export const PROFILE_PULSE_MS = 2000;
export function pulseFartProfile(container: HTMLElement | null): void {
  if (!container) return;
  const card = container.querySelector<HTMLElement>('.fart-profile-card');
  if (!card) return;
  card.classList.remove('fart-profile-pulsing');
  // Force reflow so the same class can be reapplied and re-animate.
  void card.offsetWidth;
  card.classList.add('fart-profile-pulsing');
  setTimeout(() => card.classList.remove('fart-profile-pulsing'), PROFILE_PULSE_MS);
}

export function renderFartProfileHtml(
  props: FoodProperties,
  discoveredAxes: readonly AxisName[],
): string {
  const name = escapeHtml(nameFart(props));
  return (
    `<div class="fart-profile-card">` +
      `<div class="fart-profile-header">` +
        `<span class="fart-profile-rocket">🚀</span>` +
        `<span class="fart-profile-eyebrow">YOUR FART</span>` +
        `<span class="fart-profile-name">${name}</span>` +
      `</div>` +
      `<div class="fart-profile-bars">${renderAxisBarsHtml(props, discoveredAxes, AXIS_CAP)}</div>` +
    `</div>`
  );
}
