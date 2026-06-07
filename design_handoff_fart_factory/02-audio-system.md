# 02 — Audio System

> **Core principle: the fart is the *readout*, not a sound effect.** A recipe's sound encodes its
> recipe, so the player can *hear* what they made — and over time learns to predict it. Audio is the
> game's secret teacher (it's how Discovery in `01-game-systems.md §6` works).

> **CRITICAL — shipped audio is a finite, pre-baked bank.** The prototype *synthesizes* farts with
> WebAudio (see `design_reference/prototype/ff-audio.js`) purely to prove the feel. **The real game
> uses ~200 pre-generated clips (ElevenLabs), selected & layered at runtime. There is NO live
> generation and NO API call in the app.** The repo already has a `sample-player` and procedural
> audio to build on.

---

## 1. The five layers

A bus per layer, each with its own volume channel. The fart is loudest; everything ducks under it.

| Layer | Role | Mix |
|---|---|---|
| 💨 **The Fart** | The star. Assembled at runtime by layering a few pre-baked stems chosen by the recipe's axes. | loudest, always on |
| 👥 **The Crowd** | Ambient murmur before; a reaction stinger keyed to the grade tier after (gasp / golf-clap / belly-laugh / retch / ovation / chairs-scraping-evacuate). | ducks under the fart |
| 🗣️ **Voices** | Each crowd's character VO — one craving line before, one reaction line after. A host mascot guides first-timers. | on key moments |
| 🫧 **Foley & UI** | Plate *plop*, button *thunk*, charge whoosh, sweet-spot *ding*, coin cha-ching, unlock fanfare, recipe-activate chord. | constant, quiet |
| 🎵 **Music** | One light, loopable bed per screen. | bed, ~−18 dB |

---

## 2. The fart is an instrument — axis → sound mapping

This mapping is the heart of the system. Each axis bends the assembled fart a specific, *legible* way. (The prototype implements all of these synthetically in `ff-audio.js fart()`; the shipped game reproduces the same perceptual mapping by **selecting/layering pre-baked stems** instead.)

| Axis | What it does to the sound | Texture |
|---|---|---|
| 💦 wet | bubbly, squelchy, flubbering low gurgle; more wet = more liquid burble | `~ blub ~` |
| 🍂 dry | papery rasp, crisp tearing rip — the classic "brrrap" | `brrrap` |
| 🤢 stink | inaudible, so: a sour detuned overtone + a longer lingering "haze" reverb tail + crowd sniff foley | `·∼haze∼·` |
| 🔊 loud | master gain + sub-bass thump + room reverb; crowd flinches audibly | `BOOM` |
| 🎺 musical | toots become **pitched notes**; high musical = an actual little melody/arpeggio (the signature hook) | `♪♫♪` |
| ⏱️ length | duration of the whole event — quick "pft" vs sustained 4-second "braaaaaap" | `pft → braaap` |
| 🌶️ heat | a sizzle/crackle layer + a rising pitch-bend, like a kettle coming to the boil | `tssss↗` |

**Implementation note for the bank approach:** quantize each axis into a few buckets (e.g. low/med/high), pick a **base rip** stem from `(wet|dry) × length-bucket`, then **layer** optional stems — a musical melody (pitched to the musical level), a heat sizzle, a stink haze tail — and set master gain from loud. A handful of stems thus covers thousands of *perceived* farts.

---

## 3. The bank budget (~200 clips — fits "a couple hundred")

| Category | Contents | Clips |
|---|---|---|
| 💨 Fart stems | base rips (wet/dry × short/med/long × a few takes) + sub-bass thumps | ~24 |
| 🎺 Musical toots | a playable octave × 2 timbres — melodic recipes play real notes | ~16 |
| ∼ Tails & accents | stink hazes, heat sizzles, fizz layers | ~10 |
| 👥 Crowd | region murmur beds + reaction stingers across 6 grade tiers (S/A/B/C/F + boss) | ~24 |
| ⚡ Signature recipes | one short jingle per hero recipe (grows with the recipe list) | ~40 |
| 🗣️ Character VO | host + ~12 crowds × ~4 lines (1 craving + 3 reactions: love / meh / evacuate) | ~60 |
| 🫧 Foley & UI | plops, thunks, charge whoosh, sweet-spot ding, coins, unlock fanfare, recipe chord | ~22 |
| **Total** | | **~196** |

---

## 4. Runtime clip-selector (what to build)

```
playFart(ax):                      // ax = normalized 0–1 axis object from scoring §3.3
  stems = []
  stems.push( pickBaseRip(ax.wet, ax.dry, lengthBucket(ax.length)) )
  if ax.musical > 0.45: stems.push( pickMelody(ax.musical) )    // higher = more notes / higher pitch
  if ax.heat   > 0.30: stems.push( pickSizzle(ax.heat) )
  if ax.stink  > 0.30: stems.push( pickHazeTail(ax.stink) )
  gain = 0.18 + ax.loud * 0.7
  play(stems, { gain, busy: 'fart' })

onReaction(tier):  play( pickCrowdStinger(tier), { bus:'crowd' } )
onRecipeFire(recipeId): play( signatureJingle(recipeId), { bus:'fart' } )
```
UI/foley hooks map 1:1 to the prototype's `FF_AUDIO.ui.*` (`plop`, `pick`, `thunk`, `ding`, `coins`, `unlock`, `page`) and the charge whoosh (`chargeStart/Update/Stop`). Reuse the repo's existing `sample-player` for playback and `procedural` only as a fallback.

---

## 5. Per-screen cue sheet

| Screen | Ambient bed | Key SFX | Voice / sting |
|---|---|---|---|
| Play | lab hum + faint crowd murmur | food **plop**, belly tick | crowd's craving line on entry |
| Charge & Blast | murmur drops to silence… | rising pressure whoosh, sweet-spot **ding**, the FART | recipe-activated **chord** |
| Reaction | crowd erupts (grade-keyed) | grade stamp **thunk**, coin cha-ching | character reaction line |
| Shop | cosy market loop | paper shuffle, cash register | "Sold!" |
| Kitchen | bubbling ferment jars | knob clicks, treatment **fwoosh** | jar "ready" chime |
| Venue/Map | jaunty travel tune | pin **pop**, locked "nuh-uh" | region fanfare on arrival |
| Boss | tense drums + heartbeat | drumroll, impact hit | boss taunt VO |
| Lab Book | twinkly, curious | page flip, discovery sparkle | host: "Nice find!" |

---

## 6. Cast & voice direction

Keep every line **< 2 seconds, parent-safe, captioned**. One host ties the game together; each crowd has a personality.

| Voice | Type | Sample line (direction, not final) |
|---|---|---|
| 🧑‍🔬 Prof. Phinneas Pump | host / narrator | wry mad-scientist, warm |
| 👵 Granny Edna | sweet crowd | gentle, a little deaf |
| 😎 The Frat Pack | rowdy crowd | hyped, dude-bro |
| 🧐 The Mayor | pompous boss | grandiose, easily offended |
| 🛟 The Lifeguard | chill boss | laid-back surfer |
| 🤖 The Critic-Bot | deadpan rare VIP | flat, robotic, secretly thrilled |

Write 1 craving line + 3 reaction lines (love / meh / evacuate) per crowd. (Seed lines are in `03-data-schemas.md`.)

---

## 7. Accessibility & control (non-negotiable — kids play in bedrooms/classrooms)

Build a **Sound settings** screen (spec in `04-screens-and-ui.md`) with:
- **Four independent volume channels**: Master · Farts & SFX · Voices · Music.
- **One-tap mute** (also surfaced as the top-left chip on the play screen).
- **Captions ON by default** — every VO line shows a caption bubble (`🔊 {Character} "…"`), so kids read along and silent play still conveys the joke.
- **Haptics / Rumble toggle** — pair haptics to the big moments (charge build, blast, grade slam) so the game *feels* great even muted. The repo already has a haptics module.
- Loud is always a *choice*, never a surprise — ramp into the blast, don't spike.
