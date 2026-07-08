/**
 * PLAN v10 P0 — seeded RNG (mulberry32, same generator the shop roll uses).
 * Functional stepper: show state stores a plain rngState number, so shows are
 * serializable and replays are exact. No Math.random exists anywhere in
 * src/v10 (guarded by v10-show.test.ts).
 */

export interface RngStep {
  value: number;
  state: number;
}

/** Advance the generator one step: returns a float in [0,1) and the next state. */
export function rngNext(state: number): RngStep {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: s };
}

/** Closure convenience for simulation/test code (policies, context generation). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    const step = rngNext(state);
    state = step.state;
    return step.value;
  };
}
