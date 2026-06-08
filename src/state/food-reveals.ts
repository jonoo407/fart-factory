/**
 * PLAN v9 P3 / 01 §6 — per-food reveal-on-use store. Distinct from the global
 * axis-discovery (which axes the player has ever seen): this tracks, per food,
 * which of its non-zero axes have been learned. Each launch reveals the single
 * highest-value not-yet-revealed axis of each plated food (strongest first),
 * mirroring the prototype (ff-app.jsx lines 174-185). Surfaced inline on the
 * pantry tile + the Field Guide.
 */
import type { FoodProperties } from './food';

export type AxisName = keyof FoodProperties;

const AXIS_ORDER: readonly AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
const VALID = new Set<string>(AXIS_ORDER);

function key(id: string): string {
  return `fart_food_reveals_${id}`;
}

export function loadFoodReveals(id: string): AxisName[] {
  try {
    const raw = localStorage.getItem(key(id));
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is AxisName => typeof x === 'string' && VALID.has(x));
  } catch {
    return [];
  }
}

function save(id: string, list: AxisName[]): void {
  try {
    localStorage.setItem(key(id), JSON.stringify(list));
  } catch {
    // ignore (private mode / quota)
  }
}

/** Count of non-zero axes — the number a food has to learn to be fully known. */
export function nonzeroAxisCount(props: FoodProperties): number {
  return AXIS_ORDER.filter((ax) => props[ax] > 0).length;
}

/**
 * Reveal the single highest-value not-yet-revealed non-zero axis of a food.
 * Ties break by AXIS_ORDER (stable sort). Returns the revealed axis + its true
 * value, or null if every non-zero axis is already known.
 */
export function revealNextAxis(id: string, props: FoodProperties): { axis: AxisName; value: number } | null {
  const revealed = loadFoodReveals(id);
  const remaining = AXIS_ORDER.filter((ax) => props[ax] > 0 && !revealed.includes(ax)).sort(
    (a, b) => props[b] - props[a],
  );
  const next = remaining[0];
  if (next === undefined) return null;
  save(id, [...revealed, next]);
  return { axis: next, value: props[next] };
}

export function isFoodFullyRevealed(id: string, props: FoodProperties): boolean {
  return loadFoodReveals(id).length >= nonzeroAxisCount(props);
}

export function resetFoodReveals(id: string): void {
  try {
    localStorage.removeItem(key(id));
  } catch {
    // ignore
  }
}
