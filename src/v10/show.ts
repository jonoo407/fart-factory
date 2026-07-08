/**
 * PLAN v10 P0 — the one-show state machine: stuff / clench / release / bust.
 * Fully deterministic: all randomness flows through the stored rngState
 * (rng.ts), so a seed + call sequence replays to the identical transcript.
 * State is immutable-by-convention: every transition returns a new object.
 */
import { biteRisk, zoneFor } from './pressure';
import { rngNext } from './rng';
import { CLENCHES_PER_SHOW, CLENCH_VENT, type Zone } from './tuning';

export type ShowPhase = 'stuffing' | 'busted' | 'released';

export interface ShowConfig {
  seed: number;
  /** Venue risk modifier (hazards, hot spots). 1 = neutral. */
  riskMod?: number;
  clenches?: number;
}

export interface ShowState {
  phase: ShowPhase;
  pressure: number;
  bites: readonly number[];
  clenchesLeft: number;
  riskMod: number;
  /** Risk of the most recent bite — the UI's wobble/sweat driver. */
  lastRisk: number;
  rngState: number;
}

export interface StuffResult {
  state: ShowState;
  outcome: 'ok' | 'bust';
}

export interface ReleaseResult {
  busted: false;
  zone: Zone;
  bankedPressure: number;
}

export function createShow(cfg: ShowConfig): ShowState {
  return {
    phase: 'stuffing',
    pressure: 0,
    bites: [],
    clenchesLeft: cfg.clenches ?? CLENCHES_PER_SHOW,
    riskMod: cfg.riskMod ?? 1,
    lastRisk: 0,
    rngState: cfg.seed >>> 0,
  };
}

/** Eat one food of `size`. Rolls the bust die iff the bite carries risk. */
export function stuff(state: ShowState, size: number): StuffResult {
  if (state.phase !== 'stuffing') {
    throw new Error(`stuff() in phase '${state.phase}' — the show is over`);
  }
  const risk = biteRisk(state.pressure, size, state.riskMod);
  let rngState = state.rngState;
  let busted = risk >= 1;
  if (!busted && risk > 0) {
    const roll = rngNext(rngState);
    rngState = roll.state;
    busted = roll.value < risk;
  }
  const next: ShowState = {
    ...state,
    phase: busted ? 'busted' : 'stuffing',
    pressure: state.pressure + size,
    bites: [...state.bites, size],
    lastRisk: risk,
    rngState,
  };
  return { state: next, outcome: busted ? 'bust' : 'ok' };
}

/** Squeeze one out safely: vents CLENCH_VENT pressure. Limited per show. */
export function clench(state: ShowState): ShowState {
  if (state.phase !== 'stuffing') {
    throw new Error(`clench() in phase '${state.phase}'`);
  }
  if (state.clenchesLeft <= 0) throw new Error('no clenches left');
  if (state.pressure < CLENCH_VENT) throw new Error('nothing to vent');
  return {
    ...state,
    pressure: state.pressure - CLENCH_VENT,
    clenchesLeft: state.clenchesLeft - 1,
    lastRisk: 0,
  };
}

/** Let it rip: bank the current pressure and end the show. */
export function release(state: ShowState): ReleaseResult {
  if (state.phase !== 'stuffing') {
    throw new Error(`release() in phase '${state.phase}'`);
  }
  return { busted: false, zone: zoneFor(state.pressure), bankedPressure: state.pressure };
}
