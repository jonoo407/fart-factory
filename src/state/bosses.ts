/**
 * Boss audience catalog. Per PLAN_v4.md §A.N — 5 boss audiences, each
 * testing a DIFFERENT cognitive skill (not just "harder cravings").
 *
 * Each boss has:
 *   - skillKind: the puzzle type they pose
 *   - audiences[]: one or more existing audience ids (varies by puzzle)
 *   - rounds: how many launches the player gets
 *   - unlockReq: a predicate evaluated against the player's save state
 *   - rewardFoodId: legendary food unlocked on first win
 *
 * The 5 puzzle types are deliberately disjoint:
 *   intersection      — one plate must satisfy 3 audiences simultaneously
 *   escalation        — same audience, 3 rounds with tightening restrictions
 *   prioritization    — 3 audiences, 2 launches, pick which 2 to please
 *   deduction         — cravings hidden, infer from probe-launch reaction tier
 *   resource-allocation — 4 councilors, declare target per launch, need 3/4
 */

import type { Audience } from './audience';
import { AUDIENCES } from './audience';

export type BossSkill =
  | 'intersection'
  | 'escalation'
  | 'prioritization'
  | 'deduction'
  | 'resource-allocation';

export type UnlockReqKind =
  | 'always'
  | 'recipes-discovered'
  | 'best-overall'
  | 'epic-foods-owned'
  | 'legendary-quest-claimed'
  | 'bosses-defeated';

export interface UnlockReq {
  kind: UnlockReqKind;
  target?: number;
  /** For 'legendary-quest-claimed': the food id whose quest must be claimed. */
  legendaryFoodId?: string;
  /** For 'bosses-defeated': the list of boss ids required (AND-joined). */
  requiredBossIds?: string[];
  /** Human-readable text shown in the notebook's Bosses tab. */
  description: string;
}

export interface Boss {
  id: string;
  name: string;
  emoji: string;
  act: 1 | 2 | 3 | 4 | 5;
  skillKind: BossSkill;
  /**
   * For intersection: 3 audience ids the plate must please simultaneously.
   * For escalation: 1 audience id (rounds add restrictions algorithmically).
   * For prioritization: 3 audience ids; need to please 2 of 3.
   * For deduction: 1 audience id (target hidden during play).
   * For resource-allocation: 4 audience ids; need 3/4 votes.
   */
  audiences: string[];
  /** Number of launches the player gets. */
  rounds: number;
  unlockReq: UnlockReq;
  rewardFoodId: string;
  flavor: string;
}

function refAud(id: string): Audience {
  const a = AUDIENCES.find((x) => x.id === id);
  if (!a) throw new Error(`Boss catalog references unknown audience: ${id}`);
  return a;
}

export const BOSSES: readonly Boss[] = [
  {
    id: 'granny-family-reunion',
    name: "Granny's Family Reunion",
    emoji: '👵',
    act: 1,
    skillKind: 'intersection',
    audiences: ['granny-edna', 'baby-shower', 'kindergarten'],
    rounds: 1,
    unlockReq: {
      kind: 'recipes-discovered',
      target: 10,
      description: 'Discover 10 recipes',
    },
    rewardFoodId: 'mystery-casserole',
    flavor: 'Three generations sitting around the table. Whatever you cook needs to please all of them — yes, even baby.',
  },
  {
    id: 'royal-court-escalation',
    name: 'The Royal Court Trial',
    emoji: '👑',
    act: 2,
    skillKind: 'escalation',
    audiences: ['royal-court'],
    rounds: 3,
    unlockReq: {
      kind: 'best-overall',
      target: 70,
      description: 'Defeat Granny\'s Family Reunion AND score ≥70% match somewhere',
      requiredBossIds: ['granny-family-reunion'],
    },
    rewardFoodId: 'sky-bean',
    flavor: 'Three rounds before the throne. The Court grows more discerning with each course. Bring your A-game.',
  },
  {
    id: 'haunted-three-ghosts',
    name: "The Mansion's Three Ghosts",
    emoji: '👻',
    act: 3,
    skillKind: 'prioritization',
    audiences: ['haunted-mansion', 'goth-teens', 'silent-monks'],
    rounds: 2,
    unlockReq: {
      kind: 'epic-foods-owned',
      target: 2,
      description: 'Defeat the Royal Court AND own 2 epic foods',
      requiredBossIds: ['royal-court-escalation'],
    },
    rewardFoodId: 'cursed-egg',
    flavor: 'Three ghosts hover above you. You only have breath for two more launches. Choose carefully which souls to satisfy.',
  },
  {
    id: 'volcano-cult-ritual',
    name: 'The Volcano Cult Ritual',
    emoji: '🌋',
    act: 4,
    skillKind: 'deduction',
    audiences: ['volcano-cult'],
    rounds: 3,
    unlockReq: {
      kind: 'legendary-quest-claimed',
      legendaryFoodId: 'glowing-mushroom',
      description: 'Defeat the Three Ghosts AND claim the Glowing Mushroom quest',
      requiredBossIds: ['haunted-three-ghosts'],
    },
    rewardFoodId: 'volcano-chili',
    flavor: 'The cult hides their true desires. Your first launch is a probe — read their reaction, then deliver.',
  },
  {
    id: 'cosmic-council-judgment',
    name: 'The Cosmic Council',
    emoji: '🌌',
    act: 5,
    skillKind: 'resource-allocation',
    audiences: ['alien-tourists', 'astronauts', 'mystery-guest', 'opera-house'],
    rounds: 4,
    unlockReq: {
      kind: 'bosses-defeated',
      requiredBossIds: [
        'granny-family-reunion',
        'royal-court-escalation',
        'haunted-three-ghosts',
        'volcano-cult-ritual',
      ],
      description: 'Defeat all 4 prior bosses',
    },
    rewardFoodId: 'forbidden-burrito',
    flavor: 'Four councilors. Four launches. You must declare your target before each — and earn at least 3 votes.',
  },
];

export function getBoss(id: string): Boss | undefined {
  return BOSSES.find((b) => b.id === id);
}

// Side-effect verification (throws at module-load if any boss references
// an unknown audience id, preventing silent catalog drift).
for (const b of BOSSES) {
  for (const audId of b.audiences) {
    refAud(audId); // throws on unknown
  }
}
