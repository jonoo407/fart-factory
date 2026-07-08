# PLAN v10 — HOLD IT IN (implementation + test plan)

> Source design: `docs/REDESIGN_v10_PROPOSAL.md` (§3 loop · §4 progression · §5 skill curve ·
> §6 UI). User approved all four sections + the §4.7/§5/§6 pins; "ok go" on 2026-07-08.
> Method: red/green TDD per the global rules — every behavioral change gets a failing test first;
> all randomness seeded (mulberry32, per-show seeds via `encounterSeed`); Rule 3 behavioral
> verification via Preview MCP at a phone viewport for every UI phase.

---

## 0. The one-paragraph truth

This is a **core-loop replacement**, bigger than v9's re-skin: the batch loop (plate → charge →
match% → judge card) is deleted and replaced by a streaming loop (bite → risk roll → release →
vignette). The meta layer (ladder, bosses, shop, kitchen, quests, persistence) survives with
re-pointed inputs. The two structural risks are (A) **tuning** — push-your-luck collapses into a
slot machine unless the §5.4 gates hold, so the gates are written as *tests in P0* and tuning
constants are turned until they pass; and (B) **the cutover** — main deploys the kid's live game,
so v10 is built additively in `src/v10/` and swapped in at **milestone merges** that keep main
playable at every point (this deliberately overrides the merge-every-PR default for the one merge
that would otherwise ship half a game). The e2e suite encodes the batch flow and is rebuilt at M2.

---

## 1. Pinned decisions (D1–D12)

| # | Decision | Resolution |
|---|---|---|
| D1 | **Pressure scale & zones** | Meter 0–20 (existing belly-size scale: foods contribute `foodBellySize` 1–6). Zones: POLITE 1–5 ×1 · SOLID 6–10 ×2 · EPIC 11–14 ×3 · LEGENDARY 15–18 ×5. A bite landing **>18 = guaranteed bust** ("the summit is 18"). |
| D2 | **Risk model** | Per-bite seeded roll at stuff time: `bustChance = ZONE_RISK[zone(pressureAfter)] × size²`. **size² is load-bearing**: it makes descending-size order (the Pyramid) first-order optimal — a provable sequencing theorem, tested in P0. Starting `ZONE_RISK = {POLITE: 0, SOLID: 0.001, EPIC: 0.0035, LEGENDARY: 0.008}` — knobs; the §5.4 gates are the tuner of record. |
| D3 | **Clench** | Vents 2 pressure; 2 per show base; wobble window 1.2 s after a surviving risky bite; state-class-driven (no rAF dependency — headless-testable, per the known preview limitation). |
| D4 | **Tags from existing food axes** | `stink/loud/musical/temp ≥ 3` → 1× STINKY/LOUD/TOOTY/BLAZING; `= 5` → 2× that tag. `wet vs dry` (whichever ≥ 3) = texture, audio-only. Pure derivation — the 30-food catalog is untouched content. |
| D5 | **Crowd taste from existing cravings** | Top-2 tag-axes with craving ≥ 3 → **LOVES**; `no-X`/`max-X` restrictions (and craving 0 axes flagged hateful in prose) → at most one **HATE**. Zone demand by `difficultyTier`: easy none · medium SOLID+ · hard EPIC+ · boss scripted. Mechanical conversion; all 20 audiences survive. |
| D6 | **Applause** | `APPLAUSE_BASE(10) × zoneMult × (1 + 0.5·lovedTagHits) × venueMod × toolMods`; unmet zone demand ×0.5; HATE tag present → SCANDAL: ÷4 + Scandal Card. Bust → Disaster Card + pity applause (×0.15 of banked-equivalent). Encore falloff ×0.75ⁿ, floor ×0.25. Gold = applause 1:1; FAME += applause, never decreases. |
| D7 | **Fame ranks** | 12 ranks; threshold(n) ≈ 40 × 1.6ⁿ⁻¹ (knob). Ranks 1–8 grant a 1-of-3 gut pick from a 9-upgrade v1 pool (3 per line: Capacity / Control / Chaos, per §4.1); 9–12 titles + stage tiers. |
| D8 | **Drops** | Per-crowd themed tables, owned-filtered, rolled per show; pity = guaranteed drop every 3rd dry show per region. Seeded from show seed. |
| D9 | **Performer v1** | A CSS/emoji-rigged placeholder (round body, emoji face states, belly scale transform, sweat layers) driven entirely by state classes `p-polite … p-wobble, p-bust`. Final art identity (§6.7 Q1) stays open; the rig's skin is swappable. |
| D10 | **Save migration** | On first v10 boot: carry pantry, gold, and unlocked regions; stars/mastery/history freeze into a read-only **"Legacy" album page** (nothing feels confiscated); FAME starts at 0 — the Rise must be risen. Old keys retained under a `v9_` prefix for rollback. |
| D11 | **Region-atom scope** | v10.0 ships Hometown (pure loop) + City (hazards + tools). Wilderness (wild foods), Royal (flips + encore chains), Cosmic (zero-G + ✨) trail as v10.1/v10.2 content phases on the shipped engine. All five regions stay *playable* at v10.0 (crowds/venues work; atoms arrive per phase). |
| D12 | **Redesign §3.10 questions — closed** | Q1 dice, visible as body language (per §5.2). Q2 two parameterized vignette templates v1 (per §6.6). Q3 no grades for anyone; min-maxers get records, clean badges, Slow Cooker % (per §5.3). Q4 party mode → backlog, out of v10. |

## 2. Milestones & merge strategy (the one deviation from merge-every-PR)

| Milestone | Contents | Merge rule |
|---|---|---|
| **M1** | P0–P1: pure engine + gates green + taste/tag conversion | merge freely — additive `src/v10/`, live game untouched |
| **M2** | P2–P4: stage UI, payoff flow, economy — **the cutover** | one milestone merge; main goes v9→v10 playable (Hometown+City) in a single step; save migration ships here |
| **M3** | P5–P6: ranks/gut picks + Album/records/cards/relics | merge per phase |
| **M4** | P7: Wilderness/Royal/Cosmic atoms | merge per atom |
| **M5** | P8: deletion sweep, e2e rebuild, a11y, balance re-run | merge per phase |

Gate rule: the three §5.4 gates run in CI from P0 onward and **block every merge that touches
tuning constants**.

## 3. Phases (each: RED → GREEN → VERIFY → RECONCILE)

### P0 — The engine + the gates (pure, seeded, no UI) · effort L
**NEW** `src/v10/`: `tuning.ts` (all D1–D8 constants) · `rng.ts` (mulberry32 extract) ·
`pressure.ts` (zones, summit, applause mults) · `show.ts` (one-show state machine:
stuff/roll/wobble/clench/release/bust; fully deterministic per seed) · `policies.ts` (NOVICE +
EXPERT simulators for the gates).
**RED:** `v10-tuning` (pin constants) · `v10-pressure` (zone boundaries, summit auto-bust) ·
`v10-bite-risk` (formula, POLITE/SOLID-floor zero, monotonicity, size² convexity) ·
`v10-sequencing` (**the Pyramid theorem**: for any 3–6-bite multiset of real food sizes reaching
≥15, descending order has strictly lower total risk than ascending when zones are crossed —
enumerated, no RNG) · `v10-show` (state machine transitions; same seed ⇒ same show) ·
`v10-gates` (**skill-delta ≥3× median · no-solved-threshold ≥20% · bust-tolerance 15–30%**, 200
seeded shows/policy over a context model: random 8-food hands from `FOODS`, demand mix
30/30/25/15, venue risk mods ±). Context model upgrades to real crowds in P1 and the gates re-run.
**GREEN:** implement minimally; then tune `ZONE_RISK`/demand-penalty until gates pass; record
final constants in `tuning.ts` with the gate numbers in comments.

### P1 — Taste, tags, applause (pure) · effort M
**NEW** `src/v10/tags.ts` (D4) · `src/v10/taste.ts` (D5 conversion from `AUDIENCES`) ·
`src/v10/applause.ts` (D6). **RED:** every food yields ≥1 tag or is a texture-only garnish; every
audience derives 1–2 LOVES + ≤1 HATE + a zone demand; a **reachability suite** (v9's balance-test
descendant): for all 20 audiences a LEGENDARY, demand-meeting, non-scandal show exists from a
starter+uncommon pantry; scandal path math; encore falloff; gates re-run on real crowds.

### P2 — The Stage (one-screen UI + performer rig) · effort XL
**NEW** `src/v10/ui/stage.ts` + performer rig (D9). One-screen zero-scroll layout (§6.1): ticket
w/ LOVES/HATES chips + tools drawer stub · crowd row (emoji, lean-in states) · performer (belly
scale = pressure, zone arc, sweat/cheek risk states, wobble) · brew chips · food tray (horizontal,
thumb zone) · RELEASE. Eat chain: tap → fly → chomp → inflate, all state-class transitions.
**RED:** DOM/state tests (mount, tray renders owned foods, tap dispatches stuff, performer class
reflects zone/risk buckets, clench via belly tap + mirrored a11y button, no scroll at 375×812
asserted via bounding boxes). **VERIFY (Rule 3):** Preview MCP phone viewport — screenshots of all
zone states; rAF-free assertion of states.

### P3 — The payoff (vignette + take-home) · effort L
Two parameterized vignette templates (cheer/flee) fed by crowd emoji + outcome; captions line
(keeps P6-v9 a11y); take-home strip (applause count-up, fame pip, drops-as-gifts); next-ticket
slide; bust/scandal scenes. **RED:** template selection matrix (zone × outcome × crowd), caption
text presence, strip math equals engine output.

### P4 — Economy + cutover (M2) · effort XL
Wire engine to persistence: applause→gold+fame; encore falloff replaces `awardGoldForEncounter`
anti-grind; drops+pity (D8); ladder thermometer gate replaces pass gate; **save migration (D10)**;
City hazards + tools drawer (Kitchen re-point). Delete-in-same-merge: plate/charge/judge-card/
reaction-takeover/hint-bar wiring (`plate.ts` composition paths, `charge.ts` zones, `match.ts`
callers). **RED:** migration fixtures (v9 save → v10 save, legacy page intact, rollback keys),
thermometer thresholds, hazard math, zero-orphan check (grep-level test: no live imports of
deleted modules — the known blind-spot from past refactors).

### P5 — The Rise (ranks + gut picks + stage growth) · effort M
`src/v10/fame.ts` + rank-up UI + 9-upgrade pool (each upgrade = one engine hook, individually
tested: Iron Stomach capacity, Rubber Belly zone shift, Double Gulp single-roll, Titanium Clench,
Slow Cooker % badge, Belly of Holding carry, Blowout Artist, Scandal Darling, +1 TBD). Gates
re-run per upgrade (no upgrade may break bust-tolerance).

### P6 — The Collection (Album, records, cards, relics) · effort L
Album merges codex/field-guide/notebook; Disaster/Scandal cards w/ ??? slots; venue records
(banked-only); clean badges; mastery stamps (cosmetic, D-pinned); 5 boss marquee shows + relics
(each relic = tested engine hook).

### P7 — Region atoms (M4, staged) · effort M each
Wilderness wild foods (unknown-size, priced-gamble tests) · Royal flips + encore chains
(mid-show taste mutation; belly allocation across two crowds) · Cosmic zero-G (pressure decay
per action tick — still event-driven, not wall-clock) + ✨ tag. Gates re-run per atom.

### P8 — Sweep (M5) · effort M
Delete dead modules per the §3.9 fate table; e2e suite rebuilt on the streaming flow
(`tests/e2e/v10-*`); axe pass; final balance run of all gates + reachability on full content.

## 4. Test infrastructure notes

- Vitest on Windows: always `npx vitest run … > out.txt 2>&1` then read the file (shell-wedge
  workaround). Never watch mode in agents.
- All show randomness flows through one seeded RNG injected into `show.ts` — no `Math.random`
  anywhere in `src/v10/` (lint-guarded test).
- Policies and gates are plain vitest tests (~200 sims each run in ms — pure arithmetic).
- Preview MCP: animations are CSS-state driven, so headless rAF stalling can't hide behavior;
  screenshots per zone state are the Rule-3 artifact.

## 5. Non-goals (v10)

Party mode (backlog) · drawn crowd art (emoji v1) · final performer identity (D9 placeholder;
art decision open) · any grades/judge-card resurrection · real-money anything, ever.
