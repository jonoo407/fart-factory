/**
 * Containment area catalog for Tier 7 Story Mode. The setting where you
 * launch your fart — each one amplifies / dampens different properties.
 * Per PLAN.md §D.A.29.
 *
 * Per FUN_CRITIC.md P1 (interesting decisions): containment area adds a
 * context-dependent layer over the recipe so the same plate scores
 * differently per area. Comedy is also baked in — "Volcano in a library"
 * is funny by premise.
 */

export interface AreaModifiers {
  /** Multiplier applied to each fart property after recipe sums. 1.0 = neutral. */
  wet: number;
  dry: number;
  stink: number;
  loud: number;
  musical: number;
  length: number;
  temp: number;
  /** Flat score modifier applied AFTER cravings-match. Negative = penalty. */
  scoreOffset: number;
}

export interface Area {
  id: string;
  name: string;
  emoji: string;
  modifiers: AreaModifiers;
  flavor: string;
}

const m = (
  wet: number,
  dry: number,
  stink: number,
  loud: number,
  musical: number,
  length: number,
  temp: number,
  scoreOffset = 0,
): AreaModifiers => ({ wet, dry, stink, loud, musical, length, temp, scoreOffset });

export const AREAS: readonly Area[] = [
  { id: 'outside',    name: 'Outside',          emoji: '🌳', modifiers: m(0.5, 1.0, 0.5, 1.5, 1.0, 1.0, 1.0),       flavor: 'Wide open. Stink dissipates; volume travels.' },
  { id: 'covers',     name: 'Under the Covers', emoji: '🛏️', modifiers: m(1.0, 1.0, 3.0, 0.3, 1.0, 1.0, 1.0),       flavor: 'Trapped. Stink concentrates. Volume muffled.' },
  { id: 'library',    name: 'Library',          emoji: '📚', modifiers: m(1.0, 1.0, 1.5, 1.5, 1.0, 1.0, 1.0, -3),  flavor: 'Quiet hostility. Loud farts incur public shame.' },
  { id: 'elevator',   name: 'Elevator',         emoji: '🛗', modifiers: m(1.0, 1.0, 4.0, 2.0, 1.0, 1.0, 1.0),       flavor: 'Small enclosed comedy. Maximum chaos.' },
  { id: 'throne',     name: 'Throne Room',      emoji: '🪑', modifiers: m(1.0, 1.0, 0.4, 1.0, 2.0, 1.0, 1.0),       flavor: 'Echoes amplify musicality. Stink shames the realm.' },
  { id: 'space',      name: 'Space Station',    emoji: '🚀', modifiers: m(0.5, 0.5, 0.5, 0.5, 1.0, 1.5, 0.5),       flavor: 'Inverted physics. Everything dampens. Length wins.' },
];

export function getArea(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}
