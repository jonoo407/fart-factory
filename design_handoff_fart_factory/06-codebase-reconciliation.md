# 06 — Codebase Reconciliation (read this BEFORE building)

> **The game already exists.** After re-reading the real `fart-factory` repo, almost every system in
> this handoff is **already implemented** as a TypeScript module. This document corrects the
> greenfield framing of docs 01–05 and maps every concept onto the **real code**, so the work is
> understood as **modifying and tuning existing modules + re-skinning the UI**, not building from
> scratch. Where docs 01–05 differ from this file, **this file wins** (it's grounded in the actual source).

---

## 1. Three corrections to docs 01–05

1. **Axes are 7, real, and named differently.** The real `FoodProperties` (see `src/state/food.ts`) is:
   `wet, dry, stink, loud, musical, length, temp` — each **0–5** per food. Two fixes vs. earlier docs:
   - It's **`temp`**, not "heat" (🌡️/🌶️ either works in UI; the data key is `temp`).
   - **`length` is a real food axis**, not derived from belly. (Belly cost is a *separate* field, `bellyCost`.)
2. **It's modify-not-build.** Don't create new `Food`/`Recipe`/`Crowd` types — the repo has `Food`, `Audience`, recipes, treatments, shop, bosses, etc. The seed content in `03-data-schemas.md` is the *prototype's* slice; the real game already ships **30 foods + 20 audiences**. Treat doc 03 as a model of the relationships, then work against the real catalogs.
3. **The prototype's scoring is a PROPOSED REFINEMENT**, not the current code. The real scorer is `computeMatchPct` in `src/scoring/match.ts`. §3 below diagnoses why it over-scores and gives the exact patch.

---

## 2. Concept → real module map

| Design concept (this handoff) | Already lives in | Status / action |
|---|---|---|
| Match scoring | `scoring/match.ts` (`computeMatchPct`, `evaluateMatch`, `checkRestrictions`) | **Exists.** Tune it — see §3. |
| Per-axis feedback ("judge card") | `scoring/match.ts` (`computeMatchBreakdown` → `AxisBreakdown[]`) + `ui/result-panel.ts` | **Exists** as data; make it a prominent visual (§4). |
| "Hates / no-wet" rules | `scoring/match.ts` `checkRestrictions` + `Audience.restrictions` | **Exists** (`no-wet`, `no-dairy`, `min-foods:N`, `min-stink:N`, `max-loud:N`, `need-cursed-or-rare`). Strengthen penalty (§3). |
| Discovery / reveal-on-use | `scoring/discovery.ts`, `state/axis-discovery.ts`, `scoring/food-mastery.ts`, `scoring/field-guide.ts`, `scoring/food-hint.ts` | **Exists.** Surface learned axes on the pantry tile (§4). |
| Recipes / emergent combos | `state/recipes.ts`, `scoring/fart-recipe.ts`, `scoring/hidden-combos.ts`, `scoring/region-recipes.ts` | **Exists** (synergies/conflicts/hidden combos). |
| Kitchen treatments | `scoring/treatments.ts`, `scoring/launch-resolver.ts`, `ui/kitchen.ts` | **Exists** (raw vs prepped launch path). |
| Fermentation rack | `state/ferment-rack.ts` | **Exists.** |
| Shop / economy | `state/shop.ts`, `ui/shop.ts`, `scoring/reward.ts`, `scoring/research.ts` | **Exists.** |
| Progression / locations | `state/location-progress.ts`, `state/containment.ts`, `state/run-state.ts`, `state/encounter-progress.ts`, `ui/map-screen.ts` | **Exists.** Region gates at ≥50 wins / recipes / bosses. Add a **per-encounter pass/retry gate** (§5). |
| Bosses | `state/bosses.ts`, `scoring/boss-match.ts`, `scoring/boss-reward.ts`, `ui/boss-arena.ts`, `state/boss-*` | **Exists.** |
| Audience reactions / VO | `scoring/audience-reactions.ts`, `audio/event-sfx.ts` (`playAudienceVoice`), `audio/sample-player.ts` | **Exists.** Feed it the pre-baked bank (doc 02). |
| Progressive disclosure | `ui/feature-intro.ts`, `ui/onboarding.ts` | **Exists.** Use for the unlocking dock. |
| Codex / notebook / trophies | `state/codex.ts`, `ui/notebook.ts`, `ui/codex.ts`, `state/trophies.ts`, `state/conquests.ts` | **Exists.** |
| Persistence | `state/persistence.ts`, `state/save-io.ts`, `ui/save-io.ts` | **Exists** (localStorage keys like `fart_best_<audId>`, `fart_locations_unlocked`). |
| Visuals (confetti/gas/particles) | `visuals/confetti.ts`, `visuals/gas.ts`, `visuals/reaction-particles.ts`, `ui/perfect-cinematic.ts`, `ui/splashes.ts` | **Exists.** |
| Haptics | `ui/haptics.ts` | **Exists.** |

**Net:** the systems are there. The redesign's real deliverables are (A) the **Order Ticket UI re-skin** across `ui/*` + `style.css`, (B) the **scoring tune** in `match.ts`, (C) a prominent **judge card** + inline pantry discovery in `result-panel.ts`/`pantry-grid.ts`, (D) a **per-encounter pass/retry gate**, (E) the **pre-baked audio bank**, (F) progressive-disclosure polish.

---

## 3. THE scoring fix (your "instantly 80%" bug)

**Diagnosis — exact.** `computeMatchPct` (`scoring/match.ts`) sums a per-axis cost
`cost = max(0, |actual − target| − 1)` over 7 axes, then normalizes against
`totalMax = 10 per axis × 7 = 70`. Two compounding problems make scores cluster high:
1. The **±1 free tolerance** means small misses cost nothing.
2. The **denominator (70) is far larger than realistic total diffs**, so even being off by ~3 on *every* axis → `totalDiff ≈ 14`, `pct = round((1 − 14/70)×100) = 80%`. That's precisely the "random plate still gets 80%" you saw.

**Fix (keep the function's signature + `FoodProperties`/`AxisBreakdown` shapes so `result-panel.ts` keeps working):**
- Replace the linear per-axis cost with the prototype's **steeper closeness curve** and a **weakest-link blend**, and normalize per-axis (so the denominator tracks the number of judged axes, not a flat 70). Port the math from `01-game-systems.md §3.4`:
  ```ts
  // per judged axis (use the audience's cravings; optionally weight axes the audience cares about):
  const v = actual[axis] / AXIS_CAP;          // AXIS_CAP ≈ 8 (or normalize by a realistic plate max)
  const t = target[axis] / AXIS_CAP;
  const closeness = Math.max(0, 1 - Math.pow(Math.abs(t - v), 0.85) * 1.5);
  // base = 0.55 * weightedAvg(closeness) + 0.45 * min(closeness)   // weakest-link
  ```
- **Make restrictions bite harder.** Today each violation is a flat −25% (`evaluateMatch`). Keep that, but *also* apply the prototype's multiplicative **hate penalty** (`base *= 1 − 0.65 * worstHateValue`) for "no-X" style rules so being the very thing they forbid tanks the score, not just dents it.
- Fold in the **charge multiplier** (×1.25 perfect / ×0.85 weak — `01 §3.5`) and **recipe effect** at the resolver level so the breakdown shows them.
- Re-derive grade/stars/pass from the new pct (`01 §3.6`): pass = ≥50, ★ at 50/68/80, S/A/B/C/F.

**Acceptance:** a random plate vs. Granny should now land **F**, and a deliberately-matched plate should clearly out-score it — verify against `design_reference/prototype/` numbers and the checklist in `05 §2`.

> Note: audiences communicate cravings as **prose hints** (`Audience.description`), never literal numbers, with clue density by `difficultyTier` (easy hints 4/7 axes … boss hints 1/7). The Order Ticket "craving chips" should render the *hinted* axes, preserving this — don't expose raw target integers.

---

## 4. Make feedback + discovery prominent (data already exists)

- **Judge card:** `computeMatchBreakdown` already returns `{axis, actual, target, cost, matched}` per axis and `result-panel.ts` already consumes it. The work is **visual**: render it as the Order Ticket judge card (`04 §3`) — per-axis bar + dashed target marker + ✓/~/✗ from `matched`/`cost`, with the wanted/hated label. Don't rebuild the data layer.
- **Inline pantry discovery:** `state/axis-discovery.ts` + `scoring/food-mastery.ts` already track revealed axes & mastery. Surface them on the tile in `ui/pantry-grid.ts` (axis emoji + value for revealed, `·` for hidden, ✨ for untouched) so players don't open the field guide mid-decision. `ui/axis-emoji.ts` already maps axes→emoji.

---

## 5. The per-encounter pass/retry gate (the real gap)

Region unlocks already gate on `countAudienceWins() ≥ 50` (a "win" = `fart_best_<audId>` ≥ 50, in `location-progress.ts`). But **within** a location the player cycles encounters (`run-state.ts` / `encounter-progress.ts`) with no per-show fail-stop — which is why every show felt like a pass. Add the prototype's beat (`01 §4`):
- After a launch, if `pct < 50` (a flop), the result panel offers **only "Try this crowd again"** (re-roll the same encounter), not "advance."
- On a pass, offer **"Improve"** (replay for a better `fart_best_`) and **"Next"**.
- Keep the anti-grind rule: gold pays only the *improvement* over the stored `fart_best_<audId>` (the repo already stores that key — reuse it).
- Stars per encounter drive the venue-ladder node states (`ui/map-screen.ts` can host or feed the ladder visual from `04 §7`).

---

## 6. Audio reconciliation

The 5-layer model maps onto: `audio/sample-player.ts` (pre-baked clips — **the bank goes here**, in `public/sfx/`), `audio/event-sfx.ts` (`playEventSfx`, `AUDIENCE_REACTION_SFX`, `playAudienceVoice` already exist), `audio/procedural.ts` (fallback only — not the shipped fart), `audio/audio-settings.ts` (the 4 channels + mute) and `ui/audio-popover.ts` (settings UI) + `ui/haptics.ts`. Generate the ~200-clip bank per `02 §3`, wire the clip-selector (`02 §4`) into `event-sfx`/`sample-player`, and drive `playAudienceVoice` from the per-crowd VO lines. The repo already has a `scripts/` SFX-generation entry to extend.

---

## 7. Suggested order against the real repo

1. **`scoring/match.ts`** — land the scoring fix (§3) behind the existing function signatures; unit-test vs. prototype numbers. *(Biggest gameplay win, lowest UI risk.)*
2. **`ui/result-panel.ts`** — promote the breakdown to the judge card + add the pass/retry footer (§5).
3. **`ui/pantry-grid.ts` + `ui/plate.ts`** — inline discovery + the recipe ribbon, in Order Ticket styling.
4. **`style.css` + the `ui/*` screens** — roll out the Order Ticket design system (`04`).
5. **Encounter gate** — wire pass/retry/improve into `run-state`/`encounter-progress` (§5).
6. **Audio bank** (§6) + **progressive disclosure** via `ui/feature-intro.ts`.
7. **Content + balance tuning** with the knobs centralized (`05 §3`).

Keep `design_reference/prototype/` open throughout as the behavioral oracle for the *new* scoring, discovery reveal order, charge timing, and the judge-card/retry UX.
