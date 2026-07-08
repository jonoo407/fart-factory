# REDESIGN v10 — "HOLD IT IN" (proposal)

> **Status: PROPOSAL — nothing here is implemented.** Written 2026-07-08 after the user's verdict on
> the v9 build: *"the core idea of farts will resonate with the target audience of kids but the core
> gameplay loop is broken — it is not fun, there is no reason to keep playing."*
>
> Method: Jesse Schell's *Art of Game Design* lenses, restricted to the always-on core set
> (Essential Experience, Emotion, Fun, Surprise, Curiosity, the Toy, Flow, Meaningful Choices,
> the Interest Curve, the Elemental Tetrad, Endogenous Value/Reward). Diagnosis first, then the
> redesign, then a module-by-module map of what survives.

---

## 0. Verdict in one paragraph

The v9 game is a **grading engine wearing a fart costume**. The player's real activity is solving a
7-dimensional distance-minimization problem against mostly-hidden targets, and the fart is the exam
submission: the payoff screen is a letter grade, a percentage, and a 7-row report card. Everything a
kid comes to a fart game for — *making something outrageous happen and watching people react* — is
delivered as prose ("Granny Edna marches out muttering about manners") under a red **F**. The fix is
not more systems (v7 added streaks/loot/mastery; v9 added the pass gate and judge card; still not
fun). The fix is to change what the player *does moment to moment*: replace **target-matching**
with **push-your-luck** — stuff the belly food by food, feel the pressure build, dare one more bite,
and release a fart whose *size you gambled for* onto a crowd that reacts with **physical slapstick,
not prose**. Holding it in *is* the fart joke. The mechanic finally becomes the theme.

---

## 1. Evidence (verified, not assumed)

Played in the live preview (mobile viewport, fresh save, 2026-07-08), at commit `6f041b7`.
**Concurrency note:** while this proposal was being written, PRs #32 and #33 landed on main —
#32 re-words the judge card ("some" not "LOTS" for mid cravings, misses now say over/under; its own
code comment concedes the confusion this doc cites: *"wanted lots, gave lots, ✗?!"*), and #33 adds
a live crowd-mood read while plating plus a Danger Zone overcharge on the charge timer. Both are
feedback-layer patches in the same emotional direction as this proposal (more anticipation, a dash
of risk) — but the scoring engine, 7-axis hidden judging, pass gate, report-card payoff, and
zero-pay anti-grind economy are unchanged, so every structural finding below still holds. The
Danger Zone is the push-your-luck instinct applied to the wrong object: it risks a *timing
multiplier*, not the fart itself.

1. **The game's own hint fails the game's own test.** Show 1 of 6, Granny Edna. The hint bar says
   *"💡 Try these for Granny Edna: Zap Pea, Broccoli, Onion."* Plating 2×Zap Pea + Broccoli scored
   **F · 24% — "Bombed. Total flop."** Hand-tracing the scoring confirms plating *exactly the three
   suggested foods* scores ~**23% F** as well (their summed axes overshoot nearly every target).
   A 9-year-old's first launch, following the game's own advice, is a shame screen.
2. **The ticket under-discloses; the engine over-judges.** Granny's chips show 3 cravings
   (Tooty/Dry/Length). Her actual craving vector is non-zero on **all seven axes**
   (`audience.ts: c(1,2,1,1,3,2,1)`), every axis is judged, and the weakest-link blend puts **45%
   of the base score on the single worst axis** — usually one that was never shown. The judge card
   then reveals all 7 axes after one launch, so the "mystery" lasts exactly one blast.
3. **Overshoot is punished like undershoot** (`closeness = 1 − dist^0.85·1.5`, symmetric). The chip
   says *"wanted LOTS"*; giving the maximum is scored as a miss. The UI teaches direction; the
   engine scores distance. For a kid, "more tooty!" → F reads as random.
4. **The payoff is a report card.** The reaction screen is: emoji row, grade stamp, one line of
   prose, a 7-row axis table with ✓/~/✗ badges, and a math breakdown ("Base match 29% · Weak charge
   ×0.85"). The crowd never visibly *does* anything. All comedy is text.
5. **The economy pays in days; a kid plays in minutes.** A pass pays `baseGold × pct` **once** —
   replaying pays only the improvement over your best, i.e. usually **0** (`reward.ts`, anti-grind).
   Shop prices: uncommon 12g, rare 30g ("~1 week of decent play" per `shop.ts`), epic 70g. There are
   no random drops on the normal path. Playing more of the game is literally worth nothing.
6. **The charge sweep is a foreign minigame.** A hidden 74–92% timing window multiplies the
   chemistry result by 0.85–1.25×. It has no fiction (what is "charging"?), and it corrupts the
   learning loop: a correct plate can grade worse than a wrong one because of a timing flub.

---

## 2. Diagnosis through the core lenses

**Essential Experience** — *What experience do I want the player to have? What is essential to it?*
The essential fart experience for a kid is: **anticipation → eruption → social chaos → laughter.**
The build delivers: composition → submission → evaluation → feedback. Nothing in the loop swells,
erupts, or causes chaos. The essence was never captured; it was graded.

**The Toy** — *If my game had no goal, would it still be fun to play with?*
No. Strip the score away and what remains is: tap food tiles, hold a button, hear a fart clip, read
a sentence. The belly doesn't visibly fill. The character doesn't squirm. The crowd doesn't flinch.
There is no toy here — and Schell says build the toy *first*.

**Emotion** — *What emotions do I want players to feel? What are they actually feeling?*
Wanted: gleeful naughtiness, giggles, "watch THIS." Delivered in session 1: confusion (7 axes,
"Tooty," a charge meter), then failure-shame (**F — Total flop** while following the game's hint),
then homework (the judge card asks you to tune ✗ axes). In a comedy game the failure state must be
*funnier than success* — here failure is a red stamp and a retry wall.

**Fun = pleasure + surprises** — a 24% flop and a 61% pass *feel identical*: same screen shape, same
text density, different number. There is no catastrophic-hilarious outcome, no jackpot outcome. The
score varies; the *experience* doesn't. (v6 critique said exactly this; v9 didn't fix it.)

**Curiosity** — *What questions does the game pose?*
One real question exists — "what does this food do?" — and the build answers it aggressively:
the hint bar tells you what to plate before you've asked anything, and the judge card prints the
full demand vector after one launch. After show 2 the only remaining question is "what number will
I get," which is arithmetic, not curiosity. (This is FUN_CRITIC gate #11 — Displayed-Target Puzzle —
reborn with one launch of latency.)

**Meaningful Choices / Triangularity** — *Is there a safe play for a small reward and a risky play
for a big one?*
No. Distance-matching has a *correct answer*; every plate is either closer or further from it.
There is no "dare." No moment where a kid's eyes go wide because they're about to try something
greedy. Choices exist (which foods) but they're a solver's choices, not a gambler's — and kids are
gamblers.

**Flow** — *Clear goals, no distractions, challenge matched to skill?*
Goals are unclear (you're judged on axes you can't see, in units you never learn). The challenge
curve is a cliff into a wall: show 1 can flop on the game's own advice, and the pass gate then locks
you against the same crowd with a diminishing bag of belly. Between the crowd card, hint bar, daily
quest card, belly meter, plate, location line, pantry, and blast button, the play column is ~3 phone
screens tall — the "read → load → blast" rhythm is buried in scroll.

**Interest Curve** — *Where is the hook? Does interest rise to a climax?*
A show's interest curve is flat: plating is instant, the blast is instant, the reaction is instant.
No rising action inside a show; no swelling anticipation before the release; the biggest moment
(the fart) has the same screen-weight as the smallest (a food tap). Across a session it's C, C, B,
C… — no spikes, because nothing spikes.

**Endogenous Value / Reward** — *Why keep playing? What does playing buy?*
The anti-grind rule means replaying pays **zero**. The shop is priced on a multi-day cadence for a
player whose session is 20 minutes. Nothing drops, ever, on the normal path. Stars exist but gate
nothing a kid can feel. The honest answer to "why keep playing" is: to see a percentage go up. That
is the Hollow Score gate failing in its v10 form.

**Elemental Tetrad / Unification** — *Do mechanics, story, aesthetics, technology reinforce one
theme?*
The aesthetics scream silly (sticker borders, Baloo type, fart mascots). The mechanics whisper
precision: symmetric penalty curves, letter grades, percent breakdowns, a timing window. The
technology (a 200-clip fart bank, stem-layered audio, per-crowd voice lines) is built for spectacle
the mechanics never order up. The theme is "gross-funny chaos"; the scoring rewards *restraint and
accuracy*. The tetrad is at war with itself.

**Summary:** every core lens fails at the same root: **the loop is an exam, and the fart is the
answer sheet.** No amount of meta (streaks, mastery, quests, ladders — all shipped, all fine) fixes
an exam. The loop itself must produce anticipation, risk, eruption, and slapstick.

---

## 3. The redesign: HOLD IT IN

### 3.0 Pillars

1. **The fart is fireworks, not a report card.** Every launch ends in a full-screen physical-comedy
   scene whose scale the player authored. No letter grades anywhere.
2. **Bigger is funnier; bigger is riskier.** The core decision is *push your luck*: one more food?
   Kids can't compute distance to a 7-vector; every kid on earth understands "how much more do I
   dare."
3. **Failure is the best content.** A blowout is the most spectacular scene in the game and drops
   the rarest collectible. Kids should *sometimes fail on purpose* and cackle.
4. **Every launch pays something you can hold.** Applause (gold), loot drops, disaster cards,
   stickers, records. Replay always pays *something*; nothing is ever worth zero.

### 3.1 The new core loop — STUFF → SQUEEZE → SHOW-OFF (one show ≈ 45–90s)

**Beat 1 — STUFF (the toy).** The performer stands on stage, belly visible. Tap a food: they *eat
it* — chomp animation, gulp, the belly inflates a notch, a bass rumble joins the mix (existing stem
bank), the **Pressure needle** climbs, and the room reacts to the rumble (glasses tinkle, the dog's
ears go up, a kid in the crowd whispers). Each food stamps its **flavor** onto the brewing fart.
This beat must pass the Lens of the Toy alone: eating + inflating + rumbling with no goal is
already funny.

**Beat 2 — SQUEEZE (the decision).** The pressure meter has visible zones:
`POLITE ×1 → SOLID ×2 → EPIC ×3 → LEGENDARY ×5 → 💥 BLOWOUT`.
Past SOLID, every additional food rolls against a **blowout chance** that grows with pressure and
is *shown on the character's body* (cheeks puff, sweat beads, eyes cross — primal, no numbers
needed; a % label for the parents). Survive the roll: the whole room gasps — "…they held it."
That per-tap gasp is the tension beat, 3–6 times per show. This is Triangularity as a physical
sensation: bank a SOLID show now, or dare LEGENDARY?

**Beat 3 — SHOW-OFF (the payoff).** Hit RELEASE (big green button; a quick tap, no sweep-timer).
The fart plays — pressure drives length/volume stems, flavors pick the character stems — while the
camera cuts to a **full-screen crowd vignette**: Granny's wig lifts off; the frat bros chest-bump
and knock each other over; the goths crack one smile and their mascara falls off; the toddlers
achieve enlightenment. Applause rains as countable coins. Scene scale = pressure zone; scene
flavor = crowd × flavor tags. **The reaction is animation first; the numbers are a footnote.**

**Blowout (pushed too far):** the screen shakes, cut to a unique **disaster vignette** per
venue/crowd ("The Great Backyard Evacuation"), the crowd flees hilariously, you earn a **Disaster
Card** for the album plus a consolation pittance. Loud, spectacular, collectible — never a red F.

### 3.2 Flavors replace axes

Seven hidden 0–5 axes collapse into **four chunky flavor tags** + one texture:

| Old axis | Becomes |
|---|---|
| stink | **STINKY 🤢** tag (food has it if stink ≥ 3) |
| loud | **LOUD 📢** tag |
| musical | **TOOTY 🎺** tag |
| temp | **BLAZING 🔥** tag |
| wet / dry | texture — picks squelchy vs. crackly stems, pure audio flavor |
| length | folded into **pressure** (bigger belly = longer rip) |

A fart's profile is just its tag multiset ("LEGENDARY pressure, STINKY×2, TOOTY"). Foods keep their
identities and art; their stat blocks get *simpler and honest*. Discovery survives: the first time
you eat a food its tags pop up as a reveal ("Broccoli is secretly TOOTY! 🎺").

### 3.3 Crowds become bingo cards, not distance functions

Each crowd shows its **entire** taste, always, as at most three chunky rules on the ticket:

> **Granny Edna** · LOVES 🎺 TOOTY (×2 applause) · HATES 📢 LOUD · *"nothing too loud, dear"*

- **LOVES** = multiplier per matching tag. Overshooting is *never* punished — wrong tags simply
  don't multiply. The UI's promise ("LOTS!") and the engine finally agree.
- **HATES** = present tag triggers a **SCANDAL** ejection vignette (its own slapstick scene):
  applause ÷4, but +1 **Scandal Card**. Even the worst outcome pays a collectible and a laugh.
- Difficulty scales by *demands*, not hidden dimensions: later crowds want tag combos ("TOOTY and
  BLAZING"), minimum pressure zones ("EPIC or the Frat Bros boo"), or venue hazards (the Library's
  silence meter makes LOUD risky *environmentally*). Bosses are scripted demand-twists — the
  existing 5 boss puzzle identities port straight across.

Skill curve: novices stuff 2 foods and always get a show (floor is a laugh, never an F). Experts
plan treatments + food tags + clench timing to ride the needle to LEGENDARY against a hate-tag
crowd for a record. Easy to learn, genuinely hard to master — Bushnell restored.

### 3.4 The CLENCH (skill, diegetic, replaces the charge sweep)

When a risky stuff sends the needle wobbling toward blowout, a ~1.5s wobble window opens: tap
**CLENCH** in rhythm and the performer squeezes — a comedy squeak vents 2 pressure (an audible
micro-fart; even the safety valve is content). 2 clenches per show; treatments upgrade it. Timing
skill stays in the game, but now it's *in the fiction* and it's a save, not a hidden multiplier.

### 3.5 Rewards: the faucet finally opens

- **Applause = gold**, every launch, scaled by zone × tag multipliers. Replays pay full applause
  with a soft encore falloff (e.g. ×0.75, floor ×0.25) — **never zero**. Delete the
  improvement-only rule; blowout risk already prevents infinite safe farming.
- **Loot drops:** each crowd has a themed drop table rolled on every show ("the Frat Bros throw
  you a Hot Pepper 🌶️"). Commons often, rares sometimes, epic on records/bosses. The shop survives
  as a gold sink, but *gifts* lead the economy — Mario-Kart-box energy, not commerce.
- **The Fart Album** (rebuilt Book): auto-snapshotted best-fart "photos" per venue, Disaster Cards
  (??? slots visible — curiosity gaps you can point at), Scandal Cards, crowd stickers for
  max-applause shows. This is the show-off surface — a kid hands the phone to a parent and narrates
  the album. (Lens of the Story Machine: the game now *generates tellable stories*.)
- **Venue records:** "Biggest fart survived at the Library: 14.2 💨" — per-venue best-pressure
  boards, beaten = confetti + epic roll. Beat-your-record is the evergreen session pull.

### 3.6 Structure: ladder stays, walls go

- The venue ladder, regions, locations, and boss cadence all survive. **Advancement gates on
  cumulative venue applause** (a thermometer fills toward the boss), not per-crowd pass/fail — no
  retry walls; any show adds heat. Encore any crowd whenever, always paid.
- Kitchen treatments become **tools/consumables** chosen pre-show: Antacid (cancel one blowout),
  Bean Butter (+1 pressure per food, +risk), Chili Oil (adds 🔥 to the plate). A real loadout
  decision instead of a passive stat delta.
- Recipes/hidden-combos survive as **Secret Blends**: exact plates (Beans×3 = "The Triple Bean")
  that trigger signature farts with their own jingles — discoverable, never hinted, album-logged.
- Daily quest re-points to the new verbs ("Survive LEGENDARY twice", "Collect 2 Disaster Cards").

### 3.7 The 30 seconds, before vs. after

**v9:** read 3 chips → tap 3 tiles (no feedback) → hold a button watching an abstract sweep →
**F · 24%** → read a 7-row table → "Try this crowd again."

**v10:** Granny's ticket: LOVES 🎺 / HATES 📢 → feed Broccoli — *chomp, gulp, belly pops a notch,
rumble* → two more — needle enters EPIC, cheeks puff, crowd leans in → one more?? — *gasp — held
it* → CLENCH squeak (giggle) → one more → LEGENDARY → RELEASE → three-second tooty THUNDER, wig
airborne, coins raining, "NEW BACKYARD RECORD 12.1 💨", a 🌶️ flies out of the crowd → next crowd's
ticket slides in. Two real decisions, three laughs, loot in hand, a record on the board.

### 3.8 Lens re-check (why this passes where v9 fails)

| Lens | v10 answer |
|---|---|
| Essential Experience | anticipation → eruption → chaos → laughter, in that order, every show |
| The Toy | eat/inflate/rumble is fun with zero goals; goals only aim it |
| Emotion | naughtiness + suspense + slapstick; worst case is the funniest case |
| Fun/Surprise | outcomes are *categorically* different scenes (polite/epic/legendary/blowout/scandal), plus drops |
| Curiosity | food tags to discover, ??? card slots, secret blends, "what does the Opera House blowout look like" |
| Meaningful Choices | 3–6 push-your-luck calls per show + loadout; no correct answer, only appetite |
| Flow | goal always legible (fill the needle, hit the tags); challenge = demands + hazards, floor never shames |
| Interest Curve | each show literally *inflates* to a climax; sessions spike on records/blowouts/bosses |
| Endogenous Value | applause→gold→foods; pressure→records; risk→cards; everything buys something felt |
| Tetrad/Unification | the mechanic (holding it in) *is* the joke; audio/art finally serve the loop |

### 3.9 What survives / changes / dies (module map)

| Existing | Fate |
|---|---|
| 30 foods, rarity, pantry art (`food.ts`) | **survives** — axes → tags + pressure size |
| 20 audiences + prose voice (`audience.ts`) | **survives** — cravings → LOVES/HATES; each gains 3–4 reaction vignettes |
| Audio bank + stems (`audio/*`, PR #29–31) | **survives** — pressure = length/volume, tags pick stems; clutch squeaks reuse shorts |
| Venue ladder, regions, locations, boss cadence | **survives** — gate condition swaps to applause thermometer |
| Boss identities/puzzles | **survive** as demand-twist shows |
| Kitchen treatments | **re-pointed** to tools/consumables |
| Recipes / hidden combos | **re-pointed** to Secret Blends |
| Daily quest, trophies, save/IO | **re-pointed** verbs |
| Order-Ticket visual language (paper/ink/green) | **survives** wholesale |
| `match.ts` 7-axis closeness/blend/hate engine | **dies** → ~30-line tag-multiplier arithmetic |
| Grades S–F, judge card, % breakdown | **dies** → scene scale + applause count + records |
| Charge sweep (`charge.ts` zones) | **dies** → CLENCH |
| Pass gate + "try again" wall | **dies** → applause thermometer |
| Anti-grind zero-pay (`reward.ts`) | **dies** → encore falloff, floor > 0 |
| Hint bar (`food-hint.ts`) | **dies** (it currently recommends an F) — teaching moves into tag reveals |
| Belly-as-ammo across launches | **dies** — pressure is per-show; shows are the pacing unit |

Net: the meta mostly survives; the **loop core is replaced**, and the code that dies is mostly the
code that took v7–v9's balance effort to keep upright. New build surface: pressure/risk engine
(pure, seedable, TDD-friendly), vignette player (data-driven scene templates per crowd × outcome),
tag scoring (trivial), album. The vignettes are the real art cost — start with 2 generic templates
(cheer/flee) parameterized per crowd emoji/props, ship, then hand-craft the top 10.

### 3.10 Open questions for the user

1. **Blowout randomness** — dice-style visible risk (proposed) vs. fully deterministic threshold
   discovered per-crowd? (Dice = more gasps; deterministic = more plannable. Kids test says dice.)
2. **Scope of vignettes v1** — 2 parameterized templates at launch, or hold for ~10 hand-crafted?
3. **Does anything of grades survive** for the adult min-maxer (e.g. a hidden "style score" in the
   album), or is applause+records the whole scoreboard?
4. Party mode ("pass the phone, who dares bigger") is an obvious future — in or out of v10 scope?

### 3.11 Suggested build order (each phase red/green TDD-able)

P0 pressure+risk+clench engine (pure functions, seeded) · P1 tag model + food tag mapping +
crowd LOVES/HATES + applause math · P2 stage scene: eat/inflate/rumble + release + generic
vignettes · P3 economy swap (applause gold, drops, encore falloff) + ladder thermometer ·
P4 album + records + cards · P5 bosses/treatments/blends/daily re-point · P6 vignette bespoke pass
+ audio polish. (Full PLAN_v10 with failing-test lists to follow once the direction is approved.)

---

## 4. Progression: THE RISE — from Backyard Nobody to Cosmic Legend

> Added 2026-07-08 after the user approved the core-loop direction and asked: *"what about
> progression? what is a fun and meaningful progression system?"*

### 4.0 What makes progression *meaningful* (the bar to clear)

Five tests, drawn from the lenses and from this project's own failed attempts:

1. **The arc is nameable in one sentence** (Cook's Loops-vs-Arcs; FUN_CRITIC gate #10). Ours:
   *"A backyard nobody grows a legendary gut, wins over every crowd in the world, and retires a
   Cosmic Legend with a full scrapbook."* If a kid can't say what they're becoming, it's not an arc.
2. **Progress buys new DECISIONS, not bigger numbers** (Koster mastery; Cook skill atoms). Every
   major unlock must add a verb, a rule, or a choice — never only `+N`. The v1–v9 builds inflated
   numbers around an unchanging verb three times; never again.
3. **Every session ends holding something** (Lens of Reward; the v6 "loot vs commerce" critique).
   Gifts lead, purchases follow, and nothing meaningful is gated behind real-world days.
4. **Progress is visible without opening a menu** (Lens of Visible Progress). The stage, the
   marquee, the crowd size, and the performer themselves must *look* different at hour 10 vs hour 1.
5. **Failure also progresses** (P30, Hades/Spelunky model). Blowouts and scandals pay collectibles
   and fame trickle. Zero-payout outcomes are banned everywhere in the design.

### 4.1 The four tracks (one spine, three orbits)

**Track 1 — FAME, the spine (who you're becoming).**
Every show's applause feeds two meters at once: **gold** (spendable) and **FAME** (cumulative,
never decreases — the game only ever judges you upward, Lens of Judgment, kid-safe). Fame fills
toward **Rank-Ups** — a marquee moment: lights flare, your name gets bigger on the poster, the
crowd chants. ~12 ranks per save, milestone ranks carry stage titles:
`Backyard Amateur → Local Stinker → City Sensation → Wilderness Windmaker → Royal Gasmaster →
Cosmic Legend`. Early ranks land every 2–3 shows; late ranks every ~8–10 (tuning knobs).

**Ranks 1–8 each grant a GUT UPGRADE — pick 1 of 3** (the build-your-own-performer choice; kids
love picking, and picks diverge into recognizable builds):

| Line | Example upgrades (pool ~15) |
|---|---|
| **Capacity** (push deeper) | *Iron Stomach* (+2 belly) · *Rubber Belly* (blowout threshold +1 notch) · *Double Gulp* (once/show: eat 2 foods on one risk roll) |
| **Control** (push safer) | *Titanium Clench* (+1 clench/show) · *Slow Cooker* (see the exact blowout %, replacing body-language-only — knowledge as an upgrade for the min-maxer) · *Belly of Holding* (carry 1 uneaten food between shows) |
| **Chaos** (fail funnier) | *Blowout Artist* (disaster scenes pay double cards + pity applause) · *Scandal Darling* (hate-tag ejections pay +50% — "they'll talk about this for WEEKS") |

A Chaos build that *wants* blowouts is legitimate, hilarious, and keeps pillar 3 honest.
Ranks 9–12 grant stage tiers + titles + gold purses (prestige, no power creep).

**Track 2 — REGIONS as new rules (what the game becomes).**
The five existing regions stop being reskins and each introduces **exactly one new mechanic** that
composes with stuffing/squeezing (progressive disclosure, one skill atom per region):

| Region | New atom |
|---|---|
| Hometown | the pure loop (stuff/squeeze/show-off) |
| City | **Venue hazards** (Library silence meter — LOUD is environmentally risky; Fancy Restaurant bans STINKY) + **tools** (kitchen treatments become pickable pre-show consumables) |
| Wilderness | **Wild foods** — foraged one-shots with huge tags and *unknown size revealed only when eaten* (a gambling food!) + wind that carries LOUD farther (multiplier shifts) |
| Royal | **Etiquette flips** — a herald announces mid-show that a tag's polarity flipped ("TOOTY is now vulgar!"); **encore chains** — nobles demand two shows from one belly (allocation decision) |
| Cosmic | **Zero-G pressure** — the needle drifts back down, so stuffing gains time pressure; a fifth flavor tag **COSMIC ✨** only from cosmic foods |

Day-7 play contains day-1 items combining non-trivially with new rules (P28 satisfied): beans are
still beans, but beans *in zero-G during an etiquette flip* is a different puzzle.

**Track 3 — THE COLLECTION (what you're keeping).** All existing collection code re-points here:
- **Food drops** (30 foods; drop tables per crowd, owned-filtered) — every food is a new toy, not a
  stat stick. Crowds *throw* them; card-flip reveal. Shop survives as a gold sink for tools +
  **costumes** (cape, crown, tutu — worn by the performer *inside every vignette*; expression, zero
  balance impact, prime kid catnip).
- **Boss Relics** — each of the 5 bosses drops a unique keepsake with a verb: *Opera Phantom's
  Tuning Fork* (reveals a crowd's secret **bonus** tag — hidden info as pure upside, never a
  gotcha) · *Frat King's Golden Keg* (start shows at +3 pressure) · *Grandpa's Lucky Chair*
  (once per venue, re-roll a blowout) · etc. Relics are the "I beat that boss" story objects.
- **The Album** — per-region pages: crowd stickers (max-applause), Disaster Cards (1 per venue,
  ??? slots visible from day one — pointable curiosity gaps), Scandal Cards, venue pressure
  records, Secret Blends, and **golden mastery stamps** (eat a food ~25 times → the crowd starts
  recognizing it: "He's doing the BEANS!" — recognition, not stats, closing the v6 mastery gap
  without number inflation). Completion % per page; a show-it-off mode for handing the phone over.

**Track 4 — RECOGNITION (the world remembers you).** Cheapest track, most charm:
- **The stage itself grows** with rank — bigger curtains, more lights, deeper crowd rows, your
  title on the marquee. Hour-10 vs hour-1 is visible from the home screen with zero menus.
- **Recurring fans**: 3-star a crowd and its portrait starts appearing in later regions' audiences
  wearing your merch. Granny Edna follows you to the cosmos. A per-save "Biggest Fan" line.
- **Venue records** stay forever beatable — the evergreen "one more try" for any session length.

### 4.2 The goal stack (what am I doing, at every zoom level)

| Timescale | The question in the player's head |
|---|---|
| this tap | *dare one more bite?* |
| this show | *which zone do I bank, and do I hit their LOVES?* |
| this venue | *fill the thermometer → boss; beat my record* |
| this region | *learn its twist, win its relic, finish its album page* |
| this save | *reach Cosmic Legend with MY gut build; complete the album* |
| forever | *records, secret blends, the weekly Legendary Demand* |

(GamePlus's Hot Spot re-points to a **weekly Legendary Demand** — one rotating outrageous request,
e.g. "LEGENDARY + TOOTY + no clenches at the Opera House" — for the long-tail player.)

### 4.3 Pacing promise (the first session, ~20 minutes)

Show 1: two tag reveals + first food drop · Show 2: first venue record · Show 3: **RANK UP → first
gut pick** · Show 4: a crowd whispers a Secret Blend hint · Show 5: VIP variant + second drop ·
Show 6: **BOSS → relic + City unlocks**, likely rank 2. Every show ends with a take-home strip
(applause · fame delta · drops). Every *session* ends with something structural: a rank, a relic,
a region, or an album page milestone. Nothing is day-gated; the daily quest survives as pure bonus.

### 4.4 Flow across the arc (why it stays tense)

Gut upgrades raise what you can survive; crowd demands and hazards raise what you must attempt
(Frat Bros boo below EPIC; royal courts demand LEGENDARY under a flip). The *ratio* stays roughly
constant, so the needle's danger zone never stops mattering — a veteran is not safer, they're
braver at higher altitude. Mastery expression for experts is self-set (Lens of Goals): clean
LEGENDARY (no clenches), naked runs (no tools), all logged as album badges.

### 4.5 Lens re-check for progression

Goals: concrete at six timescales · Visible Progress: needle → thermometer → marquee/stage → map ·
Novelty: one new rule per region, not front-loaded · Curiosity: ??? album slots, locked regions on
the map, bonus tags behind the Tuning Fork, unknown-size wild foods · Meaningful Choices: 1-of-3
gut picks, tool loadouts, encore allocation · Endogenous Value: fame→upgrades, applause→tools and
costumes, records→titles — every number buys something felt · Reward: mixed cadences (drops per
show, ranks per few shows, relics per region) = variable-ratio without dark patterns · Judgment:
upward-only fame, no losable progress, no grades anywhere.

### 4.6 Module map (progression specifically)

| Existing | Fate |
|---|---|
| `venue-ladder`, `location-progress`, `boss-cadence` | **survive** — thermometer gate + region atoms |
| `trophies.ts`, `conquests.ts` | **become** the Album's badges/records backbone |
| `quests.ts` (legendary unlock chains) | **re-point** to boss relics + Secret Blend hints |
| `shop.ts` | **pivots** to tools + costumes (foods move to drops); prices re-cut to session scale |
| `food-mastery.ts` | **re-points** to golden stamps (recognition, not stat perks) |
| `gameplus.ts` (Hot Spot) | **re-points** to the weekly Legendary Demand |
| `daily-quest.ts` | survives as bonus-only |
| `codex.ts` / `field-guide.ts` | **merge into** the Album |
| NEW | fame/rank engine (pure, seeded) · gut-upgrade registry + pick UI · drop tables · stage-growth renderer · recurring-fan cameo picker |

### 4.7 Open questions (progression)

1. **Gut picks: permanent per save, or respec-able?** (Proposed: permanent — builds are identity;
   a NG+ "World Tour" resets picks for replay value.)
2. **How much randomness in drops?** Proposed: guaranteed-drop pity every 3 shows per region so a
   session never ends dry; pure RNG otherwise.
3. **Costumes: gold-only, or some as album-completion rewards?** (Proposed: both — shop for basics,
   completion for the showpieces like the Cosmic Crown.)
4. Should mastery stamps stay purely cosmetic, or carry one tiny perk tier? (Proposed: cosmetic —
   this project has been burned by stat creep twice.)
