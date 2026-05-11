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
 * Render a stack of axis bars — used both by the Fart Profile and the
 * Plate Preview. Only axes in `discoveredAxes` get a row.
 */
export function renderAxisBarsHtml(
  props: FoodProperties,
  discoveredAxes: readonly AxisName[],
): string {
  const discoveredSet = new Set(discoveredAxes);
  return AXIS_ORDER
    .filter((a) => discoveredSet.has(a))
    .map((axis) => {
      const raw = Math.max(0, Math.min(5, props[axis]));
      const value = Math.round(raw);
      const pct = (raw / 5) * 100;
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
      `<div class="fart-profile-bars">${renderAxisBarsHtml(props, discoveredAxes)}</div>` +
    `</div>`
  );
}
