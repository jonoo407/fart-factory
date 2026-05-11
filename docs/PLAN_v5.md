# PLAN v5 — Fix the v4 build to actually be 8+

**Status:** Design plan only — not yet started.
**Context:** `docs/CRITIC_v4_REVIEW.md` graded the post-v4 build at honest **5-6/10** (vs. claimed 9.5). This plan is the punch list to close the gap. Roughly **20 hours** across 4 tiers, 16 items.

---

## Why this plan exists

The v4 PR shipped a lot of architecture. It also shipped 3 functional blockers, a broken tutorial, and ~12 promised audio cues that were never generated. The build is **structurally solid** (Quality 8) but **experientially incomplete** (Fun 5-6).

This plan is **not new features**. Every item closes a specific axis-score deficit or hard-gate borderline-failure from the critic review. After this plan ships, the honest v5 score should hit 8+.

---

## Tier 1 — Blockers (~4h, 4 items)

These must ship before claiming the build is in any sensible "playable" state. Order: P1 → P2 → P3 → P4.

### P1. Wire Kitchen treatments into launch math (~2h)

**Bug:** `onStoryLaunch` calls `computeFartFromPlate(ids)` and ignores `loadPlateTreatments()`. Kitchen Mode is decorative.

**Fix:**
1. In `onStoryLaunch` (`src/ui/plate.ts:~482`):
   - Read `loadPlateTreatments()` from `kitchen.ts`.
   - If the treatments array is non-empty AND matches `ids.length`, build `PreppedSlot[]` and call `computeFartFromPreppedPlate` instead.
   - Clear treatments via `clearPlateTreatments()` after launch (one-shot consumption).
2. Add a regression test (`tests/e2e/kitchen-launch.spec.ts`): toggle Kitchen Mode → open Kitchen → plate beans with treatment=Roast → Send to Performance → click Launch → verify the launched fart has higher stink than an identical raw-beans launch (deterministic delta).
3. Add a unit test in `treatment-math.test.ts` confirming the launch path produces a different score for treated vs. raw plates.

**Acceptance:** Decision Quality lifts from 7 → 9. System Integration lifts from 5 → 8.

---

### P2. Rewrite the onboarding flow for the food game (~1.5h)

**Bug:** [src/ui/onboarding.ts:11](src/ui/onboarding.ts) tutorial says "Move the six sliders" — describes the v2 slider game, not Story Mode (the v4 default).

**Fix:** Replace the 3 v2 steps with 5 food-game steps:
1. "Welcome, Fart Scientist! Today, the [audience] is in town."
2. "Check what they want — see the cravings panel."
3. "Pick foods from the pantry that match. Each food costs belly."
4. "Pick where to launch. Each location boosts different properties."
5. "🚀 LAUNCH! High match% → gold. Low match% → research notes. Both progress you."

Add: a "Show me later" link in the result panel that re-runs the tutorial.

Add: a separate "Sandbox Mode tour" if the player toggles to slider game (one screen explaining "this is the original game; toggle back via the 🍴 button up top").

**Acceptance:** Bushnell Floor=Ceiling gate clears unambiguously. New-player 30-second test: "I plated something and got a percentage and some gold."

---

### P3. Generate the 12 Phase K SFX (~30m operator + ~10m commit)

**Bug:** SFX manifest is at 14 entries (v2). Phase K added 12 seeds (audience reactions × 6, food-eating × 4, fanfare × 2). Mp3s were never generated.

**Fix:**
1. **Operator action:** set ElevenLabs API key, run `npm run sfx:generate`.
2. Commit the resulting mp3s to `public/sfx/`.
3. Update `tests/e2e/sfx-library.spec.ts` to assert ≥24 entries (up from 12).
4. Wire audio playback at the four event types:
   - `boss-arena.ts` `applyReactionFace(tier)` → play matching audience-reaction SFX.
   - `kitchen.ts` `tryAddToPrep` + plate `addFoodToPlate` → play `food-munch` / `-crunch` / `-slurp` / `-gulp` randomly.
   - `plate.ts` `flashLegendaryFanfare` → play `legendary-fanfare`.
   - `boss-reward.ts` `dispatchBossReward` → play `quest-claimed` on victory.

**Acceptance:** Game Feel lifts from 5 → 7+. Feedback Gate unambiguously clears.

---

### P4. Make Boss 2 (Royal Court) winnable (~1h, depends on P1)

**Bug:** Royal Court craves stink=1, but round-3 restriction is min-stink:3. Without treatments at launch, the conflict cannot be bridged.

**Fix:**
- P1 fixes the underlying treatment-at-launch problem. Once P1 ships, the player CAN bridge the conflict (chill a high-stink food to reduce stink without removing it from the plate).
- Add a UI hint in the Boss 2 arena: "💡 Tip: Royal Court hates wet, loves musical. Late rounds add restrictions — treatments may help."
- Update `tests/unit/boss-smoke.test.ts` for Boss 2: assert `isBossWon === true` when the player plates a treated plate with appropriate properties.

**Acceptance:** Boss 2 has a documented winning strategy; smoke test asserts it works.

---

## Tier 2 — UX & First-30-Seconds (~5.5h, 4 items)

After Tier 1, the game is playable. Tier 2 makes it learnable.

### P5. Mobile-first map + progression strip (~2h)

**Issue:** Map's 20 pins crowd a 375px-wide phone. Progression strip's 7 elements overflow.

**Fix:**
- Map: at viewport ≤ 600px, switch to a list view (5 expandable region sections, each listing its 4 locations). Add a small "view map" toggle for desktop-look.
- Progression strip: collapse less-frequent actions (Kitchen-Mode toggle, Research counter) into a "⋮ More" menu at viewport ≤ 600px.
- Re-enable `tests/e2e/touch-targets.spec.ts` for mobile project; fix any sub-44×44px elements.

**Acceptance:** Touch & Tap visual axis lifts from 5 → 8. Mobile e2e clears.

---

### P6. Recipe-discovery splash (~1h)

**Issue:** Discovery is currently a small line in the result panel. Players miss it.

**Fix:** When `discoveryResult.freshlyDiscovered === true`, render a center-screen ribbon ("✨ NEW RECIPE DISCOVERED: 🐊 Swamp Beast!") that animates in from below and auto-dismisses after 3s. Add the `discovery-pulse` keyframe.

**Acceptance:** Surprise & Delight axis lifts from 6 → 8.

---

### P7. First-launch difficulty hints (~1h)

**Issue:** New players don't know what plate properties map to what foods. The cravings panel says "Wants: stinky 3/5 · long 3/5" but a 7-year-old doesn't know which foods are stinky.

**Fix:** For the first 3 launches of a fresh save, add a hint banner: "Try [emoji emoji] for [stinky / long / wet] properties." Compute the 2-3 top-recommended foods from the pantry. Hide after 3 launches OR after the player matches ≥60% once.

**Acceptance:** Bushnell Floor cleanly defined. Skill Curve from 6 → 8.

---

### P8. Boss arena entrance audio + visual moment (~1h, depends on P3)

**Issue:** The arena entrance animation fires but is silent. Bosses are the biggest "peak moments" — they deserve audio.

**Fix:**
- Add 5 boss-specific entrance SFX seeds (granny-warmth / royal-fanfare / haunted-howl / volcano-rumble / cosmic-hum) to `scripts/sfx-seeds.ts`.
- Operator regenerates audio.
- `boss-arena.ts` `openArena` plays the per-boss entrance sample.

**Acceptance:** Bosses feel cinematic. Game Feel axis fully cleared.

---

## Tier 3 — Depth Polish (~5.5h, 4 items)

After Tiers 1+2 the game is solid. Tier 3 makes it memorable.

### P9. Kitchen Mode auto-unlock + celebratory toast (~1h)

**Issue:** Kitchen Mode is opt-in but discoverability is zero — most players will never enable it.

**Fix:** After 5 launches with ≥50% match (visible progress), auto-flip Kitchen Mode ON and show a toast: "🍳 New: Kitchen Mode unlocked! Roast, chill, and ferment your foods for advanced launches."

**Acceptance:** Progression axis lifts; treatment-system has organic discoverability.

---

### P10. Audience reactions in flavor text (~30m)

**Issue:** Currently the audience-reaction strip shows "😍 The audience LOVES it!" — generic. The audience has a name and a personality (Granny Edna, Frat Bros, etc.) but the reaction text doesn't use it.

**Fix:** Add per-audience reaction templates: "Granny Edna chuckles politely." "The Frat Bros HOLLER." "The Royal Court averts their gaze in horror." Use the audience's personality.

**Acceptance:** Personality / Charm axis lifts from 7 → 9.

---

### P11. Per-region recipe tagging (~2h)

**Issue:** The `regionOfRecipe` function in `src/scoring/region-recipes.ts` hardcodes "hometown" for everything. The hint system tells players to "discover wilderness recipes" but no recipes are actually wilderness-tagged.

**Fix:**
- Add `region?: Region` field to the `Recipe` interface.
- Tag each of the 30 recipes:
  - Hometown (8): all the basic pre-known + early hidden.
  - City (4): kombucha-based + pickle-based.
  - Wilderness (5): hot-pepper + cabbage + onion-heavy.
  - Royal (4): cheese-aged + asparagus + opera-tier.
  - Cosmic (3): sky-bean + glowing-mushroom + multi-legendary.
  - Legendary (6): no region (cross-tier).
- Update `regionOfRecipe(id)` to return the tagged region.
- Update the hint to dynamically describe what foods to try.

**Acceptance:** Curiosity Gaps and Variation & Replay both lift; Map gains gameplay weight (not just visual variety).

---

### P12. GamePlus mode — actually do something on Boss 5 (~2h)

**Issue:** `setGamePlusUnlocked(true)` flips a flag after Boss 5; the flag is never read anywhere.

**Fix:** When GamePlus is unlocked:
- Daily audience rotation cycles 2× faster (1 new audience every 12 hours instead of 24).
- Restriction-rate doubles (audiences without restrictions in normal mode gain a 50% chance of a restriction).
- New "💎 Legendary Hot Spot" — one of the 6 legendary recipes' regions gets a 3× gold multiplier per day.
- Notebook adds a "New Game+ 🌌" badge.

**Acceptance:** Endgame has meaningful replay value. Goal Stacking axis fully cleared.

---

## Tier 4 — Audit & Measurement (~2.5h, 4 items)

The Quality v2 critic flagged several gates as "pending live measurement." Run them and fix what surfaces.

### P13. Run axe-core + Lighthouse (~1h)

Tools the Visual critic requires. Re-enable `tests/e2e/axe.spec.ts` if disabled; add a Lighthouse pass via CI. Fix any findings.

**Acceptance:** WCAG-Contrast, Layout-Thrash, CLS hard gates verified-clear.

---

### P14. Run `npm audit` (~10m + any fix time)

Quality critic's Audit-Vulnerability hard gate. Run, fix any high+ severity.

**Acceptance:** Audit Vulnerability gate verified-clear.

---

### P15. Mutation testing pass via Stryker (~1h)

Quality critic's Fake-Test gate. Run Stryker on `src/scoring/` (the highest-leverage logic). Fix any mutants that survive.

**Acceptance:** Fake-Test gate verified-clear; score-rules are mutation-tested.

---

### P16. Coverage check (~10m + writeup)

Run `npx vitest run --coverage`. Confirm per-file ≥80% line coverage. Document in `FINAL_REPORT_v4.md`.

**Acceptance:** Quality critic's coverage anchor cleared.

---

## Estimated total + ordering

| Tier | Hours | Cumulative | Notes |
|---|---|---|---|
| 1 (blockers) | 4h | 4h | Ship one PR after this — game becomes actually playable |
| 2 (UX) | 5.5h | 9.5h | Ship second PR — game becomes learnable + mobile |
| 3 (depth) | 5.5h | 15h | Ship third PR — game becomes memorable |
| 4 (audit) | 2.5h | 17.5h | Land in same PR as 3 if scope allows |

**Recommended split:** 3 PRs. PR-A = Tier 1 (the playable fix). PR-B = Tier 2 (the learnable fix). PR-C = Tier 3 + 4 (the polished fix).

---

## v5 score projection after each tier

| After | min_axis | mean_axes | Raw v5 | Gates |
|---|---|---|---|---|
| (current state) | 5 | 6.7 | **6** | Bushnell + Feedback borderline |
| Tier 1 done | 6 | 7.4 | **7** | All gates unambiguously clear |
| Tier 2 done | 7 | 7.8 | **7.4 → 7** | + mobile clear |
| Tier 3 done | 8 | 8.2 | **8** | + audit clear |
| Tier 4 done | 8 | 8.4 | **8.2 → 8** | full measurement |

This plan brings the build from honest 6 to honest 8. Reaching 9+ requires more than fixing what shipped — it requires the **content** lift (more audiences with stronger personality, more recipes, deeper boss arcs) that the user has been deferring. That's a PLAN_v6 conversation, not this one.

---

## Stop here for now

This plan is design only. Before any code changes, the user should:
1. Confirm Tier 1 is the priority (it should be — the build is currently advertising features that don't work).
2. Confirm audio generation operator-step is in-scope for the next session.
3. Decide whether Tier 4 ships in the same PR as Tier 3 or as a separate "audit pass."
