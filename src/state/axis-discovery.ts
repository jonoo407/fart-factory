/**
 * V8 T1.b — Axis Discovery (Scheme 1 progressive reveal).
 *
 * Players start the game with only 3 of the 7 axes visible: wet, loud, stink
 * (the "obvious" ones a child would expect a fart to have). The other 4
 * — dry, musical, length, temp — are HIDDEN on every UI surface until the
 * player makes a fart that registers ≥1 on that axis. At that moment we
 * pop a celebratory "NEW DIMENSION DISCOVERED" splash and add the axis
 * permanently to the player's visible UI.
 *
 * Why: dumping 7 labeled bars on launch #1 collapses the discovery loop
 * into a tutorial. This way the game *teaches itself* through play.
 */

import type { FoodProperties } from './food';

export type AxisName = keyof FoodProperties;

const ALL_AXES: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
const VALID_AXIS_SET = new Set<string>(ALL_AXES);

export const DEFAULT_DISCOVERED: readonly AxisName[] = ['wet', 'loud', 'stink'];

const KEY = 'fart_axes_discovered';

function readRaw(): AxisName[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [...DEFAULT_DISCOVERED];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_DISCOVERED];
    const filtered = parsed.filter(
      (x): x is AxisName => typeof x === 'string' && VALID_AXIS_SET.has(x),
    );
    // Defaults are always discovered; merge in case a save predates the constants.
    const set = new Set<AxisName>([...DEFAULT_DISCOVERED, ...filtered]);
    return [...set];
  } catch {
    return [...DEFAULT_DISCOVERED];
  }
}

function writeRaw(list: AxisName[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function loadDiscoveredAxes(): AxisName[] {
  return readRaw();
}

export function isAxisDiscovered(axis: AxisName): boolean {
  return readRaw().includes(axis);
}

/**
 * Walk the fart properties; for every axis with value ≥ 1, register it as
 * discovered. Returns `added` = newly-revealed axes (used to fire splashes),
 * `list` = full updated discovered list.
 */
export function discoverAxesFromFart(
  props: FoodProperties,
): { added: AxisName[]; list: AxisName[] } {
  const current = new Set(readRaw());
  const added: AxisName[] = [];
  for (const axis of ALL_AXES) {
    if (props[axis] >= 1 && !current.has(axis)) {
      current.add(axis);
      added.push(axis);
    }
  }
  const list = [...current];
  if (added.length > 0) writeRaw(list);
  return { added, list };
}

export function resetAxisDiscovery(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
