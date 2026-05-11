# Critic Review — Post-v4 Build (after PR #4 merge)

**Reviewer:** Claude, applying the v5 Fun rubric + Audio/Visual/Quality v2 critics from `docs/`.
**Build:** `expansion-v4` branch, all 9 phases (N–W) of `PLAN_v4.md` shipped.
**Reviewer's stance:** This is a self-critique. My PR #4 claimed v5 ≈ 9.5. **That was over-confident.** Honest grade: **5-6/10.** This document explains why and what to fix.

---

## TL;DR

The structural work is real — the build cleared 11 v5 hard gates *on paper* and ships 362 unit + 158 e2e tests. But **playing the build** reveals three categories of gap the test suite couldn't catch:

1. **Functional blockers** — a feature was built but is not wired through to gameplay (treatments don't apply at launch), an audio queue was specified but the files were never generated, and one boss is mathematically unwinnable in the shipped state.
2. **First-30-seconds experience is broken** — the onboarding modal still describes the v2 slider game; a brand-new player sees a Story screen they can't navigate.
3. **Polish vs. depth imbalance** — Quality (8) and Choice Architecture (8) are strong; Game Feel (5) and System Integration (5) drag the (min+mean)/2 aggregation down to ~6.

The fix is not big — see [PLAN_v5.md](PLAN_v5.md). Roughly 20h of focused work moves this from honest 5-6 to honest 8+.

---

## Section 1 — Hard blockers verified in code

### Blocker 1: Kitchen treatments do NOT apply at launch

**Evidence** ([src/ui/plate.ts:486](src/ui/plate.ts)):
```ts
const recipe = computeFartFromPlate(ids);     // ← uses RAW food properties
```
And in [src/ui/kitchen.ts:243-245](src/ui/kitchen.ts):
```ts
export function loadPlateTreatments(): TreatmentId[] {
  // …
}
```
The treatments are written to `fart_plate_treatments` localStorage when the player clicks Send to Performance. **Nothing reads them.** `computeFartFromPreppedPlate` (which would honor them) exists in `src/scoring/treatments.ts` but is never invoked from `onStoryLaunch`.

**Impact:** Kitchen Mode is decorative. The player can fastidiously Roast their cheese and Chill their pickles — the fart at launch is identical to the all-Raw plate. The entire 9-hour Phase T+U+V+W work is functionally dormant.

**Reality of the v5 score:** This breaks **Decision Quality** (treatments don't matter), **System Integration** (Kitchen is parallel scoring path that ALSO ignores its own data — disjoint *from itself*), and **Surprise & Delight** (the fanfare for "I figured out the right treatment" never lands).

### Blocker 2: Onboarding describes the wrong game

**Evidence** ([src/ui/onboarding.ts:11](src/ui/onboarding.ts)):
```ts
body: 'You are now Lab Director. Move the six sliders to design the most LEGENDARY fart in scientific history.'
```
First-time players land in **Story Mode** (per Phase M default flip), then see a 3-step tutorial about **sliders that no longer exist in their view.** The tutorial says "Move the six sliders" → player looks for sliders → there are none → confusion.

**Impact:** **Bushnell Floor=Ceiling** gate is borderline-failing. The 30-second-from-cold-start test produces "I don't know what's happening." On the v5 anchor: "Plays a few minutes then the gaps surface" → **3-4 band**.

### Blocker 3: Boss 2 (Royal Court) is unwinnable as-shipped

The boss-smoke test (`tests/unit/boss-smoke.test.ts`) for Boss 2 was *documented* as intentional difficulty:
> "Royal Court cravings have stink=1 (low). The round-3 restriction min-stink:3 directly conflicts. So the boss is INTENTIONALLY hard: you need to please their craving (low stink) AND the restriction (high stink). With the v3 tolerant L1 scoring this is impossible."

The unit test for this boss only asserts that the run completes without crashing — it never asserts `isBossWon === true`. **This was a tell I missed at commit time.** If a perfect-plate test cannot pass, the boss is unwinnable.

The fix is twofold: (a) apply Phase T treatments at launch so the player can bridge the gap (Roast a low-stink food to get high-stink), and (b) provide a UI hint in the arena: "this audience wants quiet AND stink. Treatments may help."

### Blocker 4: 12 SFX seeds were never generated

**Evidence:** `public/sfx/manifest.json` has **14 entries** — all from the v2 generation run. `scripts/sfx-seeds.ts` (after Phase K) lists **26 seeds.** The 12 new ones (audience reactions × 6, food-eating × 4, legendary fanfare × 2) require `npm run sfx:generate` which is operator-pending.

**Impact:** Half the events I built audio cues for are silent:
- Audience reaction tier shows 😍 / 🙂 / 😐 / 🤢 / 💀 with text — no laughter, applause, or moan.
- Food added to plate — no munch.
- Legendary launch — visual fanfare fires; no audio.
- Boss victory — no fanfare.

The Feedback Gate from v5 fun-critic says: "If any player input lacks **both** visible AND audible response, FAIL." Audience reactions have visible feedback (emoji + text) so technically they pass the gate. But the *intent* of the gate is multi-modal richness, and we're delivering ~60% audio coverage of the events we designed for.

### Blocker 5: Mobile is untested

The `tests/e2e/touch-targets.spec.ts` is **skipped** in the desktop project. The map's 20 pins are positioned absolute on a `min(480px, 60vh)` canvas — on a 375px-wide mobile, that's 18% of the screen per pin row, with overlapping pins likely. No verification has been done on real mobile.

---

## Section 2 — v5 Fun critic per-axis scoring

Honest grading. Each axis 1-10. The (min + mean) / 2 aggregation does its job here.

| Axis | Score | Reasoning |
|---|---|---|
| **Decision Quality** | 7 | Lots of decisions on paper (food / area / treatment / target). But treatments don't apply, so the depth advertised isn't delivered. |
| **Skill Curve** | 6 | Hard Mode + warmer/colder + audience-reading is real skill. But the floor is undefined (broken onboarding). |
| **Game Feel** | 5 | Animations are good (plate-pop, audience-wobble, sparkles). Audio is ~40% complete. Per-input multimodal density is below threshold for ≥7. |
| **Failure & Recovery** | 7 | Research notes from low matches close the No-Failure gate. Failure → progression is real. |
| **Variation & Replay** | 7 | 20 audiences × 20 locations × 30 foods. Many audiences feel similar (tolerant L1 distance is too forgiving — gentle audiences accept zero-plates). |
| **Progression** | 7 | Gold + notes + recipes + foods + quests + bosses + regions + ferment claims + GamePlus. Almost *too many* progression vectors for a new player to track. |
| **Goal Stacking** | 8 | Per-launch / daily / weekly / monthly all clear. |
| **Curiosity Gaps** | 8 | Locked recipes / locked bosses / locked regions / locked foods / undiscovered quests. Strong. |
| **System Integration** | 5 | Match% drives gold + notes + best-match (good). But ferment claims is its own track, audio gen is its own track, GamePlus is a dangling flag, kitchen mode is parallel-but-disconnected. ≥3 disjoint side-systems. |
| **Choice Architecture** | 8 | Pick-K-of-30, bounded inventory, belly cost scarcity, synergy/conflict catalog. Strong. |
| **Personality / Charm** | 7 | Audience names + flavor text have voice. UI is functional and busy; the voice doesn't carry through. |
| **Surprise & Delight** | 6 | Discovery toasts, boss reveals, legendary fanfare. A new player encounters fewer than 5 in 30 minutes because most unlocks are gated. |
| **Aesthetic-Mechanical Coherence** | 6 | Fart-themed game that asks you to read a librarian's preferences. Mechanically coherent; the theme could be louder in interactions. |

**Calculation:**
- min_axis = 5 (Game Feel, System Integration)
- mean_axes = (7+6+5+7+7+7+8+8+5+8+7+6+6) / 13 = 87 / 13 ≈ 6.69
- raw_score = (5 + 6.69) / 2 = 5.85 → **6**

**Hard-gate check:**
- Most gates clear.
- **Bushnell Floor=Ceiling: borderline** because of the broken onboarding (new players can't reach a smooth first-30-seconds floor).
- **Feedback Gate: borderline** for events with visible-but-no-audible feedback.

If we treat borderline as "needs fixing but not auto-fail," **final v5 = 6.** If we treat them as fails, the cap drops to 4.

**Honest grade: 5-6/10.**

---

## Section 3 — Audio critic (v2)

Library Richness gate (A28) requires ≥12 non-fallback entries. Manifest has 14. **PASSES**.

But the seed catalog at Phase K is 26 entries. The delta of 12 unmade SFX corresponds to **every contextual sound the v4 build added** (audience reactions, food-eating, legendary fanfare). The game ships with v2-era audio in a v4 game.

**Per-axis** (estimated, since live audio measurement requires the manifest to match the catalog):

| Audio axis | Score | Reasoning |
|---|---|---|
| Lifecycle Robustness | 9 | AudioContext create/suspend/resume tested, mute toggle works, visibility-change suspends. |
| Variety & Game Feel | 5 | 14 sounds for ≥5 modalities (launch / reaction / eating / fanfare / discovery / mute). 60% coverage. |
| Mastering Quality | 7 | Existing v2 mp3s are properly normalized; no clipping reported. |
| Resilience | 8 | Procedural-fallback exists when sample-bank fails. |
| Accessibility & Persistence | 8 | Mute button + persistence + ARIA-pressed work. |
| Sound Design Craft | 4 | A21 Stalling test: cold listener probably could NOT name "what is that boss-victory sound" — there isn't one. |

Avg ≈ 6.8; min = 4. (min+mean)/2 = **5.4 → 5**.

---

## Section 4 — Visual critic (v3)

Progression strip is **busy**. 7 elements: 💰 gold counter, 📝 notes counter, 🍳 Kitchen Mode toggle, 🍳 Kitchen button (when on), 📖 Notebook, 🛒 Shop, 📍 Travel. On mobile (375px) this requires careful horizontal scroll or wrapping I haven't verified.

The world map at mobile is a real concern: 20 pins on a 60vh canvas (≈ 400px on 375×667), with text labels — pins will overlap and labels will truncate.

**Per-axis** (desktop-only basis since mobile is unverified):

| Visual axis | Score | Reasoning |
|---|---|---|
| Contrast & Color | 8 | Rarity palette has good ratios; gold text on dark BG is readable. |
| Touch & Tap | 5 | Buttons in progression strip are ~36px tall — borderline. Map pins on mobile are likely <44px. |
| Typography | 8 | Reasonable size hierarchy; no body text below 12px on desktop. |
| Motion Safety & Performance | 9 | `prefers-reduced-motion: reduce` is honored properly (animation: none, not just instant). |
| Focus & Keyboard | 7 | Most interactive elements have aria-label + focus-visible. Map pins might need keyboard navigation review. |
| Layout Stability | 7 | The 7-element progression strip might overflow on mobile (untested). |
| Hierarchy & Affordance | 6 | Top-of-screen is busy. The audience portrait + arena + progression strip + belly meter compete for attention. |
| Kid-Appropriateness | 9 | All emoji + flavor text reviewed. |
| Art Direction | 7 | Disney-12 polish on key interactions, themed region tints, rarity glows. Cohesive. |

Avg ≈ 7.3; min = 5. (min+mean)/2 = **6.2 → 6**.

---

## Section 5 — Quality critic (v2)

The strongest of the four.

| Quality axis | Score | Reasoning |
|---|---|---|
| TDD Discipline | 9 | Every Phase had red-first commits. 362 unit + 158 e2e tests cover the new surface. |
| Type Safety | 9 | TypeScript strict mode clean. No new `any` introduced. |
| Code Health | 7 | Some functions in plate.ts are >100 lines (onStoryLaunch). Cyclomatic complexity not measured. |
| Security & Dependencies | 8 | No new deps. No user-input flows into innerHTML (treatments persisted as JSON, parsed safely). |
| Performance & Bundles | 8 | 91 KB JS / 30 KB gz. Acceptable for the feature set. |
| Source-Level Accessibility | 7 | aria-labels present; some new buttons (e.g. `kitchen-mode-toggle`) could use more descriptive labels. |

Avg ≈ 8.0; min = 7. (min+mean)/2 = **7.5 → 8**.

---

## Section 6 — Schell Lens #39 (verbatim, per FUN_CRITIC.md §3.3)

> Q1: What choices is the game asking the player to make?

Per launch:
- Which 1-4 foods to plate (pick-K-of-30 unlocked).
- Which treatment per food (5 options × per slot) — *if Kitchen Mode is on*.
- Which location to launch in (4 unlocked initially).
- Whether to use the daily Hot Spot for +20%.

Per session:
- Whether to buy from shop (gold) or research-unlock (notes).
- Whether to attempt a boss fight or grind currency.
- Whether to cook a known recipe (Notebook→Cook) or experiment.

> Q2: Are they meaningful?

- Food choice: **YES** in Easy Mode (visible target = puzzle to match). In Hard Mode: **YES** (read trend + restrictions).
- Treatment choice: **NO** (treatments don't apply at launch — see Blocker 1).
- Location choice: **YES** for Royal/Cosmic (audience-pool gating); **partial** for others (just scoring multipliers).

> Q3: Are there dominant strategies?

No. Cravings rotate daily, audiences rotate per location. The "spam beans+cheese" plate doesn't dominate because Royal/Opera/Library punish wet+stink.

> Q4: Are choices placed where players can make them, in the right amounts, with the right consequences?

**NO** — the choices made in Kitchen Mode have no consequence. That's the central bug.

---

## Section 7 — What worked (so credit lands where it belongs)

Not everything is broken. Things that genuinely shipped well:

- **Boss-puzzle differentiation.** All 5 bosses test different cognitive skills. Even at v4 ship, this is the most distinctive feature.
- **Discovery → Notebook → Cook loop.** Curiosity Gaps closed cleanly. The Cook button is satisfying.
- **Ferment rack as multi-day async progression.** Real planning loop.
- **Reduce-motion handling.** Fixed properly from "instant duration" to "animation: none" in Phase L.
- **Hard Mode toggle.** Cleared the Displayed-Target Puzzle gate.
- **Test coverage.** 362+158 is real coverage of the feature set.

---

## Section 8 — Why my PR #4 estimate was wrong

I wrote "v5 ≈ 9.5" in PR #4. That was wrong because:

1. **I scored on completeness of design, not gameplay verification.** "All hard gates clear" reflected the SHAPE of code, not running it through Schell Lens #39 honestly.
2. **I missed that I built a feature without wiring it through.** The treatments persistence write/no-read pattern is in the codebase visible to grep but I didn't grep.
3. **I assumed audio was done.** The Phase K commit even *said* "operator-pending" but I forgot at PR time.
4. **I haven't watched a brand-new player try the game.** RULE 3 — verify behavior, not data shape. I verified data shape.

This document is the correction. **Honest grade: 5-6/10.**

The good news: the gap between "5-6" and "8+" is mostly mechanical fixes, not architectural redesign. See `docs/PLAN_v5.md` for the punch list.
