# PLAN v7 — Gameplay depth + fun

**Context:** `docs/CRITIC_v6_GAMEPLAY.md` identified 12 gameplay gaps. Top 5 — no loot, no critical success/failure, no streaks, weak power moments, opaque cause→effect — drive this overnight plan. Target: ~5-6h across 4 implementation tiers + smoke + merge.

**User priorities to address:**
- Progression — loot accumulation, mastery progression
- Funny — visual comedy, exaggerated reactions
- Player choice matters — binding decisions occasionally
- Discovery — hidden combos, Easter eggs
- Rewards / feedback — clear, punchy, exciting
- Challenge / mastery — visible per-food mastery + streak goal
- Cause→effect — show the math
- Thrill of danger — critical failure tier
- Power — cinematic legendary launches
- Skill — mastery rewards
- Loot — random drops + accumulation

---

## Tier 1 — Punchy feedback (~1h)

Address: cause→effect opacity, critical success/failure missing, visual joy.

### T1.1 — Per-axis match breakdown
In the result panel, show per-axis cost lines:
```
Stink: ⭐⭐⭐ (you 5 / wanted 3) → -2 pts
Wet:   ⭐⭐⭐ (you 0 / wanted 1) → matched
Length: ⭐⭐⭐ (you 4 / wanted 3) → matched
```
- New `evaluateMatchVerbose(props, target)` that returns per-axis contributions.
- New `renderMatchBreakdown(result)` in the result panel.
- Tests: unit verify per-axis math; e2e verify breakdown renders.

### T1.2 — Critical tiers
- `match >= 95%` → "💯 PERFECT!" with confetti animation + bonus +5 gold + brief screen-pause.
- `match >= 75%` → "🔥 GREAT!" with sparkle particles.
- `match <= 15%` AND `restriction violations >= 2` → "💥 DISASTER!" with comedy slapstick (audience runs in 4 directions) + bonus +5 notes (failure-is-funny consolation).
- Each tier has CSS animation classes + sound (uses Phase K legendary-fanfare for perfect; new disaster-sound seed for disaster).
- Add to result panel + audience reaction strip.

### T1.3 — Comedic reaction particles
When the audience reacts, spawn 8-12 emoji particles:
- `loved`: 😍 ❤️ 🎉 — float upward, fade
- `liked`: 🙂 ✨ — gentle drift
- `meh`: 😐 — slow blink (no particles)
- `disliked`: 🤢 💦 — drip downward
- `evacuated`: 💀 🏃 — scatter outward
- CSS-only animation per tier; spawn limited (≤12 nodes); respect reduced-motion.

---

## Tier 2 — Loot + streaks + mastery (~2h)

Address: no loot, no streaks, no mastery — the THREE biggest gaps.

### T2.1 — Random food drops on critical success
On a `match >= 95%`, roll a chance to drop a random NOT-YET-UNLOCKED food (any rarity, weighted toward common/uncommon).
- Drop chance: 30% on PERFECT, 60% on PERFECT with a legendary food on plate.
- Drop animation: "✨ The audience handed you: 🌶 Hot Pepper" splash.
- Adds the food to pantry directly.
- New unit module `src/scoring/loot-drops.ts`.

### T2.2 — Streak system
- Persisted state: `fart_streak_count` (consecutive ≥75% launches).
- Reset to 0 on launch <75%.
- Visible counter near the audience-reaction strip: "🔥 Streak: 3".
- Streak >= 3 → next gold reward is +50% (multiplicative with existing multipliers).
- Streak >= 5 → +100%.
- Streak >= 10 → "LEGENDARY STREAK" banner.

### T2.3 — Per-food mastery
- Persisted state: `fart_food_mastery_<id>` = count of uses (across all launches).
- Mastery level: 0 (Novice), 10 (Apprentice), 25 (Adept), 50 (Master), 100 (Legendary).
- Master-tier and above: that food gives +1 to its highest property axis.
- Notebook "Pantry" view (new tab) shows each food with its mastery level + progress bar.
- Increment on every launch that includes the food.
- Unit tests: level thresholds, +1 effect application.

---

## Tier 3 — Power moments + boss trophies (~1.5h)

Address: weak power moments, toothless boss losses, no replay/show-off.

### T3.1 — Cinematic legendary launches
When `>=2 legendary foods` are on the plate at launch:
- Trigger "ULTIMATE LAUNCH" full-screen overlay.
- Dim screen, oversized fart emoji, slowmo SFX (Phase K legendary-fanfare).
- 2.5s sequence before normal result panel appears.
- Special bonus: +10 gold + +5 notes.

### T3.2 — Boss trophies
Every boss win adds a Trophy to a new "Hall of Fame" persisted list:
- `fart_trophies: Trophy[]` where Trophy = { bossId, defeatedAt, plateUsed, matchPct }.
- New "🏆 Trophies" section in the notebook.
- Visible to the player; provides a sense of accumulated accomplishment.

### T3.3 — Boss-loss "salt"
On boss defeat, the boss talks trash:
- "Granny shakes her head: 'I expected more from you, dear.'"
- "Royal Court: 'Peasant. We shall not see thee again for at least 3 performances.'"
- 5 per-boss snark lines.
- Adds emotional sting to the failure (the user listed "thrill of danger").

---

## Tier 4 — Hidden secrets + Easter eggs (~1h)

Address: no discovery beyond recipes, no Easter eggs.

### T4.1 — Hidden plate combos
3 special "stupid" combos trigger named hidden events:
- All-cheese plate (4 cheeses, somehow — uses kitchen ferment to duplicate? OR cheese × 4 by re-plating in arena) → "🧀 CHEESEPOCALYPSE" — guaranteed legendary drop.
- Plate of 1 single food repeated 4 times via the Cook button — "🍻 BENDER" — discover "Gluttony" recipe.
- Plate using ALL legendary foods you own — "👑 LEGENDARY ALIGNMENT" — guaranteed PERFECT match against any audience.

Implementation note: the system already supports same-food-multiple-slots through `addFoodToPlate`. New `detectHiddenCombo(ids)` in scoring layer.

### T4.2 — Easter-egg hidden audience
1% chance per encounter to roll the "🦄 Mystery Unicorn" — a never-otherwise-encountered audience with weird cravings. Guaranteed legendary drop on ≥50% match.
- Unique flavor text, one-time-only-per-save (after first encounter, can recur but no longer drops).
- Always a comedy beat: "A unicorn wanders in. It's chewing a daisy. It does not appear to have come for the show."

---

## Tier 5 — Smoke + push (~30m)

- Full unit + e2e regression.
- Visual smoke via Preview MCP (or curl): verify a critical-success animation actually fires, streak counter increments, hidden combo triggers.
- Commit phases.
- Push expansion-v4.
- If clean, merge expansion-v4 → main. Auto-deploys to Pages for AM play.

---

## Estimated effort

| Tier | Items | Time |
|---|---|---|
| 1 — Punchy feedback | 3 | ~1h |
| 2 — Loot + streaks + mastery | 3 | ~2h |
| 3 — Power moments | 3 | ~1.5h |
| 4 — Hidden secrets | 2 | ~1h |
| 5 — Smoke + push + merge | — | ~30m |
| **Total** | 11 items | **~6h** |

Has slack for the 3h+ overnight run; can stop early after T1 + T2 if running long and merge with just those.

---

## Execution rules

- TDD red→green for every item.
- Each tier commits independently; never break the test suite.
- After T1, T2, T3 separately re-run full e2e + unit; abort tier if regression.
- Final smoke + merge happens only if all tests pass.

If a tier fails irrecoverably, revert that tier and merge what's stable. Better to ship 2 solid tiers than 4 broken ones.
