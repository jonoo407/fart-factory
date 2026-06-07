# PLAN v8 — Legibility, visibility, feedback (with progressive reveal)

**Status:** Plan only — not started. Iterated through three rounds of user feedback.

## The four original issues (still the root cause)

1. The game grades farts on 7 axes but **the player never sees what fart they made**.
2. **No way to learn ingredient properties.** No field guide / encyclopedia.
3. **Pantry shows all 30 foods including locked teasers.** Should hide locked by default.
4. **No correlation between sound + properties.** Audio plays; player can't connect "that sound" to "stink:5".

Plus #5: the result moment is flat.

## The central design principle (added after second user feedback round)

**Progressive reveal, not exposition.** Dumping all 7 axes + every ingredient property + literal "Wants: stinky 3/5" on launch #1 collapses the discovery loop into a tutorial. Every layer of the game should be DISCOVERED through play, not lectured at the start.

This drives three coordinated reveals:

- **Axes** are discovered by encountering them (Scheme 1)
- **Ingredient properties** fill in as you USE that food (Scheme 2 — mastery-gated Field Guide)
- **Audiences** hint at what they want through funny prose, not numbers (replaces Hard/Easy mode)
- **Named Farts** sit on top — discovered through experimentation, and the legendary ones require an active decoding loop (Codex)

Hard/Easy mode is removed entirely. It's a binary "give it away or hide it" — replaced by graduated prose hints per audience.

---

## The plan: extended Option B

Original Option B (~6h) covers visibility basics. With the user's additional asks (progressive reveal + audience prose + Named Farts) the scope grows. **Total ~24-26h.**

Lands as one PR or a chain of two. Tier-by-tier so you can stop after any tier and ship.

---

### V8 Tier 1 — Fart Profile + Naming + Axis Discovery (~2h)

The "you made THIS" moment.

- **`FartProfileCard`** rendered at top of `#storyResult` after every launch. Big "🚀 YOUR FART" header, 7 horizontal property bars with values 0-5 prominent.
- **Axis-discovery (Scheme 1):** Bars only render for axes the player has DISCOVERED. Player starts with `wet/loud/stink` discovered (the obvious ones). Other 4 (`dry/musical/length/temp`) unlock the first time the player's fart registers ≥1 on that axis. Big splash: **"🎵 NEW DIMENSION: MUSICAL!"** Once unlocked, always shown. Audience prose still hints at unknown axes via metaphor — discovery is rewarded, not blocked.
- **Named fart** — `src/scoring/fart-namer.ts` derives a name from dominant axes. 30-40 templates keyed by axis-pair. "Musical:5 + Length:5 → 'The Long Aria'". Stored on every Trophy / Hall entry.
- **Persistence:** `fart_axes_discovered: AxisName[]` in `persistence.ts`.
- **Tests:** namer unit; axis-discovery state transition; e2e — first-ever musical fart pops splash, second one doesn't.

### V8 Tier 2 — Plate property preview (mastery-aware) (~1.5h)

The "see your fart before you launch" moment.

- **🔮 Predicted Fart** mini-card above the plate slots. Running property total updates on every plate change.
- **Mastery-aware:** if any food on the plate is below Apprentice mastery (< 10 uses), the preview shows confidence-shading on its contribution — the bars for that food's contributions appear lighter and tagged with `???`. Once all foods are ≥ Apprentice, the preview is solid.
- **Discovery-aware:** undiscovered axes don't show in the preview either — consistent with the result panel.
- Uses existing `computeFartFromPlate` / `computeFartFromPreppedPlate` paths.
- Treatment-aware: if Kitchen Mode is on, treatments factor in.
- **Tests:** e2e — fresh save, plate beans (Novice mastery), verify preview shows shaded `???` bars. After 10 uses, verify preview shows solid bars.

### V8 Tier 3 — Sound-property visualization (~1h)

The "I HEARD that wet" moment.

- During fart audio playback, the Fart Profile's bars glow / pulse in proportion to their value.
- Implementation: `setTimeout` per axis seeded from audio duration, animation class added/removed.
- For sound types driven by an axis (loud/musical/length), pulse intensity tracks audio envelope.
- **Tests:** e2e — Fart Profile bars get an `active-pulse` class for 1-2s after launch.

### V8 Tier 4 — Field Guide (mastery-gated reveal, Scheme 2) (~2.5h)

The "I'm learning the system" moment.

Replaces the existing "🌟 Food Mastery" notebook section with a richer "📚 Field Guide". Each food entry is the same shape but its **contents reveal progressively by mastery level**:

| Mastery (uses) | Display |
|---|---|
| Mystery (0) | emoji + name only. Bars hidden. Description = *"untested. who knows."* |
| Hunch (1-9) | emoji + name + 1 bar (the food's highest axis) + flavor text: *"After 3 trials, subject reports elevated WET output. Further study required."* |
| Apprentice (10-24) | 3 bars filled + recipes-where-used |
| Adept (25-49) | 5 bars + synergy list |
| Master (50+) | all 7 bars with numeric values + full description |

- Faux-scientific lab-notebook copy throughout. Player-character as inept fartologist.
- Sort modes: by rarity / by mastery level / alphabetical.
- Locked foods grouped at the bottom: "❓ Mystery food (uncommon) — find one to begin study."
- **Tests:** unit — bar count per mastery tier; e2e — fresh save, beans shows 0 bars; play 10 launches with beans, verify 3 bars now visible.

### V8 Tier 5 — Pantry locked-collapse (~30m)

The "stop showing me 24 mystery cards" fix.

- Launch-screen pantry shows ONLY unlocked foods by default.
- "🔒 Show locked teasers (+24)" toggle expands the rest below. Toggle state persists in localStorage.
- **Tests:** e2e — fresh save shows ~6 cards; toggle → 30 visible.

### V8 Tier 6 — Audience Prose Hints (replaces Hard/Easy mode) (~6h)

The "audiences feel like characters, not stat blocks" upgrade.

**What this replaces.** Tears out `loadHardMode`/`setHardMode` in [src/state/challenge.ts](src/state/challenge.ts), the `#storyHardModeBtn` UI, and the literal "Wants: stinky 3/5 · long 3/5" exposition in `renderAudiencePortrait()` ([src/ui/plate.ts](src/ui/plate.ts) ~L465-515). Replaced by a single prose blurb whose clue density IS the difficulty signal.

**New audience schema.**
```ts
interface Audience {
  // ...existing
  description: string;              // 1-2 sentence in-character blurb (the hint)
  difficultyTier: 'easy' | 'medium' | 'hard' | 'boss';
}
```

**Reveal rules (authoring contract, enforced by lint test):**

| Tier | Axes hinted | Number style | Restrictions hinted? |
|---|---|---|---|
| easy | 4 of 7 | qualitative ("very", "barely") | yes, explicit |
| medium | 3 of 7 | qualitative only | yes, paraphrased |
| hard | 2 of 7 | implicit ("a whisper", "thunder") | vibe only |
| boss | 1 of 7 + cryptic | metaphor only | no |

No tier shows numeric `n/5`. Restrictions get vibe-only on hard/boss.

**5 example rewrites:**

1. **Granny Edna (easy)** — was `Wants: musical 3/5`. New: *"Edna prefers a polite little hum — nothing too loud, nothing too long, just a tidy tune she can pretend not to hear."* Hints musical+loud+length+stink.
2. **Frat Bros (medium)** — was `Wants: stinky 4/5 · loud 5/5 · long 4/5 + min-foods:3`. New: *"Chad and the boys are chanting for something LOUD, NASTY, and BIG — and if your plate's looking thin, don't even bother walking in."*
3. **Alien Tourists (medium)** — New: *"The tourists from Zorptron-7 want something warm, musical, and just stinky enough to write home about — anything earthly will do."*
4. **Librarians (hard)** — was `max-loud:2`. New: *"A pages-rustling sort of crowd. They reward what they can almost-not-hear."* (loud+stink hinted via "rustling")
5. **Silent Monks (boss)** — New: *"The Abbot has not spoken in forty years. He will know if you breathe wrong."* (only length:5 hinted, via "forty years")

**Code changes:**
- `src/state/audience.ts` — add `description` + `difficultyTier`; rewrite all 20 + Mystery Guest + Unicorn entries
- `src/ui/plate.ts` — rewrite `renderAudiencePortrait()`; delete cravings/restrictions DOM, delete Hard Mode branches
- `src/state/challenge.ts` — delete `loadHardMode/setHardMode/HARD_MODE_KEY`
- `src/main.ts` — rip Hard Mode wiring/CSS classes
- `index.html` — remove `#storyHardModeBtn`, `#audienceCravings`, `#audienceRestrictions`
- `src/state/quests.ts` + `recipes.ts` + `activities.ts` — remove `best-hard` quest, Meditation buff, hard-mode-referenced legendary steps
- `tests/unit/audience.test.ts` — invariants: non-empty `description`, valid `difficultyTier`, ≤ 200 chars, no `/\d\/5/` patterns

### V8 Tier 7 — Named Farts + Legendary Codex (~11h)

The "the deepest layer of fart science" system.

**Audit.** 30 recipes already exist in [src/state/recipes.ts](src/state/recipes.ts) (5/6/7/6/6 by rarity). They are currently codex entries + "tap to refill plate" presets — **they grant no property bonus**. Synergies/conflicts are a separate system. Six legendaries have existing `legendaryUnlock.steps` quest gates.

**Target: keep all 30, promote to "Named Farts" with bonuses.** Distribution shifted: 8 common / 8 uncommon / 7 rare / 4 epic / 3 legendary. Common discovery funnel widens; epic/legendary trims so each remaining one feels distinct. Notebook header math (counter, "discover ≥10 recipes" quest) still totals 30.

**Bonus mechanic.** When `matchRecipe()` fires inside `computeFartFromPlate`, apply the recipe's `bonus: Partial<FoodProperties>` BETWEEN synergies and conflicts, clamped to 5. UI shows *"Named Fart: Swamp Beast — +1 wet, +1 stink, +1 length"*.

| Rarity | Bonus |
|---|---|
| common | +1 to 1 axis |
| uncommon | +1 to 2 axes |
| rare | +2 to 1 axis OR +1 to 3 |
| epic | +2 to 2 axes |
| legendary | +2 to 3 axes |

**Sample Named Farts (15 of 30):**

| Name | Rarity | Ingredients | Bonus | Description |
|---|---|---|---|---|
| Swamp Beast | common | beans, cheese | wet/stink/length +1 | The bog stands up and walks. |
| Sad Trombone | common | cheese, onion | musical/length +1 | Three notes, all of them disappointed. |
| The Polite Cough | common (new) | egg, cabbage | dry/stink +1 | Heard in libraries. Felt in lobbies. |
| Mouse Squeak | common | onion, cabbage | loud +1 | One pip. One regret. |
| Sulfur Bomb | uncommon | egg, pickle | stink/temp +1 | Lab goggles recommended. |
| The Brine Reckoning | uncommon (new) | sardines, kimchi | wet/stink +1 | The ocean filed a grievance. |
| Asparagus Symphony | uncommon | asparagus, cheese | musical/length +1 | Three movements. No intermission. |
| Champagne Pop | rare | kombucha, pickle | musical +2 | A toast nobody asked for. |
| Brimstone Sonata | rare | aged-stilton, asparagus, kombucha | musical/stink/length +1 | The Aristocrat, raised by wolves. |
| Dragon Belch | rare | ghost-pepper, kohlrabi | loud +2 | Roar first. Apologize never. |
| The Goblin's Whistle | rare | onion, garlic, pickle | stink +2 | Small mouth. Enormous opinion. |
| The Forbidden Vespers | epic | stinky-tofu, pickled-egg, garlic | stink/wet +2 | Sung in the key of regret. |
| Operatic Marshcough | epic | natto, cabbage, beans | length/wet +2 | Encore. Encore. Please stop. |
| Wet Velvet Curtain Call | epic | kviek-yogurt, asparagus, aged-stilton | musical/length +2 | Standing ovation. Sliding exit. |
| Decommissioned Brass Choir | epic | asparagus, kombucha, casu-marzu | musical/loud +2 | Section by section, they retire. |
| The Forbidden Blast | legendary | forbidden-burrito, volcano-chili, ghost-pepper | temp/loud/stink +2 | They wrote songs about this one. |
| Cosmic Symphony | legendary | sky-bean, glowing-mushroom, kombucha | musical/length/stink +2 | Felt as much as heard. |
| Apocalypse Class | legendary | forbidden-burrito, mystery-casserole, cursed-egg | stink/wet/length +2 | Use only in emergencies. Or final exams. |

(15 more in the implementation spec.)

**Legendary Fart Codex.** Legendaries pass their existing `legendaryUnlock.steps` gate → Codex unlocks the slot grid. Recipe row shows name + emoji + flavor + N greyed slots ("??? ingredient #1 of 3"). Ingredient list itself stays sealed.

- **Test action:** spend `5 gold + 1 research note + 1 of the tested ingredient`. Ingredient consumed regardless.
- **Hit:** slot fills permanently with food chip + emoji.
- **Miss:** hint offered — *"Not in this recipe. But something **musical** would fit slot 2."* Hint only mentions axes the player has already DISCOVERED (interaction with Scheme 1).
- **Full decode:** marks recipe discovered AND unlocks a permanent passive buff:
  - Forbidden Blast → "+10% gold from every match"
  - Cosmic Symphony → "+1 musical to all plates"
  - Apocalypse Class → "One free re-roll per audience"

**Persistence:**
```ts
type LegendaryCodexState = Record<recipeId, {
  revealed: Record<slotIndex, foodId>;
  tested:   Record<slotIndex, foodId[]>;
  fullyUnlocked: boolean;
  buffClaimed: boolean;
}>;
```

**UI:** new "📜 Legendary Codex" notebook tab. Slot grid; clicking a locked slot opens a pantry food-picker. Tested-and-failed foods grey out for that slot only.

**Code changes:**
- **New** `src/state/codex.ts` — state type + load/save + `testSlot()` + `applyCodexBuff()`
- **New** `src/ui/codex.ts` — codex panel + slot-test interaction
- **Modified** `src/state/recipes.ts` — add `bonus` + `legendaryBuff?` per recipe; rename 6 recipes to punchier set
- **Modified** `src/scoring/fart-recipe.ts` — `computeFartFromPlate` calls `matchRecipe`, applies bonus, appends "Named Fart: <name>" to triggeredSynergies
- **Modified** `src/state/persistence.ts` — `fart_legendary_codex` key + helpers
- **Modified** `src/ui/notebook.ts` — Codex tab; legendary cards show slot grid

---

## Total

| Tier | Hours |
|---|---|
| T1 — Fart Profile + Naming + Axis Discovery | 2 |
| T2 — Plate preview (mastery-aware) | 1.5 |
| T3 — Sound-property visualization | 1 |
| T4 — Field Guide (mastery-gated) | 2.5 |
| T5 — Pantry locked-collapse | 0.5 |
| T6 — Audience Prose Hints (kills Hard/Easy) | 6 |
| T7 — Named Farts + Legendary Codex | 11 |
| **Total** | **~24-26h** |

T1-T5 land first as a PR (~7.5h, the visibility core). T6 follows as its own PR (~6h, the audience overhaul). T7 lands last as its own PR (~11h, the deepest mystery layer). Each PR shippable on its own.

## Verification (RULE 3)

- T1-T5: fresh save in browser. Plate foods, watch preview update with `???` shading, launch, see Fart Profile + named fart + sound-pulse + axis-discovery splash on first musical fart. Open notebook, verify Field Guide shows 0 bars for unused foods, fills in by mastery. Pantry shows 6 cards (not 30) on fresh save.
- T6: fresh save again. All 20 audiences carry prose blurbs. Cycle through pool — easy audiences feel readable, bosses feel cryptic. No `n/5` numbers visible anywhere. Hard Mode button is gone.
- T7: cook a known recipe (beans+cheese), see "Named Fart: Swamp Beast +1 wet +1 stink +1 length" banner; properties on Fart Profile reflect the bonus. Open notebook → Legendary Codex tab. Pass quest gate for one legendary; test an ingredient (correct + incorrect); verify hint + persistence + buff unlock.

Until T1-T5 land, the game's core feedback loop — *what just happened?* — is broken. T6-T7 layer mystery on top of the working feedback loop, not on a black box.
