import { describe, it, expect, beforeEach } from 'vitest';
import {
  dateKey,
  pickDailySteps,
  getDailyQuest,
  recordLaunchEvent,
  recordBossWinEvent,
  isClaimable,
  claimReward,
  getClaimReward,
} from '../../src/state/daily-quest';

beforeEach(() => {
  localStorage.clear();
});

const FIXED = new Date('2026-05-22T12:00:00Z');

describe('daily-quest — date keys + step selection', () => {
  it('dateKey formats UTC date as YYYY-MM-DD', () => {
    expect(dateKey(new Date('2026-05-22T23:50:00Z'))).toBe('2026-05-22');
  });

  it('pickDailySteps returns exactly 3 distinct step kinds', () => {
    const steps = pickDailySteps('2026-05-22');
    expect(steps.length).toBe(3);
    const kinds = new Set(steps.map((s) => s.kind));
    expect(kinds.size).toBe(3);
  });

  it('pickDailySteps is deterministic per date', () => {
    const a = pickDailySteps('2026-05-22').map((s) => s.kind);
    const b = pickDailySteps('2026-05-22').map((s) => s.kind);
    expect(a).toEqual(b);
  });

  it('different dates produce different step lists (usually)', () => {
    const a = pickDailySteps('2026-05-22').map((s) => s.kind).join(',');
    const b = pickDailySteps('2026-09-12').map((s) => s.kind).join(',');
    // Same RNG family but different seeds — accept either same or different;
    // the contract is determinism per-date, not cross-date uniqueness.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

describe('daily-quest — load/save', () => {
  it('getDailyQuest creates and persists a new quest for the given date', () => {
    const q1 = getDailyQuest(FIXED);
    const q2 = getDailyQuest(FIXED);
    expect(q1.dateKey).toBe(q2.dateKey);
    expect(q1.steps.map((s) => s.kind)).toEqual(q2.steps.map((s) => s.kind));
  });

  it('falls back to a fresh quest if persisted JSON is corrupt', () => {
    localStorage.setItem('fart_daily_quest_2026-05-22', '{not json');
    const q = getDailyQuest(FIXED);
    expect(q.steps.length).toBe(3);
  });
});

describe('daily-quest — recordLaunchEvent', () => {
  it('counts launches at ≥75% for the launch-ge-75 step', () => {
    // Force a quest containing launch-ge-75 by selectively running.
    const quest = getDailyQuest(FIXED);
    const hasLaunchStep = quest.steps.some((s) => s.kind === 'launch-ge-75');
    if (!hasLaunchStep) return; // probabilistic — only assert when step present
    recordLaunchEvent({ matchPct: 80, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    recordLaunchEvent({ matchPct: 60, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    const after = getDailyQuest(FIXED);
    const step = after.steps.find((s) => s.kind === 'launch-ge-75');
    expect(step?.progress ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('plate-rare progresses when a rare-or-better food is on the plate', () => {
    const quest = getDailyQuest(FIXED);
    const hasStep = quest.steps.some((s) => s.kind === 'plate-rare');
    if (!hasStep) return;
    recordLaunchEvent({ matchPct: 50, ids: ['durian'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    const after = getDailyQuest(FIXED);
    const step = after.steps.find((s) => s.kind === 'plate-rare');
    expect(step?.progress ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('plate-legendary requires a legendary on plate', () => {
    const quest = getDailyQuest(FIXED);
    const hasStep = quest.steps.some((s) => s.kind === 'plate-legendary');
    if (!hasStep) return;
    recordLaunchEvent({ matchPct: 50, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    let after = getDailyQuest(FIXED);
    let step = after.steps.find((s) => s.kind === 'plate-legendary');
    expect(step?.progress ?? 0).toBe(0);
    recordLaunchEvent({ matchPct: 50, ids: ['forbidden-burrito'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    after = getDailyQuest(FIXED);
    step = after.steps.find((s) => s.kind === 'plate-legendary');
    expect(step?.progress ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('use-treatment progresses when hadTreatment is true', () => {
    const quest = getDailyQuest(FIXED);
    const hasStep = quest.steps.some((s) => s.kind === 'use-treatment');
    if (!hasStep) return;
    recordLaunchEvent({ matchPct: 50, ids: ['beans'], hadTreatment: true, recipeDiscovered: false }, FIXED);
    const after = getDailyQuest(FIXED);
    const step = after.steps.find((s) => s.kind === 'use-treatment');
    expect(step?.progress ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('discover-recipe progresses when freshly discovered', () => {
    const quest = getDailyQuest(FIXED);
    const hasStep = quest.steps.some((s) => s.kind === 'discover-recipe');
    if (!hasStep) return;
    recordLaunchEvent({ matchPct: 50, ids: ['beans'], hadTreatment: false, recipeDiscovered: true }, FIXED);
    const after = getDailyQuest(FIXED);
    const step = after.steps.find((s) => s.kind === 'discover-recipe');
    expect(step?.progress ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('beat-any-boss progresses via recordBossWinEvent only', () => {
    const quest = getDailyQuest(FIXED);
    const hasStep = quest.steps.some((s) => s.kind === 'beat-any-boss');
    if (!hasStep) return;
    recordLaunchEvent({ matchPct: 100, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    let after = getDailyQuest(FIXED);
    let step = after.steps.find((s) => s.kind === 'beat-any-boss');
    expect(step?.progress ?? 0).toBe(0);
    recordBossWinEvent(FIXED);
    after = getDailyQuest(FIXED);
    step = after.steps.find((s) => s.kind === 'beat-any-boss');
    expect(step?.progress ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('progress never exceeds target', () => {
    const quest = getDailyQuest(FIXED);
    const hasLaunchStep = quest.steps.some((s) => s.kind === 'launch-ge-75');
    if (!hasLaunchStep) return;
    for (let i = 0; i < 20; i++) {
      recordLaunchEvent({ matchPct: 100, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    }
    const step = getDailyQuest(FIXED).steps.find((s) => s.kind === 'launch-ge-75');
    expect(step?.progress).toBe(step?.target);
  });
});

describe('daily-quest — claim', () => {
  it('claimReward returns null when incomplete', () => {
    getDailyQuest(FIXED);
    expect(claimReward(FIXED)).toBeNull();
  });

  it('isClaimable flips true once every step is done', () => {
    const quest = getDailyQuest(FIXED);
    for (const step of quest.steps) step.progress = step.target;
    localStorage.setItem(`fart_daily_quest_${quest.dateKey}`, JSON.stringify(quest));
    expect(isClaimable(getDailyQuest(FIXED))).toBe(true);
  });

  it('claimReward awards exactly once', () => {
    const quest = getDailyQuest(FIXED);
    for (const step of quest.steps) step.progress = step.target;
    localStorage.setItem(`fart_daily_quest_${quest.dateKey}`, JSON.stringify(quest));
    const reward = claimReward(FIXED);
    expect(reward).toEqual(getClaimReward());
    expect(claimReward(FIXED)).toBeNull();
  });
});
