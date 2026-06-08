# Fart Factory — Sound Inventory

> Complete, code/asset/plan-verified catalog of every sound in the game.
> Built from `src/audio/*`, `public/sfx/` + `manifest.json`, `scripts/generate-sfx.ts` + `sfx-seeds.ts`,
> all call-sites in `src/`, and the design docs (`design_handoff_fart_factory/02-audio-system.md`, `docs/AUDIO_CRITIC.md`, prototype `ff-audio.js`).
> Verified: `public/sfx/` holds **exactly 114 mp3s**, in 1:1 correspondence with `manifest.json` (114 entries, v2), zero orphan files.

## Asset totals by manifest category (114 mp3s)

| Category   | Count | What it is                                              |
|------------|-------|---------------------------------------------------------|
| `fart`     | 14    | Standalone whole-clip cartoon farts (fallback tier)     |
| `stem`     | 21    | Layered fart readout: 12 base rips + 5 melody + 2 sizzle + 2 haze |
| `reaction` | 6     | Crowd reaction stingers (only 3 are wired)              |
| `food`     | 4     | Eating foley                                            |
| `event`    | 2     | legendary-fanfare, quest-claimed                        |
| `boss`     | 5     | Boss entrance signatures                                |
| `utility`  | 2     | plate-pluck, drumroll                                   |
| `signature`| 20    | One per audience archetype                              |
| `voice`    | 40    | 20 audiences × {loved, evacuated} TTS voice lines       |
| **Total**  | **114** | + 2 procedural (no asset): anticipation cue, fallback synth |

---

## 1. Fart rips — the launch sound

The fart that plays when you press **Launch** is assembled from one of three paths, chosen at runtime:

### 1a. Layered stem readout (PRIMARY path)
This is what normally fires. The 6 sliders/axes (wet, dry, length, musical, temp, stink) drive a stack of layers:

| Layer | Variations | Count | When it plays | Selection |
|-------|-----------|-------|---------------|-----------|
| **Base rip — wet** | rip-wet-short, rip-wet-med, rip-wet-med-2, rip-wet-long, rip-wet-long-2, rip-wet-long-xl | 6 | Always, when wet ≥ dry | length → short/med/long bucket; random among `{family}` / `{family}-2`; `-xl` only when length ≥ 0.85 |
| **Base rip — dry** | rip-dry-short, rip-dry-med, rip-dry-med-2, rip-dry-long, rip-dry-long-2, rip-dry-long-xl | 6 | Always, when dry > wet | same as wet branch |
| **Melody** (pitched toot) | melody-3, melody-4, melody-5, melody-6, melody-7 | 5 | Overlay when musical > 0.45 | deterministic: `melody-{round(musical*7)}` |
| **Sizzle** (heat) | sizzle-lo, sizzle-hi | 2 | Overlay when temp > 0.30 | hi when temp ≥ 0.66, else lo |
| **Haze** (stink tail) | haze-lo, haze-hi | 2 | Overlay when stink > 0.30 | hi when stink ≥ 0.66, else lo |

- **12 base rips + 5 melody + 2 sizzle + 2 haze = 21 stem assets.**
- Overlay layers play at 0.55× the base gain.
- Evidence: `src/audio/fart-stems.ts:65-118`, `src/audio/sample-player.ts:205-251`, `src/audio/procedural.ts:117-132`.
- **Quirks worth noting for the fix pass:**
  - The **short** bucket has no `-2`/`-xl` variant (only rip-wet-short / rip-dry-short), so short farts get **zero texture variety**.
  - `melody-0/1/2` deliberately don't exist — the 0.45 gate makes `round(musical*7)` ≥ 3 always. Not missing.
  - `melody-7` only fires when musical ≥ ~0.93 (top ~7% of the axis) — rarely heard.
  - Tie-break is `wet >= dry`, so an exact tie picks **wet**; dry only on strictly drier.

### 1b. Standalone whole-clip farts (FALLBACK tier — 14)
mouse-squeak, champagne-pop, tiny-toot, wet-flapper, dry-trumpet, kazoo-honk, duck-quack, sad-trombone, thunder-roll, never-ending, machine-gun, volcano, silent-killer, symphony

- **When:** Launch (or the belly-meter easter-egg tap) **only when the stem path can't assemble** (no matching stem base).
- **Selection:** `pickSampleId` — filter to `category='fart'` in the length bucket, weighted random by "mood" predicates (sneaky/triumphant/comedic/embarrassed/exhausted), no immediate repeat.
- Evidence: `src/audio/sample-player.ts:94-129`, `src/ui/plate.ts:620,671,1023`.
- With the stem bank shipped, this is effectively a safety net.

### 1c. Procedural (no assets — 2)
- **Anticipation cue:** a 150ms triangle-wave rumble that **always plays first on every Launch** (all three paths), then a 50ms gap before the hit. The "set-up before the payoff." `src/audio/procedural.ts:71-92`.
- **Procedural-only synth:** sawtooth+LFO fart, final fallback when the manifest isn't ready / decode fails. `src/audio/procedural.ts:160+`.

---

## 2. Audience reactions — post-launch crowd stinger

Plays right after a launch result is scored, keyed by the 5-tier outcome. Volume 5. `src/audio/event-sfx.ts:55-61`, `src/ui/result-panel.ts:97-98`.

| Tier | Sound | |
|------|-------|--|
| loved | royal-court-applause | |
| liked | toddler-giggle | |
| meh | *(silent — null)* | |
| disliked | haunted-mansion-moan | |
| evacuated | haunted-mansion-moan | ⚠ same as disliked |

- **5 tiers → only 3 distinct sounds.** meh is silent; disliked and evacuated are sonically identical.
- **3 ORPHAN reaction assets exist but are never played:** `granny-cackle`, `frat-howl`, `alien-tourists-gasp` (generated, zero code references).

---

## 3. Food — eating foley (4)
food-munch, food-crunch, food-slurp, food-gulp

- **When:** a food card is successfully added to the plate. **Random** uniform pick of the 4. Volume 4.
- `src/audio/event-sfx.ts:54`, `src/ui/plate.ts:196`. (Removal uses plate-pluck, not these.)

---

## 4. Event / UI one-shots

| Sound | Count | When it plays | Evidence |
|-------|-------|---------------|----------|
| **plate-pluck** | 1 | A food is removed from a plate slot (vol 3) | `src/ui/plate.ts:447` |
| **drumroll** | 1 | Advancing to the next audience/encounter (vol 5) | `src/ui/plate.ts:362` |
| **legendary-fanfare** | 1 | Launch with ≥1 legendary food on the plate **and** first-time boss victory (vol 7) | `src/ui/plate.ts:677-679`, `src/ui/boss-arena.ts:250` |
| **quest-claimed** | 1 | Boss defeated on a **repeat** win (`firstWin === false`) (vol 8) | `src/ui/boss-arena.ts:250` |

> Note: `quest-claimed`'s only wired trigger is the boss repeat-win path; no quest-screen claim-button call-site was found — likely an intended-but-unwired trigger worth confirming.

---

## 5. Boss

### 5a. Boss entrance signatures (5)
boss-entrance-granny, boss-entrance-royal, boss-entrance-haunted, boss-entrance-volcano, boss-entrance-cosmic

- **When:** you click Fight to open a boss arena. Volume 8.
- **Selection:** explicit map keyed by **boss.id** (not audience id). All 5 keys match real boss ids. `src/ui/boss-arena.ts:31-37,114-115`.

### 5b. Audience signature themes (20)
sig-granny-edna, sig-royal-court, sig-frat-bros, sig-haunted-mansion, sig-alien-tourists, sig-toddler-bday, sig-goth-teens, sig-kindergarten, sig-skunk-society, sig-opera-house, sig-wrestling-fans, sig-librarians, sig-volcano-cult, sig-pet-rescue, sig-astronauts, sig-food-critics, sig-baby-shower, sig-punk-show, sig-silent-monks, sig-mystery-guest

- **When:** (a) a new audience is introduced after intermission; (b) short-press/release on the audience portrait. Volume 6.
- **Selection:** `sig-{audienceId}`, one per audience. 20 audiences ↔ 20 sigs, exact 1:1. `src/audio/event-sfx.ts:74-84`, `src/ui/plate.ts:391,970`.

### 5c. Audience voice lines (TTS — 40)
voice-{audienceId}-loved and voice-{audienceId}-evacuated for all 20 audiences.

- **When:** (a) post-launch when the reaction tier is **loved** or **evacuated**, ~800ms after the reaction stinger, on a dedicated `voices` channel; (b) long-press (≥800ms) on the audience portrait → always the **loved** line.
- **Selection:** `voice-{audienceId}-{tier}`, tier ∈ {loved, evacuated}. Only the two extreme tiers are voiced. 20 × 2 = 40. `src/audio/event-sfx.ts:72-93`, `src/ui/result-panel.ts:105-109`, `src/ui/plate.ts:959`.
- The portrait long-press only ever plays "loved", so each "evacuated" line is reachable only via a real evacuated outcome.

---

## 6. Planned in the design but NOT built (~70 sounds)

These appear in `02-audio-system.md` / `AUDIO_CRITIC.md` / prototype `ff-audio.js` but have **no asset, no seed, and no call-site**:

| Group | Planned count | Status |
|-------|--------------|--------|
| **Per-screen music beds** (lab hum, shop market, kitchen ferment, venue travel, boss heartbeat, lab-book twinkle…) | 8 | Entirely unbuilt — the game ships with **no background music at all** |
| **Signature recipe jingles** (per hero recipe; 6 named: classic, lullaby, fizz, kraut, royal, inferno) | ~40 | None generated or wired |
| **UI / foley micro-sounds** (charge whoosh start/sustain/release, sweet-spot ding, coin cha-ching, page flip, knob clicks, treatment fwoosh, jar chime, error tone, discovery sparkle, combo-streak ping, achievement fanfare, shop cash register…) | ~22 | Only ~2 (plate-pluck, drumroll) + the 4 food foley exist; ~20 missing |

The call-site audit independently confirms **no audio fires in Kitchen, Shop, Notebook, tab switches, discovery splashes, or the perfect-score cinematic.**

---

## "Fix the sounds" leads (ranked)

1. **3 orphan reaction assets** — granny-cackle, frat-howl, alien-tourists-gasp exist but nothing plays them. Either wire per-audience reactions or drop them. *(medium)*
2. **5 reaction tiers → 3 sounds** — disliked and evacuated are identical; meh is silent. Give evacuated its own (more severe) stinger. *(low)*
3. **~70 planned sounds unbuilt** — music beds, recipe jingles, UI foley. Biggest gap between plan and shipped game. *(medium)*
4. **Short-bucket farts have no variety** — no `-2`/`-xl` variant for short wet or dry rips. *(low)*
5. **quest-claimed may be missing a call-site** on the quest-claim UI. *(low)*
6. **melody-7 nearly unreachable** (top ~7% of musical axis) — confirm foods can even push musical that high. *(low)*

## Resolved false alarms (don't chase these)
- `melody-0/1/2` are **not** missing — unreachable by the 0.45 gate, correctly not generated.
- AUDIO_CRITIC's "no mute / no visibilitychange / empty manifest" hard-gate failures are **stale** — all three are resolved on current HEAD (mute in `audio-settings.ts` + `audio-popover.ts`, `visibilitychange → suspendAudio` in `src/main.ts:25`, 114-asset manifest shipped).
