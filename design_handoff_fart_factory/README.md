# Handoff: The Fart Factory — UX Redesign & New Game Systems

> A complete package to take **The Fart Factory** from a confusing, silent, "solved-arithmetic"
> screen to a compelling, audible, easy-to-learn / hard-to-master game.
> Built for a developer using **Claude Code** against the existing repo.

---

## 0. TL;DR — what to build

The current game has a good core loop buried under a flat, equal-weight UI. This redesign:

1. **Re-stages the play screen** around a 3-beat rhythm — **Read the crowd → Load the plate → Charge & Blast → 🎉 React** — with the reaction blown up into a full-screen payoff, and the meta-systems tucked into a **dock that unlocks progressively**.
2. Adopts one chunky, high-contrast visual language ("**The Order Ticket**" — paper & ink, toxic-green CTAs, Baloo display type) tuned for a **9-year-old to learn in seconds** but an adult to min-max.
3. Adds **four interlocking systems** that make it an actual game:
   - **Audio as a design system** — the fart is the *readout*; a wet recipe squelches, a musical one plays notes. All sound is a **pre-baked clip bank** (~200 clips), selected & layered at runtime. No live generation.
   - **Discovery** — foods hide their stats; you learn them by launching and reading the sound + the crowd's face. The field guide **auto-fills** as you play and shows learned properties **right on the pantry tiles**.
   - **Recipe bonuses** — named combos fire **emergent effects** (multipliers, transforms, signature sounds), not the sum of their parts. Recipes have a mastery track.
   - **Progression** — crowds gain **rarity + difficulty**; each location is a **ladder of shows** ending in a boss; you must **pass (≥50%) to advance**, with per-axis feedback and a retry/improve loop.

**A working reference implementation of all of this exists** in `design_reference/prototype/` (a React prototype). It is the source of truth for exact behavior, algorithms, and constants.

> ⚠️ **READ `06-codebase-reconciliation.md` FIRST.** The real `fart-factory` repo is **already
> substantially built** — almost every system here exists as a TypeScript module. The work is
> **modifying/tuning existing modules + re-skinning the UI to the Order Ticket language**, not
> greenfield construction. Doc 06 maps every concept to the real source files, corrects two axis
> details (the real axes are `wet, dry, stink, loud, musical, length, temp` — `temp` not "heat",
> and `length` is a real food axis), and pinpoints the exact `match.ts` change that fixes the
> "instantly 80%" over-scoring. **Where docs 01–05 differ from doc 06, doc 06 wins.**

---

## 1. About the design files (read this first)

The files in `design_reference/` are **design references**, not production code to ship:

- **`design_reference/*.html`** — four HTML design documents (the redesign directions, the full static app, the systems spec, and the playable prototype). They show *intended look and behavior*.
- **`design_reference/prototype/`** — the **playable React prototype** (`Fart Factory Prototype.html` + its `ff-*.js/.jsx/.css`). This is a **reference implementation**: the scoring math, discovery rules, recipe detection, charge timing, and state machine are all real and correct here. **When this README and the prototype disagree, the prototype wins** — but the prototype's audio is *synthesized* as a stand-in (see §Audio: the shipped game uses the pre-baked bank instead).

**Your task:** recreate these designs and systems inside the **existing `fart-factory` codebase** (TypeScript + Vite, with modular `src/audio`, `src/scoring`, `src/state`, `src/ui`, `src/visuals`), using its established patterns — *not* by dropping the HTML in. Reuse what's there (the repo already has procedural audio, a sample-player, haptics, a food catalog, an audience catalog, and an onboarding scaffold).

**Fidelity:** **High-fidelity.** Colors, type, spacing, copy, animations, and game constants are all final and specified. Match them.

---

## 2. The spec documents

Read in order. Each is self-contained.

| File | What's in it |
|---|---|
| **`01-game-systems.md`** | The loop, the **exact scoring & matching algorithm** (constants + pseudocode), discovery, recipes, progression, the pass-gate, rewards. The heart of the package. |
| **`02-audio-system.md`** | The 5-layer audio model, axis→sound mapping, the **pre-baked clip bank** (~200 clips) + budget, the runtime clip-selector, the **ElevenLabs asset list**, accessibility (channels/captions/haptics). |
| **`03-data-schemas.md`** | TypeScript interfaces for Food, Recipe, Crowd, Venue, Treatment, SoundClip, SaveState — plus the **seed content** (10 foods, 6 recipes, 4 crowds, 3 treatments) ready to drop in. |
| **`04-screens-and-ui.md`** | The **Order Ticket design system** (tokens, type, shape language, animation) and a spec for **every screen** (onboarding, play, reaction, shop, kitchen, lab book, venue ladder, boss, intermission, sound settings) — layout, components, copy. |
| **`05-implementation-plan.md`** | A **phased plan mapped to the existing repo modules**, what to reuse vs build, milestones, and **acceptance criteria** per system. |
| **`06-codebase-reconciliation.md`** | **⚠️ Read first.** Maps every concept to the **real repo modules**, corrects the greenfield framing of 01–05, fixes the axis naming (`temp`/`length`), and gives the **exact `match.ts` scoring patch**. Authoritative where it conflicts with 01–05. |

---

## 3. Design tokens (quick reference)

```
COLORS
  --paper      #f4ecd8   page background (warm cream, with faint 2px scanline texture)
  --paper2     #eadfc4   sunken panels / tracks
  --ink        #231d16   text, borders, shadows (near-black brown)
  --green      #8fd11e   primary CTA / "good" / BLAST
  --green-d    #6fae12   CTA gradient bottom / progress fill
  --orange     #ff7a2f   accent / hazard / boss / rewards
  --gold       #f59e0b   coins, stars, rare VIP glow
  --muted      #8a7d63   secondary text / labels
  RARITY  c #9ca3af · u #22c55e · r #3b82f6 · e #a855f7 · l #f59e0b

TYPE
  Display / headings / numbers ....... "Baloo 2", weight 700–800 (rounded, chunky)
  Body / UI copy ..................... "Nunito", weight 700–900
  Mono labels / readouts / kickers ... "Space Mono"

SHAPE LANGUAGE ("sticker")
  Radius: 12–18px (tiles 12–13, cards 14–18, pills 999)
  Borders: 2.5–3px solid --ink
  Shadow: HARD offset, no blur — e.g. box-shadow: 4px 4px 0 var(--ink)
  Press state: translate by the shadow offset + collapse shadow to 0 (tactile "click")

GAME CONSTANTS
  Axes (7, real keys): wet 💦 · dry 🍂 · stink 🤢 · loud 🔊 · musical 🎺 · length ⏱️ · temp 🌡️
    (each food 0–5 per axis; "temp" not "heat"; "length" is a real food axis, not derived — see doc 06)
  Food axis values: integers 0–5     AXIS_CAP (normalization): 8     BELLY_MAX: 10
  Pass threshold: 50%   Stars: ≥80→3, ≥68→2, ≥50→1   Grades: ≥90 S, ≥80 A, ≥68 B, ≥50 C, else F
```

(Full token list and per-screen values in `04-screens-and-ui.md`.)

---

## 4. Screen inventory

| Screen | Purpose | Spec |
|---|---|---|
| **Onboarding** | 3 cards → first show | §04 |
| **Play** | Read crowd → plate → charge → blast | §04 (anchor) |
| **Reaction** | Full-screen payoff: grade slam, judge card, rewards, discovery, retry/next | §04 + §01 |
| **Shop** | Spend gold on new foods | §04 |
| **Kitchen** | Equip a treatment that tweaks every brew | §04 |
| **Lab Book** | Field-guide (Foods) + Recipes tabs | §04 + §01 |
| **Venue ladder** | The visible climb between crowds | §04 + §01 |
| **Boss arena** | The loop dialed to 11 | §04 |
| **Intermission** | One risk/reward choice between shows | §04 |
| **Sound settings** | 4 channels + captions + haptics | §02 + §04 |

---

## 5. How to use this package with Claude Code

1. Open the `fart-factory` repo in Claude Code.
2. Drop this whole `design_handoff_fart_factory/` folder into the repo root (or keep it alongside).
3. Point Claude Code at `05-implementation-plan.md` and work phase by phase.
4. Keep `design_reference/prototype/` open as the behavioral reference — diff your scoring against `ff-app.jsx`'s `computeLaunch()` and `launch()`.
5. Use `03-data-schemas.md` to seed content, then expand (the prototype ships a 1-venue / 4-crowd slice; the full game wants more regions — see §05).

---

*Package version 1 · The Fart Factory is a serious scientific institution 🧪*
