/**
 * Per-UTC-day 3-step quest for Story Mode. Per PR2 (+ deadlock guard).
 *
 * Story has a rotating audience but no "today's puzzle." This module
 * picks up to 3 steps from a small pool, seeded by the UTC date. Steps
 * the player cannot currently complete (boss not unlocked, no legendary
 * owned, kitchen mode not on, all recipes discovered) are filtered out
 * before the pick — no impossible quests for the day.
 *
 * Step kinds:
 *   - launch-ge-75:    land N launches at ≥75% match — always eligible
 *   - plate-rare:      plate a rare+ food — always eligible
 *   - use-treatment:   use any kitchen treatment — gated on kitchen mode
 *   - beat-any-boss:   win 1 boss — gated on ≥1 unlocked boss
 *   - discover-recipe: discover a new recipe — gated on ≥1 undiscovered
 *   - plate-legendary: plate a legendary food — gated on ≥1 owned
 */

import { getFood, FOODS } from './food';
import { loadPantry, loadDiscoveredRecipes } from './persistence';
import { RECIPES } from './recipes';
import { BOSSES } from './bosses';
import { isBossUnlocked } from './boss-progress';

export type DailyQuestStepKind =
  | 'launch-ge-75'
  | 'plate-rare'
  | 'use-treatment'
  | 'beat-any-boss'
  | 'discover-recipe'
  | 'plate-legendary';

export interface DailyQuestStep {
  kind: DailyQuestStepKind;
  target: number;
  progress: number;
  label: string;
}

export interface DailyQuest {
  dateKey: string; // YYYY-MM-DD
  steps: DailyQuestStep[];
  claimed: boolean;
}

export interface ClaimReward {
  gold: number;
  notes: number;
}

/**
 * What the player can actually accomplish today. Each step's predicate
 * reads a single flag. Undefined flags default to "eligible" so tests
 * that don't care about gating get the full pool.
 */
export interface QuestEligibility {
  /** ≥1 boss is currently unlocked (defeated bosses still count). */
  bossAvailable?: boolean;
  /** ≥1 legendary food is in the player's pantry. */
  legendaryOwned?: boolean;
  /** ≥1 recipe in RECIPES is not yet discovered. */
  undiscoveredRecipeExists?: boolean;
  /** Kitchen Mode is currently enabled. */
  kitchenAvailable?: boolean;
}

const CLAIM_REWARD: ClaimReward = { gold: 25, notes: 10 };

interface StepTemplate {
  kind: DailyQuestStepKind;
  target: number;
  label: string;
  /** Eligibility predicate. Undefined flag → eligible by default. */
  isEligible: (e: QuestEligibility) => boolean;
}

const STEP_TEMPLATES: ReadonlyArray<StepTemplate> = [
  // Always eligible — every player can attempt these.
  { kind: 'launch-ge-75',    target: 3, label: 'Land 3 launches at ≥75% match',
    isEligible: () => true },
  { kind: 'plate-rare',      target: 1, label: 'Plate a rare-or-better food',
    isEligible: () => true },
  { kind: 'discover-recipe', target: 1, label: 'Discover a new recipe',
    isEligible: (e) => e.undiscoveredRecipeExists ?? true },
  // Gated — these need a specific game-state milestone to be achievable today.
  { kind: 'use-treatment',   target: 1, label: 'Use any Kitchen treatment',
    isEligible: (e) => e.kitchenAvailable ?? true },
  { kind: 'beat-any-boss',   target: 1, label: 'Defeat any boss',
    isEligible: (e) => e.bossAvailable ?? true },
  { kind: 'plate-legendary', target: 1, label: 'Plate a legendary food',
    isEligible: (e) => e.legendaryOwned ?? true },
];

export function dateKey(d: Date = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function storageKey(key: string): string {
  return `fart_daily_quest_${key}`;
}

// Mulberry32 — deterministic, cheap.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDateKey(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Pick up to 3 distinct eligible step kinds for the given date.
 * If fewer than 3 step kinds are eligible the quest is shorter.
 * launch-ge-75 is always eligible, so the quest is never empty.
 */
export function pickDailySteps(
  key: string,
  eligibility: QuestEligibility = {},
): DailyQuestStep[] {
  const rand = mulberry32(seedFromDateKey(key));
  const pool = STEP_TEMPLATES.filter((t) => t.isEligible(eligibility));
  const out: DailyQuestStep[] = [];
  while (out.length < 3 && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    const t = pool[idx]!;
    out.push({ kind: t.kind, target: t.target, progress: 0, label: t.label });
    pool.splice(idx, 1);
  }
  return out;
}

const KITCHEN_MODE_KEY = 'fart_kitchen_mode';

/**
 * Compute eligibility from the current save state. Side-effectful via
 * localStorage reads; pure relative to its inputs (no mutation).
 */
export function computeQuestEligibility(): QuestEligibility {
  const pantry = new Set(loadPantry());
  const discovered = new Set(loadDiscoveredRecipes());
  const legendaryOwned = FOODS.some((f) => pantry.has(f.id) && f.rarity === 'legendary');
  const undiscoveredRecipeExists = RECIPES.some((r) => !discovered.has(r.id));
  const bossAvailable = BOSSES.some((b) => isBossUnlocked(b));
  let kitchenAvailable = false;
  try {
    kitchenAvailable = localStorage.getItem(KITCHEN_MODE_KEY) === 'true';
  } catch {
    kitchenAvailable = false;
  }
  return {
    bossAvailable,
    legendaryOwned,
    undiscoveredRecipeExists,
    kitchenAvailable,
  };
}

function isValidQuest(v: unknown): v is DailyQuest {
  if (!v || typeof v !== 'object') return false;
  const q = v as DailyQuest;
  if (typeof q.dateKey !== 'string') return false;
  if (typeof q.claimed !== 'boolean') return false;
  if (!Array.isArray(q.steps)) return false;
  return q.steps.every(
    (s) =>
      s &&
      typeof s.kind === 'string' &&
      typeof s.target === 'number' &&
      typeof s.progress === 'number' &&
      typeof s.label === 'string',
  );
}

export function getDailyQuest(d: Date = new Date()): DailyQuest {
  const key = dateKey(d);
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidQuest(parsed) && parsed.dateKey === key) return parsed;
    }
  } catch {
    // ignore
  }
  const quest: DailyQuest = {
    dateKey: key,
    steps: pickDailySteps(key, computeQuestEligibility()),
    claimed: false,
  };
  saveDailyQuest(quest);
  return quest;
}

function saveDailyQuest(quest: DailyQuest): void {
  try {
    localStorage.setItem(storageKey(quest.dateKey), JSON.stringify(quest));
  } catch {
    // ignore
  }
}

export interface LaunchEventPayload {
  matchPct: number;
  ids: string[];
  hadTreatment: boolean;
  recipeDiscovered: boolean;
}

/** Record a launch against today's quest. Returns the updated quest. */
export function recordLaunchEvent(payload: LaunchEventPayload, d: Date = new Date()): DailyQuest {
  const quest = getDailyQuest(d);
  if (quest.claimed) return quest;
  for (const step of quest.steps) {
    if (step.progress >= step.target) continue;
    switch (step.kind) {
      case 'launch-ge-75':
        if (payload.matchPct >= 75) step.progress = Math.min(step.target, step.progress + 1);
        break;
      case 'plate-rare':
        if (payload.ids.some((id) => isRareOrBetter(id))) {
          step.progress = Math.min(step.target, step.progress + 1);
        }
        break;
      case 'use-treatment':
        if (payload.hadTreatment) step.progress = Math.min(step.target, step.progress + 1);
        break;
      case 'discover-recipe':
        if (payload.recipeDiscovered) step.progress = Math.min(step.target, step.progress + 1);
        break;
      case 'plate-legendary':
        if (payload.ids.some((id) => getFood(id)?.rarity === 'legendary')) {
          step.progress = Math.min(step.target, step.progress + 1);
        }
        break;
      case 'beat-any-boss':
        // Recorded via recordBossWinEvent — no-op here.
        break;
    }
  }
  saveDailyQuest(quest);
  return quest;
}

export function recordBossWinEvent(d: Date = new Date()): DailyQuest {
  const quest = getDailyQuest(d);
  if (quest.claimed) return quest;
  for (const step of quest.steps) {
    if (step.kind === 'beat-any-boss' && step.progress < step.target) {
      step.progress = Math.min(step.target, step.progress + 1);
    }
  }
  saveDailyQuest(quest);
  return quest;
}

function isRareOrBetter(id: string): boolean {
  const r = getFood(id)?.rarity;
  return r === 'rare' || r === 'epic' || r === 'legendary';
}

export function isQuestComplete(quest: DailyQuest): boolean {
  return quest.steps.every((s) => s.progress >= s.target);
}

export function isClaimable(quest: DailyQuest): boolean {
  return !quest.claimed && isQuestComplete(quest);
}

/** Mark today's quest as claimed; returns the reward (or null if already claimed/incomplete). */
export function claimReward(d: Date = new Date()): ClaimReward | null {
  const quest = getDailyQuest(d);
  if (!isClaimable(quest)) return null;
  quest.claimed = true;
  saveDailyQuest(quest);
  return { ...CLAIM_REWARD };
}

export function getClaimReward(): ClaimReward {
  return { ...CLAIM_REWARD };
}
