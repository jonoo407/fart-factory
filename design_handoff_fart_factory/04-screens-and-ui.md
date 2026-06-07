# 04 — Screens & UI

The **Order Ticket** design system, then a spec for every screen. Fidelity is **high** — match the
tokens, type, shape, copy, and motion. The CSS source of truth is
`design_reference/prototype/ff-proto.css` (+ `ff-d1*.css` for the static-app screens).

---

## 1. The Order Ticket design system

A chunky, high-contrast "sticker" language: paper & ink, fat rounded borders with **hard offset
shadows**, toxic-green CTAs, big tap targets. Reads instantly for a 9-year-old; never childish.

### Tokens
```
--paper  #f4ecd8   --paper2 #eadfc4   --ink #231d16
--green  #8fd11e   --green-d #6fae12   --orange #ff7a2f   --gold #f59e0b
--muted  #8a7d63
rarity:  c #9ca3af · u #22c55e · r #3b82f6 · e #a855f7 · l #f59e0b
page texture: repeating-linear-gradient(0deg, rgba(0,0,0,.014) 0 2px, transparent 2px 4px) over --paper
```
### Type
- **Baloo 2** (700–800) — all display: headings, names, numbers, button labels, grades.
- **Nunito** (700–900) — body copy, descriptions, chips.
- **Space Mono** — small mono labels, kickers, readouts, "9:41" status bar.

### Shape & motion
- Radius 12–18px (tiles 12–13, cards 14–18, pills 999).
- Borders **2.5–3px solid `--ink`**.
- **Hard offset shadow, no blur**: `box-shadow: 4px 4px 0 var(--ink)` (cards), `2px 2px 0` (chips/tiles), `5px 6px 0` (hero buttons).
- **Press feedback**: translate by the shadow offset and collapse the shadow to 0 — e.g. `:active { transform: translate(2px,2px); box-shadow: 0 0 0 ink; }`. Everything tappable does this.
- Tap targets ≥ 44px.
- Entrance animations must keep the **end-state visible** (animate *from* a transform, never leave content at `opacity:0`), so reduced-motion/print/paused states still show content. Gate decorative motion on `prefers-reduced-motion: no-preference`.

### Phone frame
Designs are phone-first, ~380×780 inside a dark bezel with a notch and a faux status bar. The app itself should be responsive within a portrait phone viewport.

---

## 2. Play screen (the anchor)

Top → bottom, in a fixed top bar + scrolling body + fixed blast + fixed dock:

- **Top bar**: mute chip (left) · "HOMETOWN / Show N of M" (center, Baloo + Space-Mono sub) · gold chip "💰 N" (right). All chips are white, ink-bordered, hard-shadowed.
- **Crowd ticket** (white card, perforated circle notches on the sides): round avatar (gold ring if VIP/boss) · name + role · diff pips (top-right) · a dashed-border **speech bubble** with the craving line · **"They're craving"** chips — green `want` chips and red struck-through `🚫 no` chips.
- **Belly meter**: label + rounded track (green fill, turns orange when over) + "used/max".
- **Plate**: paper2 panel, "Your brew · N/4 · tap to remove", a 4-slot grid (filled slots pop in with a spring; empty slots dashed `＋`). When a recipe is detected, a green **recipe ribbon** slides in below the slots: ⚡ + name + blurb.
- **Pantry**: "Pantry — tap to add", a 5-column grid of food tiles. Each tile: rarity dot (top-right), count badge (top-left, if plated), ✨ if never used, emoji, name, and a **learned-axis strip** (axis emoji + value for each discovered axis; `·` dots for hidden ones). Dim/disable tiles that can't be added (plate full or belly exceeded).
- **Blast button** (fixed): a charge meter (sweet-spot zone marked with a dashed box at 74–92%) above a big green **"💨 BLAST!"** button. Press-and-hold charges (meter sweeps, button shakes, rising whoosh); release fires. Disabled (grey) until ≥1 food is plated.
- **Dock** (fixed, ink bar): Stage · Shop · Kitchen · Book · Venue. Active tab is green; locked tabs are greyed until unlocked (progressive disclosure). Equipped-treatment shows the Kitchen tab in orange.

---

## 3. Reaction takeover (the payoff)

Full-screen overlay (opaque celebratory background — must fully cover the play screen; **one** status bar only). Scrolls. Top → bottom:
- **Crowd faces** row, bouncing, keyed to grade (laughing/adoring for high, disgusted for F).
- **Grade stamp** — a round stamp that *slams* down with a spring (S purple, A/A+ orange, B/C green, F red), with a label ("Standing O", "Bombed", …).
- **Verdict** line + a **caption bubble** (`🔊 {Crowd} "…"`) — the captioned VO.
- **Stars** (1–3, gold, slam in sequence) on a pass.
- **Judge card** — *"How you matched {Crowd}'s taste"*: per-axis rows with the wanted label, a bar showing your level + dashed target marker, and a ✓/~/✗ badge. Footer hint (see `01-game-systems.md §4.2`).
- **Score breakdown** card — the ordered lines from `01-game-systems.md §3.7`, ending in the green Final row.
- **Discovery toasts** (💡 "{Food} is {adj} {axis}") and a **recipe toast** (orange) if a new recipe fired.
- **Footer**: fail → one wide **"↻ Try this crowd again"**. Pass → **"↻ Improve"** (ghost) + **"Next show ▶"** (or **"Finish Hometown 🏆"** on a boss). Stink ≥ 0.45 adds a drifting green stink-cloud; non-F adds falling confetti.

---

## 4. Shop

Overlay: header "🛒 Pantry Shop" + ✕. Balance bar "💰 N gold". A 2-up grid of **shop cards**: rarity dot, "★ Rare" tag for rares, big emoji, name, a property preview (axis emojis ≥3), and a buy button — green **"BUY {cost}💰"**, greys to **"Need {cost}💰"** when unaffordable or **"✓ Owned"** when owned. Footer note: commons are free; legendaries come from quests.

## 5. Kitchen

Overlay: header "🍳 Kitchen" + ✕. A hint line, then a vertical list of **treatment rows** (emoji, name, effect blurb, checkbox) plus a **"None"** row. Tapping equips exactly one (green highlight + check); it tweaks every brew and appears as a line in the score breakdown until swapped. Footer teases the fermentation rack for later regions.

## 6. Lab Book (Field Guide + Recipes)

Overlay: header "📖 Lab Book" + ✕. Two tabs: **🥦 Foods** and **⚡ Recipes** (active tab green).
- **Foods**: a discovery progress bar ("{known}/{total} properties"), then a card per food. Owned foods show emoji, name, "Used N×" or "★ Mastered", a star row (filled = revealed axes), and an axis-chip row (revealed = emoji+value, hidden = hatched ❔). Mastered foods show their 🎁 perk. Unowned foods show a 🔒 "find it in the shop or a crowd" card.
- **Recipes**: a "found N/total" bar, then a card per recipe. Discovered = foods emoji, name, rarity, the ⚡ effect blurb, and a "missing an ingredient" note if not cookable. Undiscovered = a "？？ · combine N foods" teaser.

## 7. Venue ladder

Overlay: header "🏟️ {Venue}" + a star total + ✕. A tall canvas with a winding **dashed path** connecting nodes (positions hand-placed). Node states: **done** (green, with earned stars above), **current** (orange, pulsing, "▶"), **locked** (grey, 🔒), **rare/VIP** (gold ring), **boss** (large, orange portrait). A "NEW FOOD" tag flags nodes that introduce content. A footer card previews the next crowd (avatar, name, what they want, stars on offer). Bottom CTA: "Play {next} ▶".

## 8. Boss arena

A darker, orange-hazard reskin of the play loop: dark gradient bg, orange top border, "⚔ THE CHALLENGER / Round 1/3", a big round boss portrait with glow, the cryptic demand in a dashed box, and a multi-round **approval meter**. Big "⚔ FACE OFF" CTA. Same plating/blast mechanics underneath.

## 9. Intermission

Between shows: "Pick one thing 🎪" + a few big choice cards (😴 Nap → refill belly · 🏋️ Practice → next blast +20% loud · 🧺 Forage → 1 random food), one selectable, confirm CTA. A pacing beat that teaches consequence without a menu.

## 10. Onboarding

Centered cards: big emoji in a hard-shadowed circle, a Baloo headline, a short body line, progress dots, and Skip / Next buttons. Three cards (copy in `03-data-schemas.md §6`), then straight into the first show. New systems are introduced **just-in-time** via crowd intro cards, not up front.

## 11. Sound settings

Overlay "🔊 Sound" with four slider rows (Master · Farts & SFX · Voices · Music) — chunky ink-bordered tracks with a round knob — plus **Captions** and **Rumble** toggle switches. Same sticker language. (System detail in `02-audio-system.md §7`.)

---

## 12. Static-app reference

`design_reference/Fart Factory - Order Ticket.html` shows all of the above as static hi-fi mockups
(onboarding, play, reaction, shop, research lab, kitchen, world map, boss arena, lab notebook,
intermission). Use it for pixel reference; use the prototype for behavior.
