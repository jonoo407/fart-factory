import { describe, it, expect, beforeEach } from 'vitest';
import {
  researchNotesForMatch,
  awardResearchForLaunch,
  RESEARCH_COSTS,
  attemptResearchUnlock,
  researchEligibleFoods,
} from '../../src/scoring/research';
import {
  loadResearchNotes,
  setResearchNotes,
  loadPantry,
  unlockFood,
} from '../../src/state/persistence';
import { getFood } from '../../src/state/food';

beforeEach(() => {
  localStorage.clear();
});

describe('researchNotesForMatch (Phase I item 55 — failure banks notes)', () => {
  it('awards 0 notes for matches >= 50', () => {
    expect(researchNotesForMatch(50)).toBe(0);
    expect(researchNotesForMatch(80)).toBe(0);
    expect(researchNotesForMatch(100)).toBe(0);
  });
  it('awards floor((100-pct)/20) for matches < 50', () => {
    expect(researchNotesForMatch(0)).toBe(5);
    expect(researchNotesForMatch(20)).toBe(4);
    expect(researchNotesForMatch(40)).toBe(3);
    expect(researchNotesForMatch(49)).toBe(2);
  });
  it('returns 0 for NaN / negative (defensive)', () => {
    expect(researchNotesForMatch(NaN)).toBe(0);
    expect(researchNotesForMatch(-50)).toBe(0);
  });
});

describe('awardResearchForLaunch (persistence wire-up)', () => {
  it('accumulates notes across low-match launches', () => {
    awardResearchForLaunch(20); // +4
    awardResearchForLaunch(40); // +3
    expect(loadResearchNotes()).toBe(7);
  });
  it('does not bank notes for high-match launches', () => {
    awardResearchForLaunch(75);
    expect(loadResearchNotes()).toBe(0);
  });
});

describe('RESEARCH_COSTS (per-rarity unlock cost in notes)', () => {
  it('uncommon < rare < epic', () => {
    expect(RESEARCH_COSTS.uncommon!).toBeLessThan(RESEARCH_COSTS.rare!);
    expect(RESEARCH_COSTS.rare!).toBeLessThan(RESEARCH_COSTS.epic!);
  });
  it('common is free (already unlocked) and legendary is quest-only', () => {
    expect(RESEARCH_COSTS.common).toBeUndefined();
    expect(RESEARCH_COSTS.legendary).toBeUndefined();
  });
});

describe('attemptResearchUnlock (Phase I item 56 — buy with research notes)', () => {
  it('refuses unknown food ids', () => {
    setResearchNotes(100);
    const r = attemptResearchUnlock('not-a-food');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown-food');
  });

  it('refuses already-unlocked foods', () => {
    setResearchNotes(100);
    unlockFood('kimchi');
    const r = attemptResearchUnlock('kimchi');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('already-unlocked');
    expect(loadResearchNotes()).toBe(100); // not deducted
  });

  it('refuses legendary foods (quest-only unlock path)', () => {
    setResearchNotes(1000);
    const r = attemptResearchUnlock('forbidden-burrito');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not-research-eligible');
  });

  it('refuses when notes are insufficient', () => {
    setResearchNotes(0);
    const r = attemptResearchUnlock('kimchi');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('insufficient-notes');
  });

  it('deducts notes and unlocks food on success', () => {
    setResearchNotes(100);
    const r = attemptResearchUnlock('kimchi');
    expect(r.ok).toBe(true);
    expect(loadPantry()).toContain('kimchi');
    expect(loadResearchNotes()).toBe(100 - RESEARCH_COSTS.uncommon!);
  });

  it('exact-cost boundary: notes == cost succeeds (to 0 balance); cost-1 fails', () => {
    const cost = RESEARCH_COSTS.uncommon!;
    setResearchNotes(cost - 1);
    const broke = attemptResearchUnlock('kimchi');
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.reason).toBe('insufficient-notes');
    setResearchNotes(cost);
    const exact = attemptResearchUnlock('kimchi');
    expect(exact.ok).toBe(true);
    expect(loadResearchNotes()).toBe(0);
  });
});

describe('researchEligibleFoods (panel listing)', () => {
  it('lists all uncommon/rare/epic foods not yet unlocked, with their notes cost', () => {
    const list = researchEligibleFoods();
    expect(list.length).toBeGreaterThan(0);
    for (const item of list) {
      const f = getFood(item.foodId)!;
      expect(['uncommon', 'rare', 'epic']).toContain(f.rarity);
      expect(item.cost).toBe(RESEARCH_COSTS[f.rarity]);
    }
  });

  it('excludes already-unlocked foods', () => {
    unlockFood('kimchi');
    const list = researchEligibleFoods();
    expect(list.map((i) => i.foodId)).not.toContain('kimchi');
  });

  it('never lists legendary foods', () => {
    const list = researchEligibleFoods();
    for (const item of list) {
      expect(getFood(item.foodId)?.rarity).not.toBe('legendary');
    }
  });
});
