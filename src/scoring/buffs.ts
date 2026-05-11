/**
 * Active-buff pipeline. Per PLAN_v5 humming-frolicking-wilkes.md.
 *
 * The intermission system writes activity ids to fart_active_buffs.
 * onStoryLaunch reads via applyActiveBuffs(props) before scoring, then
 * consumeBuffs() clears them — one-shot semantics per the spec.
 */

import type { FoodProperties } from '../state/food';
import { ACTIVITIES, getActivity, type Activity } from '../state/activities';

const KEY = 'fart_active_buffs';

function clampAxis(v: number): number {
  return Math.max(0, Math.min(5, v));
}

export function loadActiveBuffs(): Activity[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string')
      .map((id) => getActivity(id))
      .filter((a): a is Activity => a !== undefined);
  } catch {
    return [];
  }
}

export function setActiveBuff(activityId: string): void {
  if (!getActivity(activityId)) return;
  const existing = loadActiveBuffs().map((a) => a.id);
  if (existing.includes(activityId)) return; // dedupe
  try {
    localStorage.setItem(KEY, JSON.stringify([...existing, activityId]));
  } catch {
    // ignore
  }
}

export function consumeBuffs(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Apply all active PROPERTY buffs additively, clamped to 0-5. */
export function applyActiveBuffs(props: FoodProperties): FoodProperties {
  const buffs = loadActiveBuffs();
  if (buffs.length === 0) return props;
  const out: FoodProperties = { ...props };
  for (const a of buffs) {
    if (!a.buff || a.buff.kind !== 'property') continue;
    for (const [axis, delta] of Object.entries(a.buff.delta)) {
      const k = axis as keyof FoodProperties;
      out[k] = clampAxis(out[k] + (delta as number));
    }
  }
  return out;
}

/** Multiplier from gold-multiplier buffs (e.g., Watch Comedy = 1.2). */
export function goldMultiplierFromBuffs(): number {
  let mult = 1;
  for (const a of loadActiveBuffs()) {
    if (a.buff?.kind === 'gold-multiplier') mult *= a.buff.multiplier;
  }
  return mult;
}

export function cancelOneRestrictionFromBuffs(): boolean {
  return loadActiveBuffs().some((a) => a.buff?.kind === 'cancel-restriction');
}

// Suppress unused-export warning (ACTIVITIES re-exported in case the UI
// wants the catalog without a separate import).
export { ACTIVITIES };
