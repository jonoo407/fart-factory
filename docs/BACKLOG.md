# Engagement Backlog

Ideas approved in the "make the gameplay fun and engaging" pass but deferred
behind the flagship ("The Live Show": live crowd read + Danger Zone). Each
entry notes the hook point in the current codebase so it can be picked up
without re-discovery. Tone ceiling for all of these: family-friendly silly —
fainting grannies fine, nothing gross-out.

## Baron von Toot (rival performer)
A recurring rival who shows up at key venues, posts his score on the SAME
crowd, and trash-talks until you beat it. Gives the venue climb a face.
- Hook: `src/ui/intermission.ts` (appears between encounters) + per-audience
  best-match storage in `src/state/persistence.ts` (`bumpBestMatch`).

## Hype streak multiplier
Consecutive strong shows (≥75%) build a hype multiplier on gold; a flop
resets it. "One more show" session momentum.
- Hook: `src/scoring/streak.ts` already tracks launch streaks;
  `awardGoldForEncounter` (`src/scoring/reward.ts`) is where the multiplier
  would fold in. NB: the Danger Zone misfire already breaks the streak
  (`resolveMisfire` in `src/ui/plate.ts`) — keep that interaction in mind.

## Encore (double-or-nothing)
After a wowed show, the crowd demands an encore with a TWISTED version of
their craving. Accept for double gold or walk away safe.
- Hook: `advanceToNextEncounter` in `src/ui/plate.ts` already claims the
  passive encore bonus (`ENCORE_BONUS_GOLD`) — replace the flat bonus with
  the offer. Craving twist can reuse the boss escalation logic
  (`src/scoring/boss-match.ts`).

## Daily Challenge
A seeded daily audience + restricted pantry — every player gets the same
puzzle. Streak calendar + special reward.
- Hook: extend `src/state/daily-quest.ts`; seeding via the mulberry32
  UTC-day pattern the shop already uses (`src/ui/shop.ts`).

## Moments album
Rare critical moments (crowd member faints, standing ovation, granny drops
her knitting) collected in a notebook tab.
- Hook: roll + record in `src/ui/reaction-overlay.ts` /
  `src/state/conquests.ts`; display as a Lab Notebook section
  (`src/ui/notebook.ts`).

## Live Show v2 follow-ups
- Boss arena support for the live crowd read (excluded in v1 — see
  `updateLiveCrowdRead` in `src/ui/plate.ts`).
- Keyboard path for the Danger Zone (keyboard activation is a safe tap in
  v1 — see `onKey` in `src/ui/charge-meter.ts`).
- Bake real `murmur-warm` / `murmur-cold` / `misfire-squeak` clips into the
  SFX bank (currently manifest-gated silent no-ops; the misfire squeak
  falls back to a tiny high-musical clip from the existing fart bank).
