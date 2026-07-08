/**
 * PLAN v10 P0 — policy simulators for the §5.4 skill gates. These are not
 * game code: they are the reference NOVICE / EXPERT / FIXED-RULE players the
 * gates measure the tuning against. The P0 applause model here (pressure ×
 * zoneMult × demand factors) is superseded by src/v10/applause.ts in P1, and
 * the gates re-run there on real crowd tastes.
 */
import { FOODS, foodBellySize } from '../state/food';
import { biteRisk, zoneFor, zoneMult } from './pressure';
import { mulberry32 } from './rng';
import { createShow, stuff, clench, release, type ShowState } from './show';
import {
  BUST_PITY_APPLAUSE,
  CAP_MET_BONUS,
  CLENCHES_PER_SHOW,
  CLENCH_VENT,
  NUCLEAR_FROM,
  NUCLEAR_MULT,
  SCANDAL_DIVISOR,
  SUMMIT,
  UNMET_DEMAND_MULT,
  type Zone,
} from './tuning';

/** D5 — a crowd's zone demand: a floor ("EPIC or we boo") or a ceiling ("keep it UNDER SOLID"). */
export interface ShowDemand {
  kind: 'min' | 'cap';
  zone: Zone;
}

export interface ShowContext {
  /** Food sizes in hand (drawn from the real catalog's size distribution). */
  hand: readonly number[];
  demand: ShowDemand | null;
  riskMod: number;
}

export interface PolicyResult {
  applause: number;
  busted: boolean;
  bankedPressure: number;
}

export type Policy = (ctx: ShowContext, seed: number) => PolicyResult;

const ZONE_ORDER: readonly Zone[] = ['polite', 'solid', 'epic', 'legendary'];
const zoneRank = (z: Zone): number => ZONE_ORDER.indexOf(z);

const FOOD_SIZES: readonly number[] = FOODS.map((f) => foodBellySize(f));
const RISK_MODS = [0.6, 0.8, 1.0, 1.3, 1.6] as const;

/** D6 (P0 form) — applause for a banked show. Never zero (the floor promise). */
function bankApplause(banked: number, demand: ShowDemand | null): number {
  if (banked <= 0) return BUST_PITY_APPLAUSE;
  const zone = zoneFor(banked);
  let factor = 1;
  if (demand?.kind === 'min') {
    factor = zoneRank(zone) >= zoneRank(demand.zone) ? 1 : UNMET_DEMAND_MULT;
  } else if (demand?.kind === 'cap') {
    // Restraint pays a premium; blowing past a cap is a scandal.
    factor = zoneRank(zone) <= zoneRank(demand.zone) ? CAP_MET_BONUS : 1 / SCANDAL_DIVISOR;
  }
  const nuclear = banked >= NUCLEAR_FROM ? NUCLEAR_MULT : 1;
  return Math.max(1, Math.round(banked * zoneMult(zone) * nuclear * factor));
}

/** Deterministic per-seed context: hand of 8 real food sizes, demand, venue. */
export function generateContext(seed: number): ShowContext {
  const rng = mulberry32(seed);
  let hand: number[] = [];
  do {
    hand = Array.from({ length: 8 }, () => FOOD_SIZES[Math.floor(rng() * FOOD_SIZES.length)]!);
  } while (hand.reduce((a, b) => a + b, 0) < 15); // a hand can always dare the summit
  const d = rng();
  const demand: ShowDemand | null =
    d < 0.25
      ? null
      : d < 0.4
        ? { kind: 'min', zone: 'solid' }
        : d < 0.55
          ? { kind: 'min', zone: 'epic' }
          : d < 0.65
            ? { kind: 'min', zone: 'legendary' }
            : d < 0.85
              ? { kind: 'cap', zone: 'solid' }
              : { kind: 'cap', zone: 'epic' };
  const riskMod = RISK_MODS[Math.floor(rng() * RISK_MODS.length)]!;
  return { hand, demand, riskMod };
}

/**
 * NOVICE — eats in hand order, always tries the first food, then refuses any
 * bite that carries risk ("stops at the first sweat"). Never clenches,
 * ignores demands. This is a real 6-year-old's first session.
 */
export function runNovice(ctx: ShowContext, seed: number): PolicyResult {
  let state = createShow({ seed, riskMod: ctx.riskMod });
  for (let i = 0; i < ctx.hand.length; i++) {
    const size = ctx.hand[i]!;
    const risk = biteRisk(state.pressure, size, ctx.riskMod);
    if (i > 0 && risk > 0) break; // sweat — stop
    const r = stuff(state, size);
    state = r.state;
    if (r.outcome === 'bust') {
      return { applause: BUST_PITY_APPLAUSE, busted: true, bankedPressure: 0 };
    }
    if (risk > 0) break; // survived a scare on bite 1 — quit while ahead
  }
  const done = release(state);
  return {
    applause: bankApplause(done.bankedPressure, ctx.demand),
    busted: false,
    bankedPressure: done.bankedPressure,
  };
}

interface PlanAction {
  kind: 'eat' | 'vent-eat' | 'stop';
  biteIdx?: number;
}

/**
 * EXPERT — the Slow-Cooker player: exact-EV planning over descending-size
 * order with optional skips and clench vents, then executes the plan against
 * the live rolls. Open-loop is optimal here: rolls are independent and reveal
 * nothing the planner didn't already know.
 */
export function runExpert(ctx: ShowContext, seed: number): PolicyResult {
  const bites = [...ctx.hand].sort((a, b) => b - a);
  const memo = new Map<string, { ev: number; action: PlanAction }>();

  const stopEV = (p: number): number => bankApplause(p, ctx.demand);

  const best = (i: number, p: number, c: number): { ev: number; action: PlanAction } => {
    const key = `${i},${p},${c}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let out: { ev: number; action: PlanAction } = { ev: stopEV(p), action: { kind: 'stop' } };
    if (i < bites.length) {
      // skip this bite entirely
      const skipped = best(i + 1, p, c);
      if (skipped.ev > out.ev) out = { ev: skipped.ev, action: skipped.action };
      const size = bites[i]!;
      // eat it
      if (p + size <= SUMMIT) {
        const risk = biteRisk(p, size, ctx.riskMod);
        const ev = (1 - risk) * best(i + 1, p + size, c).ev + risk * BUST_PITY_APPLAUSE;
        if (ev > out.ev) out = { ev, action: { kind: 'eat', biteIdx: i } };
      }
      // vent first, then eat it (the summit squeeze)
      if (c > 0 && p >= CLENCH_VENT && p - CLENCH_VENT + size <= SUMMIT) {
        const pv = p - CLENCH_VENT;
        const risk = biteRisk(pv, size, ctx.riskMod);
        const ev = (1 - risk) * best(i + 1, pv + size, c - 1).ev + risk * BUST_PITY_APPLAUSE;
        if (ev > out.ev) out = { ev, action: { kind: 'vent-eat', biteIdx: i } };
      }
    }
    memo.set(key, out);
    return out;
  };

  let state: ShowState = createShow({ seed, riskMod: ctx.riskMod });
  let i = 0;
  let c = CLENCHES_PER_SHOW;
  for (;;) {
    const { action } = best(i, state.pressure, c);
    if (action.kind === 'stop') break;
    i = action.biteIdx! + 1;
    if (action.kind === 'vent-eat') {
      state = clench(state);
      c--;
    }
    const r = stuff(state, bites[action.biteIdx!]!);
    state = r.state;
    if (r.outcome === 'bust') {
      return { applause: BUST_PITY_APPLAUSE, busted: true, bankedPressure: 0 };
    }
  }
  const done = release(state);
  return {
    applause: bankApplause(done.bankedPressure, ctx.demand),
    busted: false,
    bankedPressure: done.bankedPressure,
  };
}

/**
 * FIXED RULE — "always push to pressure ≥ N": descending order, skips only
 * summit-suicide bites, never clenches, blind to demands and venue. The §5.4
 * no-solved-threshold gate sweeps N and requires the expert to beat the best.
 */
export function runFixedRule(ctx: ShowContext, seed: number, stopAt: number): PolicyResult {
  let state = createShow({ seed, riskMod: ctx.riskMod });
  const bites = [...ctx.hand].sort((a, b) => b - a);
  for (const size of bites) {
    if (state.pressure >= stopAt) break;
    if (state.pressure + size > SUMMIT) continue; // even a rule-follower won't summit-suicide
    const r = stuff(state, size);
    state = r.state;
    if (r.outcome === 'bust') {
      return { applause: BUST_PITY_APPLAUSE, busted: true, bankedPressure: 0 };
    }
  }
  const done = release(state);
  return {
    applause: bankApplause(done.bankedPressure, ctx.demand),
    busted: false,
    bankedPressure: done.bankedPressure,
  };
}

export interface SimulatedShow {
  ctx: ShowContext;
  result: PolicyResult;
}

export interface SimulationSummary {
  shows: SimulatedShow[];
  applause: number[];
  busts: number;
}

export function simulateMany(policy: Policy, shows: number, masterSeed: number): SimulationSummary {
  const out: SimulatedShow[] = [];
  for (let i = 0; i < shows; i++) {
    const ctx = generateContext((masterSeed + i * 7919) >>> 0);
    const result = policy(ctx, (masterSeed ^ (i * 104729 + 13)) >>> 0);
    out.push({ ctx, result });
  }
  return {
    shows: out,
    applause: out.map((s) => s.result.applause),
    busts: out.filter((s) => s.result.busted).length,
  };
}
