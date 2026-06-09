/**
 * Boss-match scoring engine. Per PLAN_v4.md §A.N item 73.
 *
 * Each boss has a different win-condition based on its `skillKind`.
 * `createBossRunState(boss)` seeds the initial state; `evaluateBossRound`
 * advances it by one launch; `isBossWon` checks the win condition.
 *
 * The engine is pure — it takes the boss definition + run state + launch
 * input, and returns a new run state. No I/O. Tests can drive it
 * deterministically.
 */

import type { Boss } from '../state/bosses';
import type { FoodProperties } from '../state/food';
import { AUDIENCES, type Audience } from '../state/audience';
import { evaluateMatch, type MatchResult } from './match';

export interface BossLaunchInput {
  ingredientIds: string[];
  /** Fart properties after area modifiers (caller supplies). */
  propsAfterArea: FoodProperties;
  /** For Boss 5 (resource-allocation): which audience idx is the player aiming at? null if not applicable. */
  targetAudienceIdx: number | null;
  /**
   * Charge multiplier from the BLAST meter (1.25 perfect / 1.1 good /
   * 0.85 weak / 1.0 tap — scoring/charge.ts). Required so the arena fork
   * can't silently drop it again: the meter used to sweep in boss fights
   * while this value was thrown away.
   */
  quality: number;
}

export interface PerAudienceResult {
  audienceId: string;
  pct: number;
  passed: boolean; // pct >= passingThreshold
  violations: string[];
}

export interface BossRoundResult {
  ingredientIds: string[];
  /** For intersection / prioritization / resource-allocation: per-audience results. */
  audienceResults: PerAudienceResult[];
  /** For deduction: first launch is probe-only (match% hidden from UI). */
  probeOnly: boolean;
}

export interface BossRunState {
  bossId: string;
  roundsRemaining: number;
  /** All launches so far. */
  results: BossRoundResult[];
  /** Audiences passed so far (used by intersection + prioritization). */
  audiencesPassed: Set<string>;
  /** For Boss 5: which councilor idxs voted yes. */
  votes: Set<number>;
  /** For Boss 5: which councilor idxs were declared-targeted but the player missed (locked out from re-target). */
  votesLost: Set<number>;
  /** Sticky restrictions added each round (Boss 2 escalation). */
  escalationRestrictions: string[];
}

const PASS_THRESHOLD = 50;
const DEDUCTION_WIN_THRESHOLD = 60;
const ALLOCATION_VOTE_THRESHOLD = 60;
const ALLOCATION_VOTES_TO_WIN = 3;

function audById(id: string): Audience {
  const a = AUDIENCES.find((x) => x.id === id);
  if (!a) throw new Error(`Boss-match: unknown audience id ${id}`);
  return a;
}

// Escalation tier adds restrictions algorithmically each round (Boss 2).
// Round 1: base. Round 2: + 'min-foods:2'. Round 3: + 'min-foods:3' AND
// 'no-dairy' — forces the player to use a 3-food no-cheese plate, which
// is the meaningful escalation Royal Court tests (their stink-1 / musical-5
// craving is already hard to satisfy with a 3-food plate; banning dairy
// removes the easy "two cheese" path). Previously this used 'min-stink:3'
// which directly conflicted with Royal Court's stink-1 craving — the
// boss was mathematically unwinnable. Per CRITIC_v4_REVIEW.md / PLAN_v5
// P4, restrictions must compose with the underlying cravings, not fight
// them.
function escalationRestrictionsForRound(round: number): string[] {
  if (round <= 1) return [];
  if (round === 2) return ['min-foods:2'];
  return ['min-foods:3', 'no-dairy'];
}

export function createBossRunState(boss: Boss): BossRunState {
  return {
    bossId: boss.id,
    roundsRemaining: boss.rounds,
    results: [],
    audiencesPassed: new Set(),
    votes: new Set(),
    votesLost: new Set(),
    escalationRestrictions: [],
  };
}

export function evaluateBossRound(
  boss: Boss,
  state: BossRunState,
  launch: BossLaunchInput,
): BossRunState {
  const next: BossRunState = {
    bossId: state.bossId,
    roundsRemaining: Math.max(0, state.roundsRemaining - 1),
    results: [...state.results],
    audiencesPassed: new Set(state.audiencesPassed),
    votes: new Set(state.votes),
    votesLost: new Set(state.votesLost),
    escalationRestrictions: [...state.escalationRestrictions],
  };

  const launchIdx = state.results.length;

  switch (boss.skillKind) {
    case 'intersection': {
      const per: PerAudienceResult[] = boss.audiences.map((aid) => {
        const aud = audById(aid);
        const m: MatchResult = evaluateMatch(
          launch.propsAfterArea,
          launch.ingredientIds,
          aud.cravings,
          aud.restrictions,
          launch.quality,
        );
        const passed = m.pct >= PASS_THRESHOLD;
        if (passed) next.audiencesPassed.add(aid);
        return { audienceId: aid, pct: m.pct, passed, violations: m.violations };
      });
      next.results.push({
        ingredientIds: launch.ingredientIds,
        audienceResults: per,
        probeOnly: false,
      });
      break;
    }

    case 'escalation': {
      const round = launchIdx + 1;
      const addedRestrictions = escalationRestrictionsForRound(round);
      const aud = audById(boss.audiences[0]!);
      const mergedRestrictions = [
        ...(aud.restrictions ?? []),
        ...addedRestrictions,
      ];
      const m = evaluateMatch(
        launch.propsAfterArea,
        launch.ingredientIds,
        aud.cravings,
        mergedRestrictions,
        launch.quality,
      );
      const passed = m.pct >= PASS_THRESHOLD;
      next.results.push({
        ingredientIds: launch.ingredientIds,
        audienceResults: [{ audienceId: aud.id, pct: m.pct, passed, violations: m.violations }],
        probeOnly: false,
      });
      next.escalationRestrictions = addedRestrictions;
      break;
    }

    case 'prioritization': {
      const per: PerAudienceResult[] = boss.audiences.map((aid) => {
        const aud = audById(aid);
        const m = evaluateMatch(launch.propsAfterArea, launch.ingredientIds, aud.cravings, aud.restrictions, launch.quality);
        const passed = m.pct >= PASS_THRESHOLD;
        if (passed) next.audiencesPassed.add(aid);
        return { audienceId: aid, pct: m.pct, passed, violations: m.violations };
      });
      next.results.push({
        ingredientIds: launch.ingredientIds,
        audienceResults: per,
        probeOnly: false,
      });
      break;
    }

    case 'deduction': {
      const aud = audById(boss.audiences[0]!);
      const m = evaluateMatch(launch.propsAfterArea, launch.ingredientIds, aud.cravings, aud.restrictions, launch.quality);
      const passed = m.pct >= DEDUCTION_WIN_THRESHOLD;
      const isProbe = launchIdx === 0;
      next.results.push({
        ingredientIds: launch.ingredientIds,
        audienceResults: [{ audienceId: aud.id, pct: m.pct, passed, violations: m.violations }],
        probeOnly: isProbe,
      });
      break;
    }

    case 'resource-allocation': {
      const targetIdx = launch.targetAudienceIdx;
      // No-target launch = wasted (no vote earned, but a round consumed).
      if (targetIdx === null || targetIdx < 0 || targetIdx >= boss.audiences.length) {
        next.results.push({
          ingredientIds: launch.ingredientIds,
          audienceResults: [],
          probeOnly: false,
        });
        break;
      }
      // Already voted yes for this councilor OR already missed → invalid target.
      if (next.votes.has(targetIdx) || next.votesLost.has(targetIdx)) {
        next.results.push({
          ingredientIds: launch.ingredientIds,
          audienceResults: [],
          probeOnly: false,
        });
        break;
      }
      const aud = audById(boss.audiences[targetIdx]!);
      const m = evaluateMatch(launch.propsAfterArea, launch.ingredientIds, aud.cravings, aud.restrictions, launch.quality);
      const passed = m.pct >= ALLOCATION_VOTE_THRESHOLD;
      if (passed) next.votes.add(targetIdx);
      else next.votesLost.add(targetIdx);
      next.results.push({
        ingredientIds: launch.ingredientIds,
        audienceResults: [{ audienceId: aud.id, pct: m.pct, passed, violations: m.violations }],
        probeOnly: false,
      });
      break;
    }
  }

  return next;
}

export function isBossWon(boss: Boss, state: BossRunState): boolean {
  switch (boss.skillKind) {
    case 'intersection':
      // After the 1 launch, all 3 audiences must be in `audiencesPassed`.
      if (state.results.length === 0) return false;
      return boss.audiences.every((aid) => state.audiencesPassed.has(aid));

    case 'escalation':
      // All N rounds must have passed (rounds equal results count once complete).
      if (state.results.length < boss.rounds) return false;
      return state.results.every((r) => r.audienceResults[0]?.passed === true);

    case 'prioritization':
      // Need ≥2 of the 3 audiences passed (cumulative).
      return state.audiencesPassed.size >= 2;

    case 'deduction':
      // Win if any non-probe launch result hits the deduction threshold.
      return state.results.some((r, idx) => idx > 0 && r.audienceResults[0]?.passed === true);

    case 'resource-allocation':
      return state.votes.size >= ALLOCATION_VOTES_TO_WIN;
  }
}

export function isBossLost(boss: Boss, state: BossRunState): boolean {
  if (state.roundsRemaining > 0) return false;
  return !isBossWon(boss, state);
}
