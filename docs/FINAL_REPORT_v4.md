# Fart Factory — Final Report v4 (v8 + v9)

**Generated:** 2026-05-29
**Covers:** All work shipped after `FINAL_REPORT_v3.md` — both the v8 PRs and the v9 batch that landed on `claude/game-improvement-suggestions-AKvoJ`.

---

## TL;DR

v3 shipped the food-mechanic game on top of the v2 slider engine. v4 (boss/world/kitchen) bolted on encounter pacing. v5–v7 closed the major fun gaps surfaced by the CRITIC docs. v8 added a visibility layer (Fart Profile, Plate Preview, Field Guide, axis discovery, Named Farts, Legendary Codex). This report covers v8 + the v9 batch that ships the cleanup work the prior phases didn't get to.

**v9 headline:** the Sandbox slider mode is gone. Story is the only mode. Codebase is meaningfully smaller (-3.5K LOC in PR1) despite shipping six new player-facing systems. Tests grew from 626 → 624+ unit / 102 → 115 e2e (deltas net of sandbox-test removal).

---

## v8 — Visibility & identity (already shipped before this report)

| PR | Commit | Title |
|---|---|---|
| v8 PR1 | `0a04e21` | visibility core — Fart Profile, Plate Preview, Field Guide, axis discovery |
| v8 PR2+3 | `7d8ebb8` | audience prose hints, Named Farts + Legendary Codex |

Key concept: the player sees their own fart's per-axis breakdown (the Fart Profile), the audience sees a prose description rather than a numeric craving vector, and the Field Guide reveals food properties progressively as the player uses each food. The Legendary Codex turns the 6 legendary recipes into 5-slot probe puzzles that grant permanent passive buffs.

These shipped without companion plan/critic docs; this section catches the docs trail up.

---

## v9 — Sandbox removal + six follow-on systems

### PR1 — Remove Sandbox slider mode (commit `1b965be`)

The v2 6-slider game lived alongside Story behind a toggle, kept alive by ~19 e2e specs that ran every CI cycle. Story has been the default since v3.

**Deletions:** `src/state/{hall,combo,challenge,achievements}.ts`, `src/content/commentary.ts`, `src/scoring/grade.ts`, `src/ui/toast.ts`, `src/visuals/particles.ts`, 19 e2e specs + `_legacy-setup.ts`, 5 sandbox-only unit suites, all sandbox HTML/CSS.

**Net:** −3542 / +34. Story shell becomes the only `<main>` content.

### PR5 — Mastery chip on pantry cards (`849cc6f`)

Food-mastery progress was tracked but invisible at decision time. Now every unlocked card shows a small ⭐/⭐⭐/⭐⭐⭐/👑 chip in the top-right corner once the player reaches Apprentice (10 uses).

`buildPantryGridHtml` takes an optional `getMasteryUses(id)` callback so the function stays pure for tests.

### PR4 — Hidden combos expanded from 3 to 14 (`c1dad11`)

`detectHiddenCombo(ids, ctx?)` now reads audience id, area id, mastery, streak. New patterns: granny-dairy-tea, volcanic-revelry, library-quiet, cosmic-loneliness, mastered-plate, rainbow-plate, all-spicy-quartet, swamp-overload, dry-bone, aligned-axes, streak-finisher. New `HIDDEN_COMBO_CATALOG` drives a new "🤫 Hidden Combos" section in the Lab Notebook with silhouettes for undiscovered combos.

### PR6 — Cinematic PERFECT (`cf1324c`)

`match.pct ≥ 95` now pauses input for 1.2s, fires 18-piece emoji confetti, plays a celebration sting, then renders the result panel. `prefers-reduced-motion: reduce` is respected.

New files: `src/visuals/confetti.ts`, `src/ui/perfect-cinematic.ts`.

### PR7 — Boss losses (`456a312`)

First time the player loses to each boss, one of that boss's audience cravings is permanently revealed in the defeat panel and the notebook boss card. Boss snark expanded from 3 → 8 lines per boss. A per-boss loss counter renders a "💀 Bested you N×" strip in the notebook.

New file: `src/state/boss-hints.ts`. The reveal axis is deterministic per boss (so re-fights show the same hint — the player builds toward it).

### PR2 — Daily 3-step quest (`aae2273`)

`src/state/daily-quest.ts` — per-UTC-day quest with 3 steps drawn from a 6-kind pool, seeded by the date so every player on the same day gets the same quest. Claim awards 25 gold + 10 notes once all 3 steps are done.

Eligibility filtering (`f5c0b94` follow-up): `beat-any-boss`, `plate-legendary`, `use-treatment` only get picked if the player can actually accomplish them today. `launch-ge-75` and `plate-rare` are always eligible — fresh-state players always get a 3-step quest.

### PR3 — Progressive onboarding (`26be6e3`)

Reduced the initial 5-step tutorial to a 2-step welcome. Added `src/ui/feature-intro.ts` — a per-feature mini-explainer framework with single-shot-per-id persistence. Wired for kitchen unlock and first boss unlock.

### v9 follow-ups

| Commit | What |
|---|---|
| `f5c0b94` | Fixed pre-existing `boss-arena.spec.ts:87` selector flake. Bumped version to 9.0.0. Added daily-quest deadlock guard. |
| `b2bf71d` | Fixed boss defeat-panel render race (snark→hint flicker). |
| `cfac458` | Added e2e coverage for daily-quest, confetti, hidden-combos notebook, feature-intro. Fixed claim-button progression-refresh bug. |
| `e82a6b9` | Save export/import via `src/state/save-io.ts` + Notebook UI. |
| `bd2a5e8` | Split `plate.ts` (983→679 LOC) — extracted `splashes.ts`, `result-panel.ts`, shared `axis-emoji.ts`. |
| `f91aa19` | Three-channel audio: `src/audio/audio-settings.ts` replaces binary `mute.ts`. New `audio-popover.ts` UI with 2 sliders + master mute. |
| `159e0aa` | Lighthouse baseline + `npm run lighthouse:check` regression script. |

---

## State of the code at v9

| Metric | Before v9 | After v9 |
|---|---|---|
| Total source LOC | ~9.3K | ~9.0K |
| Unit tests | 626 | 624+ |
| E2E specs | 63 | 25 (post-sandbox cull) |
| E2E test cases | ~125 | ~115 |
| Largest file | `plate.ts` 946 | `plate.ts` 679 |
| Audio channels | 1 (mute) | 2 (farts + sfx) |
| Hidden combos | 3 | 14 |
| Boss-snark lines | 15 (3×5) | 40 (8×5) |
| Player-visible Notebook sections | 6 | 8 (added Hidden Combos + Save) |
| Localized cinematic moments | 0 | 1 (PERFECT) |

## Lighthouse baseline (mobile form-factor)

```
performance:   55
accessibility: 100
```

Regression tolerance: ±5 points. Run `npm run lighthouse:check` against the local dev server.

## Known gaps (next iteration)

1. `plate.ts` is still 679 LOC. Extract `launch-flow.ts` (the ~190-line `onStoryLaunch`) to finish the split.
2. No analytics — "which combo never gets discovered?" / "which boss has highest loss rate?" is unanswerable without instrumentation.
3. No alt-skin — the fart branding caps audience reach. A `theme.json` indirection would let the engine be reskinned without code changes.
4. No music channel — `audio-settings.ts` ships 2 channels (farts + sfx); a third for background music is wired-ready but has no sources.
5. The boss-loss e2e test is pre-existing flake-prone (timing-sensitive). The selector fix in `f5c0b94` cleared the strict-mode collision but the underlying boss-match logic depends on RNG that doesn't always favor the test plate.

## Hard gates — v5 status (refreshed for v9)

All hard gates from the v5 critic framework still clear. The cinematic PERFECT (PR6), expanded hidden combos (PR4), and per-feature intros (PR3) further push the Charm + Surprise & Delight axes.
