# 05 — Implementation Plan & Acceptance Criteria

A phased plan mapped onto the existing `fart-factory` repo, with what to **reuse vs. build**, and a
testable checklist per system. Diff every behavior against the prototype
(`design_reference/prototype/`).

---

## 0. The existing repo (what to build on)

The repo is **TypeScript + Vite**, organized under `src/`:

| Module | Already there | Use it for |
|---|---|---|
| `src/state/` | `food.ts` (30-food catalog), `audience.ts` (20 audiences), game state | Reconcile with the **hidden-axis** Food model and the `Crowd` schema in `03-data-schemas.md`. Add `reveals`, `mastery`, `owned`, `stars`, `earnedGold`, `treatment` to state. |
| `src/scoring/` | scoring logic | Replace/extend with the **exact algorithm** in `01-game-systems.md §3` (weakest-link blend + hate penalty + charge + recipe). |
| `src/audio/` | `procedural.ts`, `sample-player.ts`, `event-sfx.ts`, `audio-settings.ts` | The **5-layer bus + clip-selector** (`02-audio-system.md`). Prefer `sample-player` (pre-baked bank) over procedural for the shipped fart. |
| `src/ui/` | `onboarding.ts`, screens | Rebuild screens in the Order Ticket language (`04-screens-and-ui.md`). Reuse the feature-intro/onboarding hook for **progressive disclosure**. |
| `src/visuals/` | visual effects | Grade-stamp slam, confetti, stink cloud, charge shake. |
| `public/sfx/`, `scripts/` | SFX + a generation script | Drop the pre-baked ElevenLabs bank here; extend the SFX script. |
| `src/main.ts`, `src/style.css` | entry + styles | Adopt the tokens in `04-screens-and-ui.md §1`. |

> The repo already has a **feature-intro hook** — use it to drive the progressive-unlock dock (don't show Shop/Kitchen/Book/Venue until earned).

---

## 1. Phase plan

### Phase 1 — Data & scoring core (no UI risk)
- Port the `Food` / `Recipe` / `Crowd` / `Treatment` schemas (`03`) into `src/state`. Seed the slice content; map the repo's existing 30 foods / 20 audiences onto the hidden-axis model.
- Implement `computeLaunch()` exactly per `01 §3` (incl. weakest-link blend, hate penalty, charge multiplier, recipe effects, treatment deltas, grade/stars/pass).
- Implement `findRecipe()` per `01 §5.1`.
- Unit-test against the prototype's numbers (see §2 acceptance).

### Phase 2 — Play screen + blast + reaction
- Build the Play screen (`04 §2`): ticket, belly, plate, pantry, blast.
- Hold-to-charge with the sweet-spot meter (`01 §3.5`).
- Reaction takeover (`04 §3`): grade slam, **judge card**, breakdown, footer with **pass-gate routing** (`01 §4`).
- Wire rewards + anti-grind gold (`01 §4.3`) and state persistence (`01 §8`).

### Phase 3 — Discovery
- Reveal-on-use, one axis per launch, strongest first (`01 §6.1`).
- Inline learned-axis strip on pantry tiles + ✨/dots (`01 §6.2`).
- Field Guide (Lab Book → Foods tab) auto-fill, mastery, perks (`01 §6.3`).
- Discovery toasts + novelty notes.

### Phase 4 — Economy & depth screens
- Shop (buy foods, gold gate, ownership) — `04 §4`.
- Kitchen (equip one treatment, shows in breakdown) — `04 §5`.
- Lab Book Recipes tab — `04 §6`.
- Food grants on crowd intros (`03 §4`).

### Phase 5 — Progression
- Venue ladder screen (`04 §7`) with node states + star gates.
- Crowd rarity/diff/VIP/boss; boss arena reskin (`04 §8`).
- "One new thing per show" content hook; intermission (`04 §9`).

### Phase 6 — Audio
- 5-layer bus + per-channel volume; the clip-selector (`02 §4`).
- Generate the ~200-clip ElevenLabs bank (`02 §3`), wire UI/foley/charge/crowd/recipe hooks.
- Sound settings screen + captions + haptics (`02 §7`).

### Phase 7 — Content expansion & polish
- Add regions/crowds/recipes per `03 §7` so the economy has room.
- Tune constants (see §3) with real playtest telemetry.

---

## 2. Acceptance criteria (test these)

**Scoring & gate**
- [ ] Plating two off-profile foods vs. Granny scores **F (< 50%)** and the reaction offers **only "Try this crowd again"** — no advance.
- [ ] One Broccoli vs. Granny ≈ **F (~29%)**; two Broccoli ≈ **C (~61%, pass, 1★)**. (Sanity-matches the prototype.)
- [ ] A "hates" violation visibly tanks the score (being wet vs. the Mayor/Critic-Bot).
- [ ] A perfect charge multiplies the final by **1.25** and shows in the breakdown.
- [ ] Grade/stars/pass thresholds match `01 §3.6` exactly.

**Discovery**
- [ ] A fresh food shows ✨ and all `·` dots; after one launch, its **strongest** axis appears as an icon+value on the tile and in the Field Guide. No manual action needed.
- [ ] Mastery (all axes revealed + ≥5 uses) flips on the food's perk and it affects scoring.

**Recipes**
- [ ] Plating exactly `kombucha+broccoli` shows the **Lullaby Toot** ribbon *before* blasting and boosts musical by 70%.
- [ ] Extra unrelated foods on the plate suppress the recipe (no false match).

**Progression & economy**
- [ ] You cannot reach crowd N+1 without passing crowd N.
- [ ] Re-clearing a crowd via "Improve" pays only the **gold improvement**, never the full amount again.
- [ ] Granny grants Broccoli and the Frat Pack grants Pepper via their intro cards.
- [ ] Shop buttons correctly gate on gold and ownership.
- [ ] Beating the Mayor (boss) reaches the win/region-clear state.

**Audio (Phase 6)**
- [ ] No runtime audio generation/API calls — every sound is a pre-baked clip.
- [ ] A wet recipe sounds wet, a musical one plays notes, a hot one sizzles (perceptually legible).
- [ ] Four independent volume channels + mute + captions-on-by-default + haptics toggle.

**UI**
- [ ] Reaction overlay fully covers the play screen (no bleed-through, single status bar).
- [ ] Every tappable element has the press feedback; nothing renders at `opacity:0` under reduced-motion.
- [ ] Tap targets ≥ 44px; text ≥ the legible minimum on a phone.

---

## 3. Tuning knobs (for the live-balance pass)

Centralize these so balance can be tuned without code surgery (all in `01 §3`):
- `AXIS_CAP` (8), `BELLY_MAX` (10), pass threshold (50), star/grade cutoffs.
- Closeness curve: `pow(dist, 0.85) * 1.5`.
- Weakest-link blend weights: `0.55 / 0.45`.
- Hate penalty coefficient: `0.65`.
- Charge: sweet zone `74–92%`, multipliers `1.25 / 1.10 / 0.85`.
- Reward formulas + the anti-grind "pay improvement only" rule.

The user's playtest verdict on the slice: matching now has real stakes and clear feedback, but **final difficulty/economy balance is expected to be tuned here, against the real content set and telemetry** — not hard-locked from the prototype.

---

## 4. Out-of-scope blanks intentionally left for the build
- Real ElevenLabs voice casting/recording (directions in `02 §6`).
- The `transform` / `crowdBonus` / `loot` recipe effects (typed but only `mult`/`bonus` are in the slice).
- The fermentation rack (aging ingredients across shows) — sketched in the static app.
- Multi-region map, save-slot/profile system, and any meta-progression beyond the venue ladder.
- Monetization / analytics — not addressed by this design.
