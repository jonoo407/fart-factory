# PLAN v4 — Three Major Feature Expansions

**Status:** Design plan only — not yet started.
**Context:** v3 food-mechanic game shipped 2026-05-10 (merge of [#3](https://github.com/jonoo407/fart-factory/pull/3)). User asked: "are there like phases and different places in the game or just the one screen?" Honest answer: one main screen + three modal overlays. This plan adds spatial variety, peak moments, and pre-launch decision depth.

---

## TL;DR

Three features, recommended in this order:

| # | Feature | Why this order | Est. time | Risk |
|---|---|---|---|---|
| A | **Boss-audience flow** | Most contained; doesn't restructure existing flows; adds peak moments to a flat loop | ~7h | low |
| B | **Map screen with unlockable locations** | Builds on bosses (they gate region unlocks); replaces flat area-grid with spatial mental model | ~8h | medium |
| C | **Kitchen + Performance separation** | Biggest restructure of the core loop; best landed last when the other two are stable | ~9h | high |

Each feature ships in 3–5 TDD phases. Each phase ends with a v5 critic checkpoint.

**Why this order specifically:**
- A first: lowest blast radius. Bosses are a new gameplay mode bolted on; the existing per-launch loop is untouched.
- B second: now we have bosses to gate region unlocks, the map has a meaningful unlock progression. Without bosses, region-unlocks would just be "discover 10 recipes → unlock 4 more locations" — flat.
- C last: kitchen restructures the core launch loop. If the prep/treatment math is wrong, every other feature breaks. Better to know the rest is stable when we touch the foundation.

---

## Feature A — Boss-audience flow (5 bosses, ~7h)

### Design rationale

Current state: every launch is a one-shot encounter. Daniel Cook's arcs framework says loops without arcs flatten over time — and the existing daily-audience rotation IS the only arc. Bosses add peak moments: rarer than daily, more memorable, gating unlocks the loop can't reach.

**Skill differentiation principle:** each boss tests a DIFFERENT skill, not just "harder cravings." If all 5 bosses are "the same puzzle with bigger numbers" they're forgettable. The 5 below each demand a distinct cognitive move.

### v5 critic gates addressed
- **Surprise & Delight** axis ≥7 (boss reveals, fanfares, named encounters)
- **Goal Stacking** completes (per-launch → daily → boss arc → endgame)
- **Variation & Replay** ≥7 (boss fights are re-playable with prestige tracking)
- **Bushnell Floor=Ceiling** lifts the ceiling without raising the floor

### The 5 bosses

1. **Granny's Family Reunion** (Act 1 — INTERSECTION puzzle)
   - 3 family members shown side-by-side, each with different cravings.
   - **One launch.** Win = ≥50% match against ALL 3 simultaneously.
   - Skill tested: find a plate that satisfies the intersection of preferences.
   - Unlock: 10 recipes discovered.

2. **Royal Court Escalation** (Act 2 — ESCALATION puzzle)
   - 3 sequential rounds against the same audience.
   - Round 1: base cravings. Round 2: cravings + 1 new restriction. Round 3: cravings + 2 restrictions (cumulative).
   - Belly partially refreshes between rounds (10 → 7 → 5).
   - Win = ≥50% match on ALL 3 rounds.
   - Skill tested: adapt to tightening constraints; resource budgeting across rounds.
   - Unlock: defeated Boss 1 + reached 70% overall match somewhere.

3. **Haunted Mansion's Three Ghosts** (Act 3 — PRIORITIZATION puzzle)
   - 3 ghosts with mutually incompatible cravings (one wants wet, one wants dry, one wants musical-and-cold).
   - **Two launches.** Win = please any 2 of 3 (≥50% match).
   - Skill tested: prioritization under scarcity; opportunity cost.
   - Unlock: defeated Boss 2 + owns 2 epic foods.

4. **Volcano Cult Ritual** (Act 4 — DEDUCTION puzzle)
   - Cravings HIDDEN (forced Hard Mode for this fight).
   - First launch is a "probe" — you see reaction tier (loved / liked / meh / disliked / evacuated) but no specific match%.
   - 2 more launches based on inference from the probe.
   - Win = ≥60% on 2nd or 3rd launch.
   - Skill tested: deduce target from minimal signals; Bayesian update.
   - Unlock: defeated Boss 3 + completed Glowing Mushroom legendary quest.

5. **Cosmic Council Final Judgment** (Act 5 — RESOURCE ALLOCATION puzzle)
   - 4 alien councilors, each with own cravings.
   - 4 launches available.
   - BEFORE each launch you DECLARE which councilor you're targeting. Locked in.
   - ≥60% match against the declared councilor = secure that vote.
   - Need 3/4 votes to win. Wasted target = lost vote permanently.
   - Skill tested: planning multi-step under uncertainty; resource allocation.
   - Unlock: defeated Bosses 1–4.

### Boss rewards
- First win: guaranteed legendary food unlock (one per boss, replaces the existing legendary quests entirely OR coexists as an alternate path).
- Subsequent wins: gold + research notes + a title shown next to player name (cosmetic).
- Boss 5 first win: ending screen + unlock New Game+ (audiences cycle 2× faster; restrictions intensify).

### Boss UI
- New "Arena" view replaces the normal Story screen during a boss fight.
- Boss portrait LARGE (3–4× normal). Animated entrance + Phase K `legendary-fanfare` SFX.
- Per-boss themed CSS (dark vignette, region-specific palette).
- Health bar / round indicator varies by boss (Boss 2 has a "round 1/2/3" tracker; Boss 5 has 4 vote slots).
- Defeat flow: shows what happened, no penalty, "try again tomorrow."

### Phases

#### Phase N — Boss state + scoring engine (4 items, ~2h)

71. **Boss catalog: 5 boss definitions with skill-specific data** (~30m). Test: `bosses.test.ts` — 5 entries with `{id, name, emoji, act, unlockReq, skillKind, audiences[], rounds, winRule, rewardFoodId}`. Verify: every skillKind is unique; every boss's audiences[] is non-empty; rewardFoodId points to a legendary food.

72. **Boss-progress persistence + unlock checks** (~30m). Test: `boss-progress.test.ts` — `loadBossesDefeated()`, `markBossDefeated(id)`, `isBossUnlocked(id)`. Unlock predicates query the existing save state (recipes, foods, best-match high-water marks). Verify: Boss 2 not unlockable without Boss 1 defeated.

73. **Per-skill boss-match scoring** (~45m). Test: `boss-match.test.ts` — for each skill kind (intersection/escalation/prioritization/deduction/allocation) the win-condition is correctly evaluated from the round-by-round inputs. Verify: a plate satisfying all 3 family members triggers the intersection win; a plate satisfying 2 of 3 doesn't (for Boss 1 — needs all 3).

74. **Boss reward dispatch + ending flow** (~15m). Test: `boss-reward.test.ts` — defeating a boss for the first time unlocks the reward food; subsequent wins grant gold+notes only. Boss 5 win sets `loadGamePlusUnlocked() = true`.

#### Phase O — Boss arena UI (3 items, ~3h)

75. **Arena overlay + boss entrance animation** (~1h). Test: `arena.spec.ts` — clicking a boss from the notebook's "Bosses" tab opens an `#arenaOverlay` that hides the normal Story shell. Boss portrait scales in with fanfare animation; SFX `legendary-fanfare` plays if available, else no-op. Verify: ESC or Close button exits the arena (counts as forfeit, no penalty).

76. **Per-boss round/round-of-round UI** (~1h). Test: `arena-rounds.spec.ts` — Boss 1 shows 3 audience portraits side-by-side with no round counter; Boss 2 shows round 1/3 counter; Boss 3 shows "2 launches remaining"; Boss 4 shows probe-result panel; Boss 5 shows 4 vote slots + target selector.

77. **Defeat / victory flows** (~1h). Test: `arena-end.spec.ts` — winning triggers reward animation + adds the food to pantry + closes arena with a confetti effect. Losing shows "X says: try again tomorrow" + closes arena. State persists.

#### Phase P — Boss integration + balancing (3 items, ~2h)

78. **"Bosses" tab in notebook with unlock indicators** (~45m). Test: `notebook-bosses.spec.ts` — notebook modal now has a third section after recipes + quests: 5 boss cards with locked/unlocked state + a "Fight" button on unlocked ones. Verify: locked bosses show their unlock requirements as hint text.

79. **Boss-unlock side effects (toast + sfx)** (~30m). Test: `boss-unlock.spec.ts` — meeting a boss's unlock requirements during normal play triggers a toast notification "🏆 [Boss] is ready to fight! Check the Notebook." Verify: toast appears at most once per boss (persisted).

80. **Boss balance pass + smoke test** (~45m). Test: `boss-smoke.spec.ts` — single test that fights each of the 5 bosses programmatically (pre-set ideal plates) and verifies the win condition fires correctly for each. This is the boss-equivalent of `gameplay-smoke-v3.spec.ts`.

**Phase A checkpoint:** v5 critic. Goal Stacking ≥9 (per-launch → daily → boss → endgame); Surprise & Delight ≥7. Expected v5 score: 8.5–9.0.

---

## Feature B — Map screen with unlockable locations (~8h)

### Design rationale

Current state: 6 "areas" rendered as a flat grid — Outside / Under Covers / Library / Elevator / Throne / Space. Each is a score modifier. Players don't think of these as a "world" — they think of them as a dropdown.

A map view gives:
- A spatial mental model (regions, neighbors)
- A reason to discover (some locations are hidden until unlocked)
- A way to gate audiences (some audiences ONLY appear in certain regions)
- A way to gate recipes (a region's audience pool reveals different recipes)
- Replayability: the "what should I cook today?" question becomes "where should I go AND what should I cook?"

### v5 critic gates addressed
- **Variation & Replay** lifts to 8+ (now 20 locations × 20 audiences = 400 day-flavors, not 20)
- **Aesthetic-Mechanical Coherence** ≥7 (regions have visual themes that hint at audience preferences)
- **Curiosity Gaps** ≥9 (hidden locations behind unlock requirements)

### 5 regions × 4 locations = 20 locations

**Region 1: Hometown** (starter, all unlocked from day 1)
- 🌳 Backyard (neutral — no modifier; the "tutorial" location)
- 🛏 Under Covers (existing — stink×2, length×1.5)
- 📚 Library (existing — loud×0.5, -3 score offset)
- 🚽 Public Restroom (NEW — stink×3, comedic; audiences are loud, drunk, forgiving)

**Region 2: City** (unlocks after pleasing 5 different audiences)
- 🛗 Elevator (existing — stink×4, loud×0.5)
- 🏟 Stadium (NEW — loud×3, length×2; audiences love big shows)
- 🚇 Subway Car (NEW — captive audience, +20% score except for max-stink:3 audiences who hate it)
- 🛒 Grocery Aisle (NEW — temp×0.5 chilled, musical×1.5)

**Region 3: Wilderness** (unlocks after 10 recipes discovered)
- 🏕 Campsite (NEW — length×2, loud×1.5)
- 🌋 Volcano Rim (NEW — temp×3, stink×1.5, loud×1.5; high-risk, high-reward)
- 🌊 Beach (NEW — wet×1.5; salty)
- 🌲 Forest (NEW — musical×1.5; gentle)

**Region 4: Royal** (unlocks after defeating Boss 2 — Royal Court Escalation)
- 👑 Throne Room (existing — musical×2, no-wet enforced)
- 🏰 Castle Banquet (NEW — long×2; requires plates of 3+ foods)
- 🎭 Opera House (NEW — musical×3, no-loud; soprano-grade)
- ⚖ High Court (NEW — quiet, formal)

**Region 5: Cosmic** (unlocks after defeating Boss 5 — Cosmic Council)
- 🚀 Space Station (existing — loud×0, length×3)
- ☁ Cloud Kingdom (NEW — musical×3, length×2)
- 🪐 Alien Bar (NEW — surprise modifiers shuffled daily)
- ⚛ Quantum Lab (NEW — all stats randomized each launch; chaos)

### Map UI
- Replace the area grid with a stylized SVG world map.
- Locations are pins/icons placed on the map.
- Locked locations show a 🔒 overlay + "Unlocks at: …" tooltip.
- Today's "Hot Spot" (deterministic per UTC day from unlocked locations) gets a pulsing animation + +20% gold reward.
- Tap a pin to select; the rest of the Story shell updates around that location (background tint, audience pool restricted).

### Persistence
- `loadUnlockedLocations()` / `unlockLocation(id)` — gitignored from default save, default = Hometown's 4 locations.
- `loadCurrentLocationId()` replaces `loadLastArea()`.
- `dailyHotLocation(date, unlockedSet)` returns one of the unlocked ones, seeded per day.

### Audience-location pools
- Each audience has an optional `region` tag.
- Audiences with `region: 'royal'` ONLY appear at Royal locations.
- Audiences with no tag (most) appear anywhere.
- The daily audience now considers the player's CURRENT location, not just the date.

### Phases

#### Phase Q — Location catalog + unlock checks (4 items, ~2h)

81. **Location catalog: 20 entries across 5 regions** (~1h). Test: `locations.test.ts` — 20 entries with `{id, name, emoji, region, modifiers, audiencePool?, unlockReq?, regionOrder, mapX, mapY}`. Verify: every region has exactly 4 locations; every modifier maps to an existing axis; mapX/mapY are within 0-100% bounds.

82. **Unlock predicate evaluation** (~30m). Test: `location-unlock.test.ts` — `isLocationUnlocked(id, saveState)` returns true if `unlockReq` is satisfied. Verify: chain unlocks work (Cosmic locations only unlock after Boss 5 is defeated; Boss 5 requires Bosses 1-4; etc.).

83. **Audience-pool filtering by region** (~30m). Test: `audience-region.test.ts` — `getDailyAudience(date, currentLocation)` returns an audience from the location's pool (if defined) OR the global pool (if not). Royal locations cycle through royal audiences; Cosmic through cosmic; etc.

84. **Daily hot-location selection** (~15m). Test: `hot-location.test.ts` — `dailyHotLocation(date, unlockedSet)` is deterministic per UTC day + unlocked set. Verify: it never returns a locked location.

#### Phase R — Map UI (3 items, ~3.5h)

85. **SVG world map shell** (~1.5h). Test: `map-shell.spec.ts` — `#mapScreen` renders an SVG map with 5 region zones + 20 pin elements. Locked pins have `data-locked="true"`. Verify: clicking the Travel button (in progression strip) opens the map; clicking a pin selects that location and closes the map.

86. **Map decorations + tooltips + hot-spot** (~1h). Test: `map-deco.spec.ts` — each pin shows a tooltip with location name + modifier summary on hover/focus. Hot-spot pin has a `.hot-spot` class with pulsing animation. Verify: locked pins show the unlock requirement in the tooltip.

87. **Region-themed Story shell tint** (~1h). Test: `map-tint.spec.ts` — selecting a Royal location adds `body[data-region='royal']` and changes the audience-wrap border to gold. Cosmic = purple; Wilderness = green; etc. Verify: reverting to Hometown removes the tint.

#### Phase S — Map integration (2 items, ~2.5h)

88. **Replace area-grid with Travel button + map** (~1.5h). Test: `area-replacement.spec.ts` — the old `.area-grid` is removed from the main flow; replaced by a "📍 Travel" button in the progression strip that opens `#mapScreen`. Verify: existing area-related tests still pass with the new selector (data-area attribute persists on the pin elements).

89. **Region-specific recipe seeding** (~1h). Test: `region-recipes.test.ts` — `getRegionalRecipeHint(region)` returns a clue ("a regional specialty exists here") if the player hasn't discovered any recipe from this region yet. Verify: hint disappears once any regional recipe is discovered.

**Phase B checkpoint:** v5 critic. Variation & Replay ≥8; Aesthetic-Mechanical Coherence ≥7; Curiosity Gaps ≥9. Expected v5 score: 9.

---

## Feature C — Kitchen + Performance separation (~9h)

### Design rationale

Current state: pantry → plate → launch. Foods are added directly. No prep, no transformation, no time-based progression.

A kitchen layer adds:
- A prep stage between plating and launching where foods can be transformed
- 5 treatment types (Raw / Roast / Ferment / Chill / Blend) with property modifiers
- Async fermentation (real-time wait OR cross-day batch)
- A real decision layer: same pantry now generates many more plate variations

This is the biggest restructure. Risk: the prep math interacts with every existing scoring path. TDD is critical.

### v5 critic gates addressed
- **Decision Quality** lifts from 8.5 → 9+ (treatments add a real choice dimension)
- **Skill Curve** ≥8 (deciding when to ferment for tomorrow is real planning)
- **Bushnell Ceiling** rises again (mastering treatments separates good play from great play)

### Treatment types

| Treatment | Effect | Cost / time |
|---|---|---|
| **Raw** | no change (default) | 0 |
| **Roast** | +1 stink, +1 temp, -1 wet | +1 belly cost |
| **Ferment** | +2 stink, +1 musical, +1 length | 1 in-game day wait (queue) |
| **Chill** | -1 wet, -1 temp, +1 loud | +1 belly cost (energy spent freezing) |
| **Blend** | merges 2 foods → 1 averaged-profile food in 1 slot | -1 belly cost (refund) |

Treatments are *additive* to the base food properties. A roasted beans has properties = `beans.props + roast_modifier`.

### Fermentation system

- 3-slot "fermentation rack" persists across days.
- Player puts a food in the rack today; it's "ready" tomorrow (UTC day boundary).
- Ready ferments must be claimed (added back to pantry as a NEW food id: `ferment-<original>-<day>`) or they spoil (cleared after 7 days unused).
- This creates a multi-day arc: plan tomorrow's plate by fermenting today.

### Kitchen UI

- New "🍳 Kitchen" view, accessed via a `#kitchenBtn` in the progression strip.
- Two panels:
  - **Prep table** — 4 slots, same as the plate. Each slot has a food + a treatment radio (Raw / Roast / Chill / Blend), with current modifier preview.
  - **Fermentation rack** — 3 slots showing what's fermenting + countdown to ready.
- "Send to Performance" button finalizes the prep, applies all treatments, and pushes to the plate.
- Player can also access Kitchen from the main flow's "advanced prep" mode (default: simple click-to-plate; advanced: send through Kitchen).

### Phases

#### Phase T — Treatment data layer (4 items, ~2.5h)

90. **Treatment catalog + modifier vectors** (~30m). Test: `treatments.test.ts` — 5 treatments with `{id, name, propertyModifier, bellyCostDelta, requiresDayWait}`. Verify: Raw is the identity treatment; Blend's modifier is the averaging function.

91. **Apply treatment to a food's properties** (~45m). Test: `treatment-math.test.ts` — `applyTreatment(food, treatment)` returns a modified property vector. Each axis is clamped to 0-5. Verify: roasted beans has stink=4 (was 3) and wet=2 (was 3); chilled is the inverse.

92. **Fermentation rack persistence** (~45m). Test: `ferment-rack.test.ts` — `addToFermentRack(foodId)`, `getReadyFerments(today)`, `claimFerment(slotIdx)`. Verify: ferments started on day D become ready on day D+1; unclaimed for 7 days are cleared.

93. **Treatment → recipe-property aggregation** (~30m). Test: `treatment-aggregate.test.ts` — `computeFartFromPreppedPlate(slots: PreppedSlot[])` aggregates each prepped food's modified properties. Verify: a plate of [roasted beans, fermented cheese] yields a different fart profile than [raw beans, raw cheese].

#### Phase U — Kitchen UI (3 items, ~3.5h)

94. **Kitchen overlay shell** (~1.5h). Test: `kitchen-shell.spec.ts` — clicking `#kitchenBtn` opens `#kitchenOverlay` with a prep table (4 slots) + ferment rack (3 slots). Verify: ESC closes; state preserved when reopening.

95. **Per-slot treatment selector** (~1h). Test: `kitchen-treatments.spec.ts` — each prep-table slot has a radio group with the 5 treatments. Changing the treatment updates an inline modifier preview. Verify: selecting Blend on a slot requires choosing a "merge target" (another slot); blends consume 2 slots → 1.

96. **"Send to Performance" + propagate to plate** (~1h). Test: `kitchen-send.spec.ts` — after configuring treatments, clicking Send pushes the prepped foods to the plate (with treatment metadata) and closes the Kitchen overlay. Plate slots show a small treatment glyph (🔥 / 🥒 / ❄ / 🥤 / ∅). Verify: clicking Launch fires the prepped plate through `computeFartFromPreppedPlate`.

#### Phase V — Async fermentation flow (2 items, ~2h)

97. **Ferment rack UI + countdown** (~1h). Test: `ferment-rack.spec.ts` — clicking a food in pantry while in Kitchen has an option "Add to fermentation rack." Rack slot shows countdown ("Ready tomorrow") or "Ready! Claim". Verify: a ferment started "yesterday" (via test setup) is ready and claimable.

98. **Claimed ferments become new pantry entries** (~1h). Test: `ferment-claim.spec.ts` — claiming a ferment adds it to the pantry as a new food `ferment-<originalId>`. The new food has the fermented property vector + a 🍶 emoji prefix. Verify: ferment foods are visible in the notebook's pantry listing; their treatment state is locked (can't be re-fermented).

#### Phase W — Kitchen integration + simple-mode fallback (1 item, ~1h)

99. **Simple-mode toggle** (~1h). Test: `kitchen-toggle.spec.ts` — first-time players have the Kitchen flow OFF; clicking a pantry food adds it directly to the plate as Raw (current behavior). A "Kitchen Mode" toggle in the progression strip enables the full prep flow. Verify: the toggle persists; tooltips explain the difference.

**Phase C checkpoint:** v5 critic. Decision Quality ≥9; Skill Curve ≥8; Bushnell Ceiling visibly higher. Expected v5 score: 9.5.

---

## Combined trajectory

| Milestone | v5 score est. | Cumulative time |
|---|---|---|
| (PLAN_v4 start, v3 shipped) | 8.5 | 0 |
| After Phase A — Bosses | 9.0 | ~7h |
| After Phase B — Map | 9.2 | ~15h |
| After Phase C — Kitchen | 9.5 | ~24h |

Total: 99 new items beyond Tier 7's 70. 29 phases (A–W). Estimated ~24h of TDD time for an experienced agent on a single track.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Boss puzzle balance is wrong on first try | High | Each boss has unit tests for win/lose edge cases; balance pass is item 80. |
| Map SVG performance on mobile | Medium | Use CSS transforms + lazy decoration loading; profile at item 87. |
| Kitchen restructure breaks existing tests | High | Simple-mode toggle (item 99) keeps the old flow as default. New flow is opt-in. |
| Fermentation real-time wait is annoying | Medium | Use 24h UTC day boundary, not real-time minutes. One real-time day = one in-game day. |
| Bosses feel grindy if re-fightable for cosmetics only | Low | First-win unlock is the meaningful reward; cosmetic titles are optional. |
| Map's region-themed CSS conflicts with existing rarity glows | Low | Region tint applies to layout chrome only (audience-wrap border, body bg); food cards keep their rarity classes. |

---

## Open design questions

- **Are bosses one-shot per save or repeatable?** Recommendation: first win unlocks reward; subsequent wins repeatable for prestige badge.
- **Does map travel cost something?** Recommendation: free movement, but you must pick ONE location per day. Per-day "tickets" if the loop is too easy.
- **Should Kitchen Mode be on by default for new players?** Recommendation: off. Simple is easier; advanced unlocks after the player has unlocked their 5th uncommon food.
- **How does the existing legendary-quest system interact with boss-rewards?** Recommendation: quests stay; boss-rewards are an *alternate path* to the same 6 legendary foods. Each legendary now has 2 unlock paths (quest OR boss). Player picks whichever they prefer.

---

## Stop here for now

This plan is design only. Before any code changes, the user should:
1. Pick whether to start (with Phase A — Bosses) or pivot the order.
2. Decide on the open questions above (or defer them per-phase).
3. Confirm 24h of investment is the right next bet versus other directions (mobile-first polish, audio gen, kid-onboarding tutorial, etc.).
