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
  computeQuestEligibility,
  type DailyQuest,
  type DailyQuestStepKind,
  type QuestEligibility,
} from '../../src/state/daily-quest';

beforeEach(() => {
  localStorage.clear();
});

const FIXED = new Date('2026-05-22T12:00:00Z');
const FULL_ELIGIBILITY: QuestEligibility = {
  bossAvailable: true,
  legendaryOwned: true,
  undiscoveredRecipeExists: true,
  kitchenAvailable: true,
};

/**
 * Seed today's quest directly so kind-specific tests don't depend on the
 * random pick landing the target kind. The seeded quest passes
 * isValidQuest so getDailyQuest will return it as-is.
 */
function seedQuest(kinds: DailyQuestStepKind[], d: Date = FIXED): DailyQuest {
  const steps = kinds.map((kind) => ({
    kind,
    target: kind === 'launch-ge-75' ? 3 : 1,
    progress: 0,
    label: `seed ${kind}`,
  }));
  const quest: DailyQuest = { dateKey: dateKey(d), steps, claimed: false };
  localStorage.setItem(`fart_daily_quest_${quest.dateKey}`, JSON.stringify(quest));
  return quest;
}

describe('daily-quest — date keys + step selection', () => {
  it('dateKey formats UTC date as YYYY-MM-DD', () => {
    expect(dateKey(new Date('2026-05-22T23:50:00Z'))).toBe('2026-05-22');
  });

  it('pickDailySteps returns exactly 3 distinct step kinds with full eligibility', () => {
    const steps = pickDailySteps('2026-05-22', FULL_ELIGIBILITY);
    expect(steps.length).toBe(3);
    const kinds = new Set(steps.map((s) => s.kind));
    expect(kinds.size).toBe(3);
  });

  it('pickDailySteps is deterministic per date', () => {
    const a = pickDailySteps('2026-05-22', FULL_ELIGIBILITY).map((s) => s.kind);
    const b = pickDailySteps('2026-05-22', FULL_ELIGIBILITY).map((s) => s.kind);
    expect(a).toEqual(b);
  });

  it('omitted eligibility fields default to eligible', () => {
    const steps = pickDailySteps('2026-05-22');
    // With no eligibility object at all, all 6 templates are eligible → 3 picked.
    expect(steps.length).toBe(3);
  });
});

describe('daily-quest — deadlock guard (eligibility filtering)', () => {
  it('fresh-state player still gets a 3-step quest (no impossible deadlock)', () => {
    // Brand-new save: no boss, no legendary, no kitchen, recipes undiscovered.
    const eligibility: QuestEligibility = {
      bossAvailable: false,
      legendaryOwned: false,
      undiscoveredRecipeExists: true,
      kitchenAvailable: false,
    };
    const steps = pickDailySteps('2026-05-22', eligibility);
    expect(steps.length).toBe(3);
    const kinds = steps.map((s) => s.kind);
    expect(kinds).not.toContain('beat-any-boss');
    expect(kinds).not.toContain('plate-legendary');
    expect(kinds).not.toContain('use-treatment');
  });

  it('filters out beat-any-boss when no boss is available', () => {
    for (let day = 1; day <= 14; day++) {
      const key = `2026-06-${String(day).padStart(2, '0')}`;
      const steps = pickDailySteps(key, { bossAvailable: false });
      expect(steps.map((s) => s.kind)).not.toContain('beat-any-boss');
    }
  });

  it('filters out plate-legendary when no legendary owned', () => {
    for (let day = 1; day <= 14; day++) {
      const key = `2026-06-${String(day).padStart(2, '0')}`;
      const steps = pickDailySteps(key, { legendaryOwned: false });
      expect(steps.map((s) => s.kind)).not.toContain('plate-legendary');
    }
  });

  it('filters out use-treatment when kitchen is off', () => {
    for (let day = 1; day <= 14; day++) {
      const key = `2026-06-${String(day).padStart(2, '0')}`;
      const steps = pickDailySteps(key, { kitchenAvailable: false });
      expect(steps.map((s) => s.kind)).not.toContain('use-treatment');
    }
  });

  it('filters out discover-recipe once all recipes discovered', () => {
    for (let day = 1; day <= 14; day++) {
      const key = `2026-06-${String(day).padStart(2, '0')}`;
      const steps = pickDailySteps(key, { undiscoveredRecipeExists: false });
      expect(steps.map((s) => s.kind)).not.toContain('discover-recipe');
    }
  });

  it('worst-case quest can still produce 3 steps (only always-eligible + recipes)', () => {
    // Mid-game player: no boss/legendary/kitchen yet, recipes still to find.
    const steps = pickDailySteps('2026-05-22', {
      bossAvailable: false,
      legendaryOwned: false,
      kitchenAvailable: false,
      undiscoveredRecipeExists: true,
    });
    expect(steps.length).toBe(3);
  });

  it('extreme-late-game (everything done) still produces ≥1 step', () => {
    // The only always-on steps are launch-ge-75 and plate-rare.
    const steps = pickDailySteps('2026-05-22', {
      bossAvailable: false,
      legendaryOwned: false,
      kitchenAvailable: false,
      undiscoveredRecipeExists: false,
    });
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });
});

describe('daily-quest — computeQuestEligibility', () => {
  it('on empty state: boss/legendary/kitchen all false, recipes-undiscovered true', () => {
    const e = computeQuestEligibility();
    expect(e.bossAvailable).toBe(false);
    expect(e.legendaryOwned).toBe(false);
    expect(e.kitchenAvailable).toBe(false);
    expect(e.undiscoveredRecipeExists).toBe(true);
  });

  it('legendaryOwned flips true when a legendary is in pantry', () => {
    localStorage.setItem('fart_pantry', JSON.stringify(['forbidden-burrito']));
    expect(computeQuestEligibility().legendaryOwned).toBe(true);
  });

  it('kitchenAvailable flips true when fart_kitchen_mode is "true"', () => {
    localStorage.setItem('fart_kitchen_mode', 'true');
    expect(computeQuestEligibility().kitchenAvailable).toBe(true);
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
    // Fresh-state eligibility yields 3 steps (launch-ge-75 + plate-rare +
    // discover-recipe).
    expect(q.steps.length).toBe(3);
  });
});

describe('daily-quest — recordLaunchEvent (kind-specific)', () => {
  it('launch-ge-75 counts only launches at ≥75%', () => {
    seedQuest(['launch-ge-75']);
    recordLaunchEvent({ matchPct: 80, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    recordLaunchEvent({ matchPct: 60, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    const step = getDailyQuest(FIXED).steps.find((s) => s.kind === 'launch-ge-75')!;
    expect(step.progress).toBe(1);
  });

  it('plate-rare progresses on a rare-or-better plate', () => {
    seedQuest(['plate-rare']);
    recordLaunchEvent({ matchPct: 50, ids: ['durian'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    const step = getDailyQuest(FIXED).steps.find((s) => s.kind === 'plate-rare')!;
    expect(step.progress).toBe(1);
  });

  it('plate-rare does NOT progress for a common-only plate', () => {
    seedQuest(['plate-rare']);
    recordLaunchEvent({ matchPct: 50, ids: ['beans', 'cheese'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    const step = getDailyQuest(FIXED).steps.find((s) => s.kind === 'plate-rare')!;
    expect(step.progress).toBe(0);
  });

  it('plate-legendary requires a legendary on plate', () => {
    seedQuest(['plate-legendary']);
    recordLaunchEvent({ matchPct: 50, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    expect(getDailyQuest(FIXED).steps.find((s) => s.kind === 'plate-legendary')!.progress).toBe(0);
    recordLaunchEvent({ matchPct: 50, ids: ['forbidden-burrito'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    expect(getDailyQuest(FIXED).steps.find((s) => s.kind === 'plate-legendary')!.progress).toBe(1);
  });

  it('use-treatment progresses when hadTreatment is true', () => {
    seedQuest(['use-treatment']);
    recordLaunchEvent({ matchPct: 50, ids: ['beans'], hadTreatment: true, recipeDiscovered: false }, FIXED);
    expect(getDailyQuest(FIXED).steps.find((s) => s.kind === 'use-treatment')!.progress).toBe(1);
  });

  it('discover-recipe progresses when freshly discovered', () => {
    seedQuest(['discover-recipe']);
    recordLaunchEvent({ matchPct: 50, ids: ['beans'], hadTreatment: false, recipeDiscovered: true }, FIXED);
    expect(getDailyQuest(FIXED).steps.find((s) => s.kind === 'discover-recipe')!.progress).toBe(1);
  });

  it('beat-any-boss progresses via recordBossWinEvent only', () => {
    seedQuest(['beat-any-boss']);
    recordLaunchEvent({ matchPct: 100, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    expect(getDailyQuest(FIXED).steps.find((s) => s.kind === 'beat-any-boss')!.progress).toBe(0);
    recordBossWinEvent(FIXED);
    expect(getDailyQuest(FIXED).steps.find((s) => s.kind === 'beat-any-boss')!.progress).toBe(1);
  });

  it('progress never exceeds target', () => {
    seedQuest(['launch-ge-75']);
    for (let i = 0; i < 20; i++) {
      recordLaunchEvent({ matchPct: 100, ids: ['beans'], hadTreatment: false, recipeDiscovered: false }, FIXED);
    }
    const step = getDailyQuest(FIXED).steps.find((s) => s.kind === 'launch-ge-75')!;
    expect(step.progress).toBe(step.target);
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
