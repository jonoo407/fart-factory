# 01 — Game Systems

The complete game logic. Where this doc and the prototype (`design_reference/prototype/ff-app.jsx`) ever disagree, **the prototype is authoritative** — it's tested and tuned. Constants below are copied from it verbatim.

---

## 1. The core loop (one "Show")

```
READ the crowd  →  LOAD the plate  →  CHARGE & BLAST  →  REACTION
   (what do        (tap foods onto     (hold button to    (full-screen payoff:
    they crave?)    the plate, belly    charge; release     grade, judge card,
                    limits capacity)    in the sweet spot)   rewards, discovery)
```

Surface is dead simple (match the big icons). Depth is hidden one layer down (7 axes, synergies, charge timing, treatments, recipe mastery). A 9-year-old plays the surface; an adult optimizes the depth.

---

## 2. Axes — the hidden vocabulary

Six judged axes plus one derived. Every food has integer values **0–5** on any subset of these.

| Axis | Emoji | Notes |
|---|---|---|
| wet | 💦 | |
| dry | 🍂 | |
| stink | 🤢 | the headline gross axis |
| loud | 🔊 | |
| musical | 🎺 | the show-stealer — high musical = plays actual notes |
| heat | 🌶️ | "spicy" |
| **length** | ⏱️ | **derived** from total belly used (not a food stat): `length = min(1, bellyUsed / BELLY_MAX)` |

`AXIS_CAP = 8` — the value a summed axis is normalized against. `BELLY_MAX = 10`.

> **Real-game note (see doc 06):** the prototype used 6 axes + a derived `length`. The **real repo**
> uses **7 real food axes**: `wet, dry, stink, loud, musical, length, temp` (each 0–5). The prototype's
> "heat" is the real **`temp`**, and **`length` is a real food property**, not derived from belly.
> Map this section onto the real `FoodProperties` when implementing.

---

## 3. Scoring & matching — THE algorithm

This is the most important section. It comes straight from `computeLaunch()` in `ff-app.jsx`. Implement it exactly; it's what makes the game skillful instead of arithmetic.

### 3.1 Inputs
- `plate`: array of food ids (duplicates allowed — plating 2× Broccoli is valid)
- `recipe`: the detected recipe (or null) — see §5
- `treatment`: the equipped Kitchen treatment (or null) — see §4 of `03-data-schemas.md`
- `crowd`: the current audience, with `wants: [{ ax, target (0–1), w (weight), hate?: bool }]`
- `quality`: the charge multiplier — see §3.5

### 3.2 Build raw axis totals
```
raw = { wet:0, dry:0, stink:0, loud:0, musical:0, heat:0 }
belly = 0
for each foodId in plate:
    f = food(foodId)
    for (axis, value) in f.ax: raw[axis] += value
    if f has a mastery AXIS perk AND f is mastered: raw[perk.axis] += 1   // see Discovery §6
    belly += f.belly

// recipe multiplier effect (e.g. "+70% musical") applies to the RAW total:
if recipe and recipe.effect.type == 'mult':
    raw[recipe.effect.ax] *= recipe.effect.x

// kitchen treatment deltas (can be negative), clamped at 0:
if treatment:
    for (axis, delta) in treatment.d: raw[axis] = max(0, raw[axis] + delta)
```

### 3.3 Normalize to 0–1
```
for each axis: ax[axis] = min(1, raw[axis] / AXIS_CAP)     // AXIS_CAP = 8
ax.length = min(1, belly / BELLY_MAX)                       // BELLY_MAX = 10
```

### 3.4 Match score (the skill curve)
For each `want` the crowd judges:
```
v        = ax[want.ax]
dist     = abs(want.target - v)
closeness = max(0, 1 - pow(dist, 0.85) * 1.5)     // steep: being off-target hurts fast
```
Track the weighted average AND the **single worst** closeness, and the worst "hate" violation:
```
weightedAvg = Σ(want.w * closeness) / Σ(want.w)
minCloseness = min over wants of closeness
hatePenalty  = max over wants where want.hate is true of v   // how badly you broke a "no ___" rule

// WEAKEST-LINK BLEND — you cannot coast by nailing one axis and ignoring another:
base = 0.55 * weightedAvg + 0.45 * minCloseness

// HATE VIOLATION — being the thing they hate tanks the score, up to −65%:
base *= (1 - 0.65 * hatePenalty)
```

> A "hates" entry is modeled as a `want` with `target: 0` and `hate: true`. It both pulls the average down (you're far from 0) *and* applies the multiplicative penalty.

### 3.5 Recipe bonus, then charge
```
bonus = 0
if recipe.effect.type == 'bonus':  bonus += recipe.effect.amt       // additive, e.g. +0.12
final = min(1, base + bonus)

final *= quality            // charge multiplier
final = min(1, final)
```

**Charge `quality`** (from `BlastButton` in `ff-components.jsx`): the meter sweeps 0→100→0 at ~2.2 units/frame while held; sweet zone is **74–92%**.
| Release condition | quality | label |
|---|---|---|
| Quick tap (held < 200 ms) | 1.00 | "tap" (safe, no bonus/penalty) |
| In sweet zone 74–92% | **1.25** | "perfect" (plays a ding) |
| Near zone (62–98%) | 1.10 | "good" |
| Very low (< 28%) | 0.85 | "weak" |
| Otherwise | 1.00 | "ok" |

### 3.6 Grade, stars, pass
```
pct   = round(final * 100)
grade = pct≥90 'S' · ≥80 'A' · ≥68 'B' · ≥50 'C' · else 'F'
stars = pct≥80 → 3 · ≥68 → 2 · ≥50 → 1 · else 0
passed = pct ≥ 50
```

### 3.7 The score breakdown (shown on the reaction)
Build an ordered list the UI renders line by line:
1. `🎯 Base match — {round(base*100)}%`
2. if recipe (bonus type): `⚡ Recipe · {name} — +{amt}%`; if mult type: `⚡ Recipe · {name} — {blurb}`
3. if treatment: `{e} {name} — {first clause of blurb}`
4. charge: `💥 Perfect charge — ×{quality}` (or `💨 Weak charge — ×{quality}`)
5. if any food learned a property: `✨ Discovery bonus — +{notes} 📝`
6. **Final** — `{grade} · {pct}%  +{gold}💰`

---

## 4. The pass gate, retry & feedback (playtest-critical)

The early build let players pass with random foods, gave no feedback, and advanced even on a flop. **Fixed — implement all three:**

### 4.1 Pass to advance
- `passed = pct ≥ 50`.
- **A flop (not passed) CANNOT advance.** The reaction footer shows a single button: **"↻ Try this crowd again"**, which resets the plate and returns to the *same* crowd.
- **A pass** shows two buttons: **"↻ Improve"** (replay to beat your score) and **"Next show ▶"** (advance via the venue ladder). A boss pass shows **"Finish Hometown 🏆"**.

### 4.2 The judge card (per-axis feedback)
Every reaction renders a card titled *"How you matched {Crowd}'s taste"*. For each judged axis:
- the axis emoji + label, and what they wanted: `wanted NONE` (hate) / `wanted LOTS` (target ≥ 0.5) / `wanted a little`
- a horizontal bar showing **your level** (`ax[axis]`) with a dashed **target marker** at `want.target`
- a status badge: **✓ hit** (closeness ≥ 0.8, green) · **~ close** (≥ 0.55, amber) · **✗ miss** (red)
- footer hint: pass → *"Tune the ✗ and ~ axes to climb to ★★★."*; fail → *"Fix the ✗ axes and try this crowd again."*

This is the teaching surface: a stuck player sees their bar far below the target marker on a ✗ axis and intuits "add more of that." Because more of a wanted axis always raises the score, **there are no dead-ends** — you're always one "add another" from passing.

### 4.3 Anti-grind rewards
- Gold on a pass = `round(crowd.gold * final)`, but you're **only paid the improvement** over your best on that crowd: `payout = max(0, fullGold - earnedGold[crowd.id])`, then store the new best. So re-clearing a crowd to "Improve" pays the *difference*, never the full amount again.
- Research notes: `(passed ? 1 : 2) + (newRecipe ? 2 : 0) + (anyLearned ? 1 : 0)`. (Flops pay *more* base notes — failure still advances knowledge.)
- Stars are stored as a per-crowd max: `stars[crowd.id] = max(prev, thisStars)`.

---

## 5. Recipes — emergent, not additive

A named recipe must be **more than the sum of its foods**, or there's no reason to care it's named.

### 5.1 Detection (live, on every plate change)
From `findRecipe()`: a recipe matches when **all** its `set` ids are on the plate AND the plate uses **only** foods that belong to the recipe (no extra foods). If several match, the **highest-rarity** one wins. The detected recipe's ribbon slides into the plate area **before** you blast, so the synergy is felt.

### 5.2 Effect types
| type | shape | example |
|---|---|---|
| `mult` | `{ ax, x }` — multiply a raw axis | Lullaby Toot: `{ax:'musical', x:1.7}` (+70% tooty) |
| `bonus` | `{ amt }` — additive % to the match | Spicy Kraut: `{amt:0.12}` (+12% match) |
| `transform` | `{ from, to }` — convert one axis into a crowd-pleasing pseudo-axis *(full-game; specced, not in slice)* | Royal Rumbler: Stink → "Class" |
| `crowdBonus` | `{ audienceTag, tiers }` — +N reaction tier with a crowd type *(full-game)* | nobility loves the Rumbler |
| `loot` | `{ drop }` — guaranteed reward *(full-game)* | |

### 5.3 Recipe mastery
Each recipe has a level (re-cook to raise it); higher level strengthens its effect. Surface it as a star track on the recipe card in the Lab Book. (In the slice it's display-only; wire the level into the effect magnitude in the full game.)

### 5.4 Signature sound
Every hero recipe has its own short pre-baked jingle (see `02-audio-system.md`). Discovering/firing a recipe plays it — the audio-visual payoff that ties recipes back into the audio system.

---

## 6. Discovery — learn by doing, auto-filled

Foods **hide their stats** until you discover them by launching. This converts "matching" from solved arithmetic into experimentation.

### 6.1 Reveal-on-use (fully automatic — no menus, no buttons)
On every launch, for each **unique** food on the plate (from `launch()`):
```
mastery[id] += 1
reveal the single highest-value not-yet-revealed axis of that food
  → push it to reveals[id]
if a new axis was revealed: emit a "You figured something out" toast
   "{Food} is {adj} {AXIS emoji}"   where adj by value:  ≥5 SUPER · ≥4 really · ≥3 pretty · ≥2 a little · else barely
```
So a food's profile fills in one icon at a time across repeated uses, strongest property first.

### 6.2 Show it where decisions happen
Learned properties appear **inline on the pantry tile** (axis emoji + value), with `·` dots for still-hidden axes and a ✨ sparkle on never-used foods. Players should **not** need to open the Lab Book mid-decision. The Lab Book (Field Guide) is the full reference with discovery %, star ratings, and perks.

### 6.3 Mastery & perks
A food is **mastered** when *all* its axes are revealed AND `mastery ≥ 5`. Mastery unlocks a perk:
- `belly` perk → `−1 belly cost` for that food (`bellyCost()` applies it)
- `ax` perk → `+1` to that axis whenever the food is plated (applied in §3.2)

### 6.4 Progressive axes (gentleness)
Early crowds judge only **1–2 axes** (Hometown's Granny: musical + "not loud"). New regions introduce wet, dry, heat, etc. one at a time, so a beginner never faces 6 unknowns. Cravings are **qualitative** ("nothing too loud", "make it rotten"), not target integers — the player reads vibes, the engine reads numbers.

### 6.5 Novelty bonus
A never-before-launched food combination pays bonus research notes even on a flop — curiosity is always rewarded.

---

## 7. Progression — the visible climb

### 7.1 Three nested loops
- **Show** (seconds): one crowd, earn 1–3★.
- **Venue** (a sitting): ~6 shows of rising difficulty → a **boss headliner**. Stars gate the harder nodes; the boss clear unlocks the next location.
- **Tour** (the game): new locations bring new tastes, foods, and axes.

### 7.2 Crowd rarity & difficulty
Each crowd has `rarity: common | rare | boss`, a `diff` (1–4, shown as pips), and a reward. A show can roll a **rare VIP** — glowing gold ring, pickier demand, guaranteed drop. Bosses are the headliner of a venue with a cryptic multi-want demand.

### 7.3 The venue ladder (the connective screen)
After each reaction you land on the **venue ladder**: a winding node path showing cleared shows (green + stars), the current pulsing node, locked future nodes (some flagged "NEW FOOD"), a rare VIP node, and the boss at the top. This is what turns "next audience" into *felt* progress. Spec in `04-screens-and-ui.md`.

### 7.4 "A new thing every show"
Each node may introduce exactly one new element — a food (granted on the crowd's intro card), a newly-judged axis, a treatment, or a recipe hint. The slice grants Broccoli (Granny) and Pepper (Frat Pack) this way.

---

## 8. State to persist

Persist to local storage (the slice uses key `ff_slice_v2`). Minimum shape:
```ts
{
  started: boolean,
  index: number,                          // current crowd index in the venue
  reveals: Record<foodId, axisKey[]>,     // discovered axes per food
  mastery: Record<foodId, number>,        // use count per food
  discovered: recipeId[],                 // recipes found
  gold: number,
  notes: number,                          // research notes
  stars: Record<crowdId, number>,         // best stars per crowd
  earnedGold: Record<crowdId, number>,    // best gold paid per crowd (anti-grind)
  owned: foodId[],                        // pantry contents (starts with the 5 commons)
  treatment: treatmentId | null,          // equipped Kitchen treatment
  introShown: Record<crowdId, boolean>,   // crowd intro cards already seen
}
```
See `03-data-schemas.md` for the full typed version.
