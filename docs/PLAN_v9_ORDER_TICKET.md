# PLAN v9 — The Order Ticket Redesign (implementation + test plan)

> Source: `design_handoff_fart_factory/` (docs 01–06 + the React prototype in `design_reference/prototype/`).
> Ground truth for *current code state* is this repo (verified against source, not the handoff's claims).
> Baseline at plan time: **673 unit tests green / 71 files**, package `v9.0.0`.
> Method: **red/green TDD** per the user's global rules — every behavioral change gets a failing test first.

---

## 0. The one-paragraph truth

The handoff frames this as "everything already exists, just re-skin + tune." That is **true for the game-logic
modules** (discovery, recipes, treatments, shop, bosses, persistence, the audio *bank*) and **materially
understates** four things, each independently **XL**: (A) the scoring fix, (B) the full Order-Ticket *visual
re-skin* (style.css has **zero** design tokens today — it's dark-glow Comic-Sans), (C) the **per-encounter
pass/retry gate** (a genuinely missing mechanic — today every show advances), and (D) the audio **"readout"**
(the fart is a length-only jukebox, not an axis-driven readout; captions are absent). This plan sequences the
work by its real dependency graph and writes the failing tests first.

---

## 1. Decisions that had to be pinned (resolved, with rationale)

These were blocking: every asserted scoring number depends on them. Defaults chosen; **flagged where the user
may want to override** (see §9).

| # | Decision | Resolution | Why |
|---|---|---|---|
| D1 | **Target normalization** `/8` vs `/5` | **actual `/AXIS_CAP=8`, target `/5`**; centralize in `tuning.ts` | `/5` lands the design goals (random plate → F, a matched plate → pass); `/8` compresses everything to ~50 and even a good plate is marginal. It's a tuning knob (05 §3). |
| D2 | **Which numbers to assert** (prototype vs real catalog) | **Two suites.** `prototype-parity.test.ts` locks the *algorithm* against **synthetic prototype-stat fixtures** (the exact 10 foods/4 crowds/6 recipes from `ff-data.js`). `match-real-catalog.test.ts` asserts **grades/ordering only** against real content (empty=F, matched > random, hate tanks). | The prototype's "2 broccoli = 61% C" is **not reproducible** on the real catalog (real broccoli `musical:0` vs prototype `musical:3`). Proving the math on prototype fixtures + grading real content is the only honest way to test both. |
| D3 | **Recipe matching** subset vs exact-set | **Keep real EXACT-SET** (and live-detect with it for the ribbon) | Doc 05 §2 acceptance ("extra unrelated foods suppress the recipe") agrees with the real code; the prototype's *subset* behavior is buggy dead-code (the `ok` no-extras clause is OR'd with `subset`, so it never bites — confirmed by the oracle agent). Deviates from "prototype wins" but matches the explicit acceptance criterion. |
| D4 | **`crowd.gold` source** | **Add optional `baseGold?` to `Audience`**, default from `difficultyTier` via a map in `tuning.ts` | The anti-grind formula needs a per-crowd "gold at 100%". Defaulting from tier avoids hand-authoring 20 values on day one; can be tuned later. Keep `goldForMatch` for Sandbox. |
| D5 | **Diminishing multiplier vs earnedGold** | In **Story mode, replace** the within-encounter `MULTIPLIER_BY_LAUNCH` with the cross-encounter **earnedGold improvement-only** model (prototype has no diminishing multiplier). Keep the multiplier code for any non-story caller. | Two anti-grind systems stacked would zero gold. Prototype = earnedGold only. Balance decision — flagged. |
| D6 | **`classifyCriticalTier` vs new grade** | **Coexist, separate jobs.** New `gradeForPct` (S/A/B/C/F @ 90/80/68/50) drives the **stamp + judge card + stars + pass gate**. Existing `classifyCriticalTier` (perfect/great/…) stays as the **cinematic/celebration** trigger only. Never render both labels in one spot. | Different cutoffs, different purposes; retiring `classifyCriticalTier` would break `critical-tier.test.ts` + the perfect cinematic. |
| D7 | **"Venue" window** for the ladder | A venue = **the current region's ordered audience roster** (region-scoped ladder); node states from that roster + per-audience stars + current position. | The real game is an unbounded encounter counter (boss-cadence), not a fixed 4-node path. Region roster is the natural bounded window. Flagged for design confirmation. |
| D8 | **Audio readout: stems vs whole-clips** | **Defer to Phase 6.** Recommend generating axis **stems** via the existing ElevenLabs pipeline (has real API $ cost) over layering atop 14 whole comedic clips (won't sound legible). | The bank exists but the fart isn't a readout. This is the design's central audio promise and an XL build with $ cost — last, and explicitly costed. |

**Single source of constants:** create `src/scoring/tuning.ts` exporting `AXIS_CAP=8`, `BELLY_MAX=10`,
`POW=0.85`, `CURVE_MULT=1.5`, `BLEND_AVG=0.55`, `BLEND_MIN=0.45`, `HATE_COEFF=0.65`,
`CHARGE={perfect:1.25, good:1.10, weak:0.85, ok:1.0, tap:1.0}`, sweet zone `[74,92]`, good `[62,98]`,
`weak<28`, `tapMs<200`, `PASS=50`, grade cuts `{S:90,A:80,B:68,C:50}`, star cuts `{3:80,2:68,1:50}`,
`TARGET_DIV=5`, and `GOLD_BY_TIER`. Every scoring/charge/gate/judge-card module imports from here so the
live-balance pass (05 §3) is one file.

---

## 2. The verified scoring oracle (test fixtures)

**Algorithm (port of `computeLaunch`, `ff-app.jsx:43-106`)** — assert these on **synthetic prototype fixtures**:

```
normalize: v = min(1, raw/8); target t = protoTarget (already 0–1)   [real path: t = craving/5]
per want:  dist = |t − v|;  closeness = max(0, 1 − dist^0.85 · 1.5)
base = 0.55·(Σ w·closeness / Σ w) + 0.45·min(closeness)
base *= (1 − 0.65 · maxHateAxisValue)          # "no-X" axes
final = min(1, base + recipeBonus);  final = min(1, final · chargeQuality)
pct = round(final·100); grade S/A/B/C/F @ 90/80/68/50; stars 3/2/1 @ 80/68/50; pass ≥ 50
```

Golden numbers (verified twice — oracle agent **and** my hand-trace):

| Case (prototype fixtures) | base | final | pct | grade/★ |
|---|---|---|---|---|
| 1× broccoli vs Granny (tap) | 0.342 | 0.342 | **34** | F / 0 |
| 2× broccoli vs Granny (tap) | 0.610 | 0.610 | **61** | C / 1 |
| kombucha+broccoli = Lullaby (musical×1.7) vs Granny (tap) | 0.694 | 0.694 | **69** | B / 2 |
| …same, **perfect charge** ×1.25 | — | 0.867 | **87** | A / 3 |
| Fizz (wet×1.6) vs Critic-Bot **(hates wet)** | 0 | 0 | **0** | F / 0 |
| beans+pepper vs Frat, **perfect** ×1.25 | 0.407 | 0.509 | **51** | C / 1 |
| …same plate, **weak** ×0.85 | 0.407 | 0.346 | **35** | F / 0 |
| Inferno (heat×1.8) vs Frat (tap) | 0.733 | 0.733 | **73** | B / 2 |

**Charge** (`chargeQuality(value, heldMs)`): `held<200`→1.0 *tap* (short-circuits first); `[74,92]`→1.25
*perfect*; `[62,98]`→1.10 *good*; `<28`→0.85 *weak*; else 1.0 *ok*.

**Real-catalog grade tests** (assert grade/ordering, NOT exact %): empty plate vs Granny → **F** (today bug: 94);
a deliberately-matched plate clearly out-scores a random one; a wet plate vs a `no-wet` audience tanks vs the
same plate vs a non-hating audience. (Real numbers with D1 `/5`: 1×broccoli 37 F, 2×broccoli 21 F, wet-vs-royal 13 F.)

**Reveal-on-use order** (`ff-app.jsx:174-185`), highest-value-axis-first, one per launch:
broccoli → musical→stink→loud; beans → stink→loud→dry; egg → stink→dry. adj: ≥5 SUPER ·≥4 really ·≥3 pretty ·≥2 a little ·else barely.

**Reward** (`ff-app.jsx:194-209`): gold `max(0, round(baseGold·final) − earnedGold[id])` then store new best;
notes `(passed?1:2)+(newRecipe?2:0)+(anyLearned?1:0)` (a **flop pays more base notes**); stars `max(prev, this)`.

---

## 3. Phased plan (dependency-ordered, test-first)

Each phase: **RED** (write failing tests) → **GREEN** (minimal impl) → **VERIFY** (unit + behavioral) →
**RECONCILE** (existing tests to update). UI phases require **Rule 3** behavioral verification (Preview MCP at a
phone viewport) — "tests pass" is necessary, not sufficient.

### Phase 0 — Foundations (no UI, pure data) · effort M · ✅ DONE (commit 9ba33f5)
**Goal:** make the rest writable. No behavior visible to the player yet.
- **NEW** `src/scoring/tuning.ts` (all constants, §1). RED: `tuning.test.ts` asserts the pinned values.
- **MODIFY** `src/state/audience.ts`: add `deriveWants(audience) → {axis,target(0–1),weight,hate}[]` mapping
  non-zero `cravings` (target=craving/5, weight=1) + `restrictions` (`no-wet`/`max-*` → `hate`). Add optional
  `baseGold?`. **Keep** `cravings`/`restrictions`/`description`/`difficultyTier` intact. RED: `audience.test.ts`
  new cases — `deriveWants(granny)` yields a `musical` want + a `loud`/whatever hate from its restriction;
  never leaks raw integers to chips.
- **MODIFY** `src/state/persistence.ts`: four corruption-safe stores (mirror existing `safeLoad`/`safeSave`):
  `loadEarnedGold/bumpEarnedGold` (`fart_earned_<id>`), `loadStars/bumpStars` (`fart_stars_<id>`, max),
  `loadEquippedTreatment/setEquippedTreatment` (`fart_treatment`), `loadIntroShown/markIntroShown`
  (`fart_intro_<id>`). RED: `persistence.test.ts` additive cases (default 0/0/null/false; ratchet/idempotent).
- **VERIFY:** `npm test` — new files green, **all 673 existing still green** (changes are additive).

### Phase 1 — Scoring core + charge math · effort L · ✅ DONE (commit 0884b69)  *(06 §7 step 1 — biggest gameplay win, lowest UI risk)*
**Goal:** the "instantly 80%" fix, behind existing signatures.
- **NEW** `src/scoring/charge.ts`: pure `chargeQuality(value, heldMs)`. RED: `charge-meter.test.ts` (all 5 bands + the `<200ms` short-circuit).
- **NEW** `tests/unit/prototype-parity.test.ts` + a small `tests/fixtures/proto.ts` (the prototype's foods/crowds/recipes). RED: asserts every golden number in §2 table.
- **MODIFY** `src/scoring/match.ts`:
  - Rewrite `computeMatchPct(actual, target)` → closeness curve + weakest-link blend + per-axis normalize (D1). **Keep the `(actual,target)→number` signature.**
  - `evaluateMatch`: after pct, derive `worstHate` from `no-X` restrictions and apply `base*=(1−0.65·worstHate)` **in addition to** the existing −25%/violation (06 §3). Add optional `quality=1` param → `final*=quality`.
  - Add `gradeForPct` / `starsForPct` / `passedForPct` helpers.
  - Add `computeAxisFeedback(actual, audience)` → `{axis,hate,wantHigh,target,got,status:hit|near|miss,closeness}[]` (status @ 0.8/0.55) for the judge card. **Do NOT change** `computeMatchBreakdown`'s `{axis,actual,target,cost,matched}` shape (back-compat).
- **MODIFY** `src/scoring/launch-resolver.ts`: thread optional `quality` so charge folds in at the resolver (06 §3) and shows in the breakdown.
- **NEW** `tests/unit/match-real-catalog.test.ts` (grade/ordering only, §2). RED: empty-plate-vs-Granny=F.
- **RECONCILE (will break — rewrite to new oracle):** `match.test.ts` (identity≠100 now), `match-breakdown.test.ts` (keep cost/matched, add closeness assertions), `critical-tier.test.ts` (unchanged — D6 keeps it).
- **VERIFY:** full suite green on the new numbers.

### Phase 2 — Judge card + reaction takeover + pass/retry gate · effort XL · ✅ DONE  *(06 §4, §5)*
**Goal:** feedback you can read; flops can't advance.
- **NEW** `src/ui/reaction-overlay.ts` (ports `Reaction`): opaque full-screen `#reactionOverlay`, single status bar, crowd-faces, slam **grade stamp** (from `gradeForPct`), verdict+VO caption bubble, star slam, **judge card** (from `computeAxisFeedback`), breakdown card, toasts, footer. RED: `reaction-overlay.test.ts` — mounts covering screen; **footer = one "Try this crowd again" on fail; "Improve"+"Next" on pass; "Finish …" on boss**.
- **NEW** `src/ui/charge-meter.ts` (ports `BlastButton`): rAF sweep 2.2/frame, sweet zone marker, pointer hold/release → `quality` via `charge.ts`. RED already in `charge-meter.test.ts` (pure fn); component mount verified behaviorally.
- **MODIFY** `src/ui/result-panel.ts`: render the judge card + breakdown into the overlay; expose footer states.
- **MODIFY** `src/ui/plate.ts`: blast button → hold-to-charge; `onStoryLaunch(quality)`; **route to overlay**, **gate advance on `passed`** (no `incrementEncounter` on flop), bump `stars[id]`, gold via **earnedGold anti-grind** (D5).
- **MODIFY** `src/scoring/reward.ts`: add `awardGoldForEncounter(id, baseGold, final)` = improvement-only (keep `goldForMatch`/`awardGoldForLaunch` for other callers). RED: `encounter-gate.test.ts` — re-clear pays only the difference.
- **MODIFY** `index.html`: add `#reactionOverlay`, `#chargeMeter` markup; gate `#moveOnBtn`.
- **RECONCILE:** `reward.test.ts` (story path now improvement-only), `encounter-progress.test.ts` (D5), any `#storyResult`/`#audienceReaction` assertions.
- **VERIFY (Rule 3):** Preview at 375×667 — overlay fully covers play screen (no bleed-through, one status bar); fail shows only retry; pass shows Improve+Next; a perfect charge shows ×1.25 in the breakdown and bumps the grade. Screenshot proof.

### Phase 3 — Discovery surfaced + recipes + grants · effort L  *(06 §4 / 01 §6)*
- **NEW** `src/state/food-reveals.ts`: per-food revealed-axis store (`fart_food_reveals_<id>`) + `revealNextAxisForFood(id)` (highest-value unrevealed nonzero axis). RED: `food-reveals.test.ts` — reveal order matches §2; mastery = all axes + ≥5 uses.
- **MODIFY** `src/ui/pantry-grid.ts`: inline `.pax` strip — revealed axes `emoji+value`, `·`×hidden, `✨` when uses=0. Optional `getRevealedAxes(id)` param (default `()=>[]` so `pantry-collapse.test.ts` survives).
- **MODIFY** `src/ui/plate.ts`: wire `revealNextAxisForFood` into the launch path (per unique food); pass reveals into the pantry; **live recipe ribbon** via the real `matchRecipe` (D3) on plate change; **novelty-combo bonus** note (01 §6.5).
- **NEW mechanic — food-grants-on-intro** (uncovered acceptance, 05 §2/01 §7.4): add `grant?` to `Audience` + wire intro-card dismissal to add the food to the pantry. RED: `crowd-grant.test.ts` — Granny grants broccoli, Frat grants pepper, once.
- **VERIFY (Rule 3):** fresh food shows ✨+dots; after one launch its strongest axis appears on the tile + field guide; `kombucha+broccoli` shows the Lullaby ribbon **before** blasting; extra foods suppress it.

### Phase 4 — Order Ticket visual language · effort XL  *(04 §1 — full re-theme; no scoring dep)*
- **NEW** `tests/unit/design-tokens.test.ts` (parse `style.css` text → `:root` defines the 14 tokens) and `fonts-loaded.test.ts` (index.html links Baloo 2 / Nunito / Space Mono; body no longer Comic Sans). RED today.
- **MODIFY** `index.html`: load the 3 webfonts.
- **MODIFY** `src/style.css`: add `:root` tokens; invert palette to **paper-ink**; replace press idiom (`scale(0.95)` → `translate(2px,2px)` + collapse hard-offset shadow) everywhere; toxic-green `.launch`; 2px scanline paper texture. **Retain existing class names / DOM ids** (re-theme in place — do NOT rename to the prototype's `.ticket/.pcell/.blast`) so `ui/*.ts` and geometry tests don't churn.
- **NEW** `src/ui/crowd-ticket.ts` (ports `Ticket`): want/no chips from `deriveWants` (no raw integers), diff pips, speech bubble. RED: `crowd-ticket.test.ts`.
- **NEW** `src/ui/dock.ts` (Stage·Shop·Kitchen·Book·Venue, active/locked, Kitchen-orange-when-equipped, progressive disclosure via `feature-intro` unlock state). RED: `dock.test.ts`.
- **MODIFY** shop/kitchen/notebook(lab-book) to the Order-Ticket card language (04 §4/§5/§6) — **uncovered re-skin scope** flagged by the audit.
- **VERIFY (Rule 3):** `order-ticket-theme.spec.ts` e2e — body bg = paper cream, launch button shadow matches `/\d+px \d+px 0px/` (zero blur); `touch-targets.spec.ts` still ≥44px; screenshot the play screen.

### Phase 5 — Progression screens · effort L  *(04 §7/§8/§9/§10)*
- **NEW** `src/ui/venue-ladder.ts` (ports `Ladder`, D7 region-scoped): node states done/current/locked/rare/boss from per-crowd stars + position; NEW FOOD/VIP tags; next-crowd footer; "Play {next} ▶". RED: `venue-ladder.test.ts` (node-state + next-crowd selector — DOM not reachable in vitest).
- **MODIFY** `src/ui/boss-arena.ts`: orange-hazard reskin that consumes the new scoring/charge/judge-card/gate (uncovered).
- **MODIFY** `src/ui/intermission.ts`: the 3 choice cards incl. **Practice +20%-loud-next-blast** (a NEW scoring input — thread a one-shot buff) + Forage; fire on pass→Next, not on flop.
- **MODIFY** `src/ui/onboarding.ts`: add the **3rd card** (doc 03 §6 copy) — uncovered; **RECONCILE** `onboarding.test.ts` (length 2→3).
- **Accessibility:** reduced-motion fallback so nothing renders at `opacity:0` (05 §2) — RED `reduced-motion.spec.ts`.
- **VERIFY (Rule 3):** ladder shows cleared/current/locked correctly; boss flow scores via the new system.

### Phase 6 — Audio · effort XL  *(02 — partly built; the readout is the real work)*
- **MODIFY** `src/audio/audio-settings.ts`: 2→**4 channels** (Master/Farts&SFX/Voices/Music) + `captionsEnabled` (default **true**) + `hapticsEnabled`; migrate the localStorage shape. **RECONCILE** `mute.test.ts`.
- **MODIFY** `src/audio/event-sfx.ts`: gate `playAudienceVoice` on **Voices**; add music bed (Music); emit a `{character,text}` **caption** payload. **NEW** `src/ui/caption-bubble.ts` (on by default). RED: `audio-channels.test.ts`, `captions.test.ts`.
- **MODIFY** `src/ui/audio-popover.ts` → promote to the **Sound settings screen** (04 §11): 4 sliders + Captions + Rumble toggles.
- **THE READOUT (D8, costed):** axis-driven layered selector in `sample-player.ts` — `pickBaseRip(wet,dry,lenBucket)` + `pickMelody(musical)` + `pickSizzle(temp)` + `pickHazeTail(stink)`, `gain=0.18+loud*0.7`; feed it the **same normalized `ax`** the scorer produces. Needs **new stem assets** via the ElevenLabs pipeline (real $). RED: `clip-selector.test.ts` (stems chosen per axis thresholds + gain formula). **RECONCILE** `sample-player.test.ts` (keep whole-clip path as fallback), `manifest-integrity.test.ts`, `sfx-seeds.test.ts`.
- **VERIFY (Rule 3):** a wet recipe sounds wet, a musical one plays notes (perceptual, by ear); captions show by default; 4 channels independent.

### Phase 7 — Content + balance + ship · effort M
- Live-balance tuning via `tuning.ts` (incl. **optional**: retune real Granny/broccoli so the teaching examples land — see §9). Expand regions/recipes (03 §7) for economy room. Full e2e + lighthouse + axe a11y pass.

---

## 4. Acceptance-criteria traceability (doc 05 §2 → phase)

| Acceptance | Phase | Test |
|---|---|---|
| Random plate vs Granny → F, only "Try again" | 1, 2 | `match-real-catalog`, `encounter-gate` |
| Hate violation tanks the score | 1 | `match-hate-penalty` / parity |
| Perfect charge ×1.25 shows in breakdown | 1, 2 | `charge-meter`, behavioral |
| Grade/stars/pass thresholds exact | 1 | `match-grade-stars`, parity |
| Fresh food ✨/dots → strongest axis after 1 launch | 3 | `food-reveals` + behavioral |
| Mastery flips the perk and affects scoring | 1, 3 | parity (perk) + `food-mastery` |
| `kombucha+broccoli` ribbon before blast; extras suppress | 3 | behavioral + recipe (D3) |
| Can't reach crowd N+1 without passing N | 2 | `encounter-gate` |
| Re-clear pays only the improvement | 2 | `encounter-gate` (earnedGold) |
| Granny grants broccoli, Frat grants pepper | 3 | `crowd-grant` |
| Shop gates on gold/ownership | 4 | existing `shop.test` + behavioral |
| Beating the boss reaches region-clear | 5 | behavioral |
| No runtime audio generation | 6 | existing manifest tests hold |
| 4 channels + mute + captions-default + haptics | 6 | `audio-channels`, `captions` |
| Reaction overlay fully covers, one status bar | 2 | behavioral (Rule 3) |
| Press feedback everywhere; no `opacity:0` under reduced-motion | 4, 5 | `order-ticket-theme`, `reduced-motion` |
| Tap targets ≥44px | 4 | existing `touch-targets.spec` |

---

## 5. Existing tests that WILL break (and the fix)

`match.test.ts` (rewrite to new curve) · `match-breakdown.test.ts` (keep cost/matched, add closeness) ·
`reward.test.ts` (story gold → improvement-only) · `encounter-progress.test.ts` (D5 multiplier decision) ·
`onboarding.test.ts` (2→3 cards) · `mute.test.ts` (2→4 channels) · `sample-player.test.ts` /
`manifest-integrity.test.ts` / `sfx-seeds.test.ts` (stem category). All others should stay green if changes are
**additive with safe-default params** (the `getMasteryUses=()=>0` pattern).

**Do NOT "fix" the region gate to 50** — doc 06 §5's "≥50 wins" is wrong; real code unlocks at **≥5 wins**
(`locations.test.ts` pins it). Trust code+test over doc prose here.

---

## 6. Risk register

1. **Prototype numbers ≠ real catalog** (highest). Mitigated by D2 (synthetic fixtures + grade-only real tests). Watch: an implementer chasing the prototype %s against real foods will "fix" a correct scorer.
2. **Encounter-spine rewrite** (`#moveOnBtn` → pass-gated footer) has high blast radius (plate.ts, intermission, run-state, encounter-progress) and can soft-lock the player — needs behavioral verification, not just unit tests.
3. **Re-skin scope** — 4 XL areas; `style.css` is a 2942-line dark-glow re-theme from zero tokens. Don't under-budget.
4. **Audio readout cost** — D8 needs real ElevenLabs $; captions are a non-negotiable a11y gap.
5. **Charge seam** — UI computes `quality`; scorer multiplies. One canonical contract (`launch-resolver(quality)`) or the breakdown line won't match the headline pct.
6. **`Audience` shape gap** is upstream of the scorer, ticket, judge card, and anti-grind — land `deriveWants` (P0) before anything reads wants.

---

## 7. Sequencing (the critical path)

`tuning.ts + deriveWants + persistence (P0)` → `match.ts + charge.ts (P1)` → `judge card + reaction + gate (P2)`
→ everything else. **Phase 4 (visual) has no scoring dependency** and can run in parallel with P1–P3 by a second
worker. Audio (P6) sequences after scoring normalization settles (shared `ax`). 

---

## 8. Verification doctrine (per the user's rules)

- **TDD red/green, test-first, deterministic** (freeze seeds; use 100%-deterministic plates). 
- For DOM/visual/audio behavior unreachable by vitest: write the **data-shape test that IS reachable**, then **verify the unreachable part directly** via Preview MCP at a phone viewport (overlay coverage, charge feel, theme render, the fart-by-ear) before claiming "done." "Tests pass" ≠ "feature works."
- Keep the suite green on every commit (pre-commit hook gates green; test-first is on us).

---

## 9. Decisions — LOCKED by user (2026-06-07)

- **A. Build ambition:** **FULL — P0 through P7**, including the axis-driven audio readout. Nothing deferred.
- **B. Content fidelity:** **RETUNE real content** so the intended teaching examples land (e.g. make the real
  Granny/broccoli pairing reproduce the "learn musical by launching broccoli" beat). This becomes an explicit
  work item folded into P1/P3 (and finalized in P7), not an optional polish. Synthetic prototype fixtures still
  lock the algorithm; real-catalog tests get re-baselined to the retuned content with real target numbers.
- **C. Audio readout (D8):** **GENERATE NEW STEMS** via the ElevenLabs pipeline (base rips / melody octaves /
  sizzle / haze) — accept the API cost — so the fart is a legible per-axis readout. Phase 6.
- **D. Execution:** **START P0 + P1 NOW** (test-first). Report back before the UI phases (P2+).

> Note on B: retuning real content means the real-catalog scoring tests assert **specific retuned numbers**, not
> just grades. The synthetic `prototype-parity` suite is unaffected (it owns the algorithm proof).
