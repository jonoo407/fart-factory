/**
 * Per-UTC-day 3-step quest for Story Mode. Per PR2.
 *
 * Story has a rotating audience but no "today's puzzle." This module
 * picks 3 steps from a small pool, seeded by the UTC date so every
 * player on the same day gets the same quest. Progress + claim state
 * persist per date key.
 *
 * Step kinds (v1 keeps the pool small — expand later when fatigue is
 * observed):
 *   - launch-ge-75:   land N launches at ≥75% match
 *   - plate-rare:     plate a rare+ food in any launch
 *   - use-treatment:  use any kitchen treatment on a launch
 *   - beat-any-boss:  win 1 boss
 *   - discover-recipe:discover N new recipes today
 *   - plate-legendary:plate a legendary food
 */

import { getFood } from './food';

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

const CLAIM_REWARD: ClaimReward = { gold: 25, notes: 10 };

const STEP_TEMPLATES: ReadonlyArray<{ kind: DailyQuestStepKind; target: number; label: string }> = [
  { kind: 'launch-ge-75',     target: 3, label: 'Land 3 launches at ≥75% match' },
  { kind: 'plate-rare',       target: 1, label: 'Plate a rare-or-better food' },
  { kind: 'use-treatment',    target: 1, label: 'Use any Kitchen treatment' },
  { kind: 'beat-any-boss',    target: 1, label: 'Defeat any boss' },
  { kind: 'discover-recipe',  target: 1, label: 'Discover a new recipe' },
  { kind: 'plate-legendary',  target: 1, label: 'Plate a legendary food' },
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

/** Pick 3 distinct step kinds for the given date. */
export function pickDailySteps(key: string): DailyQuestStep[] {
  const rand = mulberry32(seedFromDateKey(key));
  const pool = [...STEP_TEMPLATES];
  const out: DailyQuestStep[] = [];
  while (out.length < 3 && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    const t = pool[idx]!;
    out.push({ kind: t.kind, target: t.target, progress: 0, label: t.label });
    pool.splice(idx, 1);
  }
  return out;
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
  const quest: DailyQuest = { dateKey: key, steps: pickDailySteps(key), claimed: false };
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
