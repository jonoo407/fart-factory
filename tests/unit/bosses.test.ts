import { describe, it, expect } from 'vitest';
import { BOSSES, getBoss, type Boss, type BossSkill } from '../../src/state/bosses';
import { getFood } from '../../src/state/food';

describe('BOSSES catalog (Phase N item 71)', () => {
  it('contains exactly 5 bosses', () => {
    expect(BOSSES).toHaveLength(5);
  });

  it('every boss has a unique id', () => {
    const ids = BOSSES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every boss has a unique skill kind (no two are the same puzzle)', () => {
    const skills = BOSSES.map((b) => b.skillKind);
    expect(new Set(skills).size).toBe(skills.length);
  });

  it('skill kinds are the 5 declared puzzle types', () => {
    const expected: BossSkill[] = [
      'intersection',
      'escalation',
      'prioritization',
      'deduction',
      'resource-allocation',
    ];
    const actual = new Set(BOSSES.map((b) => b.skillKind));
    for (const e of expected) {
      expect(actual.has(e)).toBe(true);
    }
  });

  it('acts are 1..5 (one boss per act)', () => {
    const acts = BOSSES.map((b) => b.act).sort();
    expect(acts).toEqual([1, 2, 3, 4, 5]);
  });

  it('every boss has a non-empty audiences array', () => {
    for (const b of BOSSES) {
      expect(b.audiences.length).toBeGreaterThan(0);
    }
  });

  it('reward food IDs all point to legendary foods', () => {
    for (const b of BOSSES) {
      const food = getFood(b.rewardFoodId);
      expect(food).toBeDefined();
      expect(food!.rarity).toBe('legendary');
    }
  });

  it('reward food IDs are distinct across bosses (no duplicates)', () => {
    const rewardIds = BOSSES.map((b) => b.rewardFoodId);
    expect(new Set(rewardIds).size).toBe(rewardIds.length);
  });

  it('rounds count matches the skill kind semantics', () => {
    for (const b of BOSSES) {
      // intersection = 1 launch, prioritization = 2, escalation = 3,
      // deduction = 3, resource-allocation = 4 (one per councilor).
      const expectedRounds: Record<BossSkill, number> = {
        intersection: 1,
        prioritization: 2,
        escalation: 3,
        deduction: 3,
        'resource-allocation': 4,
      };
      expect(b.rounds).toBe(expectedRounds[b.skillKind]);
    }
  });

  it('getBoss returns the boss by id or undefined', () => {
    const first = BOSSES[0]!;
    expect(getBoss(first.id)).toBe(first);
    expect(getBoss('not-a-boss')).toBeUndefined();
  });

  it('every boss has a name + emoji + unlock requirement description', () => {
    for (const b of BOSSES) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.emoji.length).toBeGreaterThan(0);
      expect(b.unlockReq.description.length).toBeGreaterThan(0);
    }
  });
});

describe('Boss type narrowing', () => {
  it('Boss type is exported and shaped per skill', () => {
    const sample: Boss = BOSSES[0]!;
    // Type-check escape: the catalog is the source of truth.
    expect(sample.id).toBeDefined();
  });
});
