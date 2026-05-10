# Fart Factory Overhaul — Final Report v3

**Generated:** 2026-05-10
**Branch:** `food-mvp` (PR target: `main`)
**Commits this session:** 13 (Phases A–M)
**Stop reason:** All 13 phases of PLAN.md §D Tier 7 completed; smoke test green; mode default flipped to Story; ready to merge.

---

## TL;DR

v3 replaces the v2 slider game with a food-mechanic game built around 3 player-facing tensions: **what to plate** (combinatorial pick-K-of-N), **where to launch** (containment areas with score modifiers), and **who you're cooking for** (rotating daily audiences with cravings + restrictions). The slider game survives as Sandbox Mode, toggled with the existing 🍴 button — but the default experience is now Story.

The v5 critic framework — which scored the v2 game ~3.5/10 on Fun (dominant strategy, displayed-target puzzle) — informed every phase. The food redesign closes 8 structural gates the slider game couldn't.

### What the player does in v3

1. Open the app → Story Mode loads with today's audience portrait, their cravings, and the daily shop offerings.
2. Plate 2–4 foods from the pantry (subject to belly capacity).
3. Pick a containment area (Outside / Under Covers / Library / Elevator / Throne / Space — each applies modifiers).
4. Tap **Launch**. Get a 0-100% match against the audience, see a tier reaction (😍 loved → 💀 evacuated), and bank gold (≥50% match) or research notes (<50%).
5. Discovered a recipe by accident? It's added to the Lab Notebook — tap **Cook** later to auto-fill the plate.
6. Spend gold in the daily Shop or notes in the Research panel to unlock new foods.
7. Chip away at 6 multi-step Legendary Quests for the most powerful foods.
8. Toggle Hard Mode to hide the cravings panel — now you have to read the audience portrait + audience-reaction trend (🔥 warmer / ❄️ colder) instead of cheating off the target.

---

## What changed (Phases A–M)

### Phase A — Catalogs + persistence (commit `2bf6264`)
- 30-food catalog (`src/state/food.ts`): 6 common + 6 uncommon + 6 rare + 6 epic + 6 legendary. Per-rarity belly cost + 7-axis property profile.
- 20-audience catalog (`src/state/audience.ts`): cravings + optional restrictions ("no-wet", "min-foods:3", "need-cursed-or-rare", etc.).
- 30+ recipe catalog (`src/state/recipes.ts`) including 6 legendary with `legendaryUnlock` steps.
- 6 containment areas (`src/state/containment.ts`): each with per-axis score modifiers.
- Persistence layer (`src/state/persistence.ts`): pantry, gold, research notes, discovered recipes, mode, last area, last match, per-UTC-day belly. Corruption-safe loads.

### Phase B — Mode toggle + Story shell (commit `0ef9bda`)
- `#modeBtn` toggles between Story and Sandbox.
- `#storyShell` region containing the audience portrait, belly meter, plate slots, area picker, pantry grid, Launch button, and result panel.
- `body[data-mode='story']` CSS hides the legacy slider chrome (lab, challenge, results) in Story Mode.

### Phase C — Pantry grid + plate + belly meter UI (commit `bfbf87c`)
- Pantry grid: every food rendered with rarity glow + belly cost.
- Plate slots (4) with tap-to-remove.
- Belly meter (per UTC day, max 20).

### Phase D — Recipe computation + Launch (commit `82a2e04`)
- `computeFartFromPlate(ids)` aggregates per-axis food properties with 12 SYNERGIES + 5 CONFLICTS catalogs.
- Launch wires the food properties into the existing `playFart` audio engine via `recipeToSliderInputs` mapping.

### Phase E — Containment area + audience portrait + match scoring (commit `9b82984`)
- Area picker renders 6 cards; selection persists.
- `evaluateMatch(props, ids, cravings, restrictions)` returns `{pct, violations}` with tolerant L1 distance + restriction penalties (-25% per violation).
- Replaces `gradeFart()` as the Story Mode scoring system — closes Disjoint Systems Gate from v5 critic.

### Phase F — Audience reaction tier + Hard Mode + warmer/colder trend (commit `7326fd5`)
- 5-tier audience reaction (loved / liked / meh / disliked / evacuated).
- Hard Mode toggle hides cravings + match-%. Audience-reaction strip carries the verdict.
- Warmer / colder / same trend across consecutive launches → closes Displayed-Target Puzzle Gate.

### Phase G — Gold currency + pantry shop (commits `7c67c85`, `83dbefc`)
- `goldForMatch(pct)`: match ≥50% → floor(pct/10) gold; <50% → 0.
- Daily-rolled shop: 3 uncommon + 1 rare + 0-1 epic, mulberry32-seeded per UTC day. Already-unlocked foods filtered out. Legendary NEVER offered.
- Buy flow with 3 refusal modes (unknown / already-unlocked / insufficient-gold).

### Phase H — Recipe discovery + Lab Notebook + cook preset (commit `4216a4d`)
- `discoverFromPlate(ids)` calls `matchRecipe` + `markRecipeDiscovered`.
- "✨ NEW RECIPE" toast surfaces on first discovery (works in Hard Mode too — discoveries reveal what the player made, not the audience target).
- Notebook modal shows all 30+ recipes (discovered + locked silhouettes), plus a Cook button on each discovered recipe that auto-fills the plate.

### Phase I — Research notes meta-progression (commit `8e168e8`)
- `researchNotesForMatch(pct)`: match <50% → floor((100-pct)/20) notes. Failure banks progression — closes the No-Failure Gate.
- Research panel offers uncommon/rare/epic foods at 8/20/50 notes. Legendary remains quest-only.
- Both gold and notes routes are valid for non-legendary foods, with notes intentionally pricier to keep gold as the fast lane.

### Phase J — Legendary quests + claim flow + fanfare (commit `97a373e`)
- 6 deterministic quests, one per legendary food, with 2–3 steps each. Steps use save-state primitives (`discover-recipes`, `unlock-uncommon/rare/epic`, `best-overall`, `best-hard`, `discover-recipes-rare/-epic`).
- Notebook now shows a "🏆 Legendary Quests" section with progress bars + CLAIM button (enabled only when all steps done).
- Audience portrait fanfare animation (1.6s gold pulse) when a legendary food is on the plate at launch.
- New best-match high-water-mark persistence (`bumpBestMatch`, `bumpBestMatchOverall`, `bumpBestHard`).

### Phase K — SFX seed catalog grows to 26 (commit `6195487`)
- 6 audience-reaction seeds (granny-cackle, royal-court-applause, frat-howl, haunted-mansion-moan, alien-tourists-gasp, toddler-giggle).
- 4 food-eating seeds (munch / crunch / slurp / gulp).
- 2 legendary fanfare seeds (legendary-fanfare, quest-claimed).
- Data layer is committed; actual ElevenLabs generation + new mp3 commit is pending operator action.

### Phase L — Visual polish + Disney-12 animations (commit `108a8cb`)
- Legendary rarity: ambient gold-pulse box-shadow + ::before/::after sparkle emojis with offset oscillations.
- Audience portrait: always-on 4s idle wobble; reaction-face animations per tier (bouncy / pulse / shake / droop).
- Belly meter: scaleY squash on every food-add (Disney squash & stretch).
- Plate slots: wind-up/pop/settle animation on add (cubic-bezier overshoot for bounce).
- `prefers-reduced-motion: reduce` upgraded from "instant duration" to "animation: none" — semantically correct.

### Phase M — Ship (this commit)
- Comprehensive `gameplay-smoke-v3.spec.ts` exercises the full loop.
- Mode default flipped to 'story'. 20 legacy v2 e2e specs updated via shared `_legacy-setup.ts` helper that calls `useSandboxMode()` (uses `page.addInitScript` to set `fart_mode = sandbox` before navigation).
- `mode-toggle.spec.ts` rewritten for the new default direction.

---

## Test counts

| Layer | Before food-mvp | After Phase M | Δ |
|---|---|---|---|
| Unit | 191 | **266** | +75 |
| E2E (desktop) | 63 | **125** | +62 |
| E2E (mobile-touch) | 1 skipped | 1 skipped | — |

Every phase landed with red-test-first TDD (per CLAUDE.md RULE 1) and behavior verification in real Chromium (RULE 3).

---

## v3 vs v5 critic score progression

| Phase | v5 Fun score (est.) | Key axis movement |
|---|---|---|
| (v2 baseline) | 3.5 | Dominant Strategy gate fails; Open-Continuous-Input gate fails |
| A — catalogs | 3.5 | data only, no UX |
| B — mode shell | 4.0 | UI affordance for the new mode |
| C — pantry/plate | 4.5 | Choice Architecture rises; pick-K-of-N replaces sliders |
| D — recipe compute | 5.0 | Decision Quality + Synergy reasoning |
| E — match scoring | 6.0 | Disjoint Systems gate clears |
| F — reaction tier + Hard Mode | 6.5 | Displayed-Target Puzzle gate clears in Hard Mode |
| G — gold + shop | 7.0 | Goal Stacking partially closed |
| H — discovery + notebook | 7.5 | Curiosity Gaps loop closed |
| I — research notes | 7.5–8.0 | No-Failure gate clears; Bushnell Floor solid |
| J — legendary quests | 8.0 | Multi-week arc; Surprise & Delight ≥6 |
| K — SFX seeds | 8.0 | Library Richness gate clears on paper (audio gen pending) |
| L — visual polish | **8.5** | Game Feel axis 8–9 |
| M — ship | **8.5** | Default flipped; smoke green |

(Numbers are estimates from the framework's anchors. Item 69 of the plan calls for a formal v5 critic pass; that will live in `.session/v5-final-scores.json` when run.)

---

## Hard gates — v5 status

| Gate | v2 status | v3 status |
|---|---|---|
| Dominant Strategy | **FAIL** ("max all sliders") | CLEAR (no plate dominates; cravings rotate) |
| Open Continuous Input | **FAIL** (6 sliders) | CLEAR (pick K of 30 foods) |
| Disjoint Systems | (n/a; only one system) | CLEAR (`evaluateMatch` is the single scoring path in Story) |
| Displayed Target Puzzle | **FAIL** (target shown numerically) | CLEAR in Hard Mode (cravings hidden; trend feedback) |
| Decision Drought | borderline | CLEAR (each plate triggers synergy/conflict reasoning) |
| Hollow Score | borderline | CLEAR (match% gates real consequences: gold, notes, quest progress) |
| Feedback | clear | CLEAR (tier emoji, warmer/colder, synergy line items) |
| No-Failure | borderline | CLEAR (research notes from any <50% match) |
| Kid-Safety | clear | CLEAR (all foods + audiences + flavor text reviewed) |
| Bushnell Floor=Ceiling | clear | CLEAR (legendary quests give ceiling; sandbox + research notes give floor) |
| Loudness Chaos | clear in v2 | clear (no audio mastering changes) |

---

## Deploy steps

1. **Push** `food-mvp` branch to origin.
2. **Open PR** `food-mvp` → `main`.
3. **CI** runs the full unit + e2e suites.
4. (Operator-side, async) **Audio generation** — run `npm run sfx:generate` after setting the ElevenLabs API key. This produces 12 new mp3s for the Phase K seeds. Commit the new files to extend the in-game library.
5. **Merge** PR after CI green + audio commit lands.
6. **GitHub Pages** publishes from `main` via the existing workflow.

---

## Known limitations + follow-ups

- **Audio gen is operator-pending.** The Phase K seed catalog is committed; the actual audio files require an ElevenLabs API call. Until that runs, the audience-reaction tier in Story Mode shows the on-screen emoji + text but doesn't play a sample.
- **Mobile e2e** (touch-targets) is skipped on the desktop project. The food-mechanic UI was designed with the mobile target in mind but the dedicated mobile test pass is the next operator action.
- **Quest balance** is informed-guess and untested in real long-play. Item 70 of the plan flagged this — week-2 player feedback will likely tune target counts (especially `discover-recipes: 20` for Sky Bean).
- **No tutorial overlay yet.** The existing onboarding modal still describes the slider game. Phase Z task: replace its text to cover the food mechanic.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
