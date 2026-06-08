# PLAN v9 — UI Overhaul (Order Ticket fidelity + flow)

> Source: a 9-agent screen-by-screen review of the live build vs the prototype
> (`ff-proto.css` / `ff-components.jsx` / `ff-app.jsx` + `04-screens-and-ui.md`).
> Full review archived in the session task output `wqe0pmqvy`.

## Diagnosis — why it looks/feels off

**The override-layer strategy is the root cause.** The redesign kept the legacy
dark/neon DOM and bolted a "PLAN v9 P4 Order Ticket override layer"
(`style.css ~3222–3389`) on top to re-tint a handful of classes paper/ink. This
patches *colours* on the *old* structure rather than rebuilding to the
prototype, so every screen is missing its structural pieces and the legacy theme
bleeds through wherever an override selector is wrong or absent:

- **Wrong selector:** `style.css:3236,3380` target `.kitchen-overlay-card`; the
  real DOM class is `.kitchen-card` → the whole Kitchen is still orange-on-black.
- **No override at all:** `.onboarding-card` (purple + neon-green glow) and
  `.audio-popover` (purple + yellow) keep their dark theme.
- **Class divergence blocks the prototype CSS:** build uses
  `.dock-item/.audience-portrait/.craving-chip/.food-card/.plate-slot/.shop-offer`
  where the prototype uses `.di/.avatar/.chip/.pcell/.slot/.shop-card` — so
  *none* of `ff-proto.css`'s rules apply as-is. Grep confirms zero matches for
  `.ticket/.venue/.vnode/.shop-grid/.kit-treat/.platebox/.ov-balance`.
- **State by fill vs tint:** dock paints whole stickers green/orange; the grade
  stamp is a colored pill — the prototype only *recolours the glyph/label*. This
  "fill vs tint" inversion makes the build read loud and unrefined.

**Fix:** stop tinting. Port the prototype's structural classes and emit matching
markup screen-by-screen, then delete the legacy blocks.

## Three nav surfaces → two

The "unnatural flow" is literal: navigation is split across **(a)** the grey
`.progression-strip` (still holds Travel + Kitchen + research-notes), **(b)** the
dock, and **(c)** a separate `.area-display` "change" row. Travel duplicates the
dock's Venue; Kitchen duplicates the dock's Kitchen. The prototype has exactly
two surfaces: a **pure-status top bar** (`[mute] · [REGION / Show N of M] · [gold]`)
and the **5-tab dock** (Stage · Shop · Kitchen · Book · Venue).

## The play loop never closes

Prototype loop: play → reaction footer "Next show ▶" → ladder → "Play {next} ▶"
→ play. The build's ladder is a read-only flat list with **no "Play next" CTA**,
and advancement is instead bolted onto a **"Move On" button inside the belly
meter** — conflating *capacity* with *progression*. And there are **two "where am
I" models**: the dock's Venue (a climb) vs the strip's Travel (a 20-pin world map
that overlaps into a garbled mess, dark-themed, no prototype equivalent).

---

## Phases (prioritized P0 → P2)

Each phase: red/green TDD (data-shape/logic tests first), then a Preview-MCP
visual verification at 375×812 before "done".

### Phase 1 — P0 · Consolidate navigation (kills the "ugly grey area" + dupes)
- Replace `.progression-strip` with the prototype `.top`: `[mute chip-btn] ·
  [.day REGION / Show N of M] · [gold chip-btn]`. Add the absent `.top/.chip-btn/.day`
  CSS (exact `ff-proto.css:43–49` values).
- New `renderTopBar()`: region from `containment` (`REGIONS…name`), show index
  from the venue-window (`venue-ladder.ts:86` `VENUE_SIZE=6`).
- **Delete** the strip's Travel button, the research-notes button, and the
  duplicate Kitchen `#kitchenBtn`. Research notes move into the Lab Book.
- Dock = single nav: wire the dock Kitchen tab to **open** the overlay (today it
  only flips a localStorage pref); convert Stage `<span>` → `<button>`.
- Purge the `#ffe79a`/`#aaffe2` neon-on-dark strip text.

### Phase 2 — P0 · Close the play loop (the "where am I / how do I move on" fix)
- Rebuild `venue-ladder.ts` to the prototype **node-path**: a `.venue` canvas
  (radial paper2 bg, inset white border) + inline `<svg>` dashed winding polyline
  + absolutely-positioned **round 50px avatar nodes** at hand-placed zig-zag
  positions, with `done`(green) / `cur`(orange vpulse halo) / `lock`(grey) /
  `boss`(62px portrait) states; stars above, label below.
- Append the **"Play {next} ▶" CTA** so the ladder starts the next show.
- Footer becomes a white card: avatar + name + "Wants X & Y · ⭐⭐⭐ up for grabs".
- **Remove the world map as a nav peer**; region advance becomes a consequence of
  clearing the venue boss (surfaced just-in-time + on the location chip).
- Demote the belly-meter "Move On" (advancement routes through reaction → ladder).

### Phase 3 — P0 · Fix the broken/ugly play controls you see
- **Charge meter** (the "weird dotted box"): add `.charge-meter{opacity:.55}` /
  `.active{opacity:1}` and toggle `.active` in `charge-meter.ts` begin/end so the
  meter *dims at rest and wakes on hold*; fill → 90° green→gold→orange sweep;
  restyle the sweet-zone box (`top/bottom:-3px`, white wash, drop element opacity).
- **BLAST button:** restructure to two lines — `.big "💨 BLAST!"` / "CHARGING…"
  + `.sub "hold to charge"` / "plate a food first". Retire "🚀 LAUNCH FART".
- **Dock:** green/orange **tint** the label+emoji (not fill), grayscale locked
  emoji, 20px emoji that pops on press, borderless on the ink bar.

### Phase 4 — P1 · Rebuild crowd ticket + plate + pantry (the anchor screen)
- **Ticket:** perforated side-notches, round 46px avatar (gold `.rare` ring for
  VIP/boss), difficulty pips, dashed speech `.bubble`, red `🚫` no-chips (no strike).
- **Plate:** wrap in `.platebox` "Your brew · N/4 · tap to remove"; 54px
  emoji-only slots with a red `.rm` remove badge.
- **Pantry:** rarity DOT, on-plate count badge, corner `✨` newdot, fixed 5-col
  grid; drop the per-tile belly-cost clutter.

### Phase 5 — P1 · Overhaul the reaction takeover (the payoff)
- Rewrite `.stamp` → 120px **white inked circle** with a tier-coloured glyph and
  an intrinsic slam spring (overshoot, settle tilted −7°).
- Add the celebratory **radial spotlight** bg + `.flop` warm-red F variant +
  `rxn-in` entrance; thread `result.stink` and render the drifting green
  **stink-cloud** (≥0.45) and falling **confetti** (non-F). Gate motion on
  `prefers-reduced-motion`.
- Polish: bouncier faces, sequential star slam, two-line toasts, judge-bar
  goalpost marker, green-total breakdown card.

### Phase 6 — P1 · Re-skin/rebuild the overlay screens (.overlay/.ov-top/.ov-body)
- **Shop:** 2-up `.shop-card` grid — rarity dot, ★ Rare tag, big emoji, property
  preview, `BUY {cost}💰` / `Need {cost}💰` / `✓ Owned` (owned shown dimmed).
- **Kitchen:** replace the prep-table + ferment-rack + `<select>` workbench with a
  single-equip `.kit-list` of `.kit-treat` rows (+ a None row) wired through
  `setEquippedTreatment` so the dock `.hot` lights. Fix the dead selector.
- **Lab Book:** collapse the 8-section scroll to **2 tabs** (🥦 Foods / ⚡ Recipes);
  relocate Bosses/Codex/Conquests/Trophies/Save to a separate Stats/More surface.

### Phase 7 — P1 · Onboarding · Intermission · Sound
- **Onboarding:** paper/ink card (reuse `.introcard`), 96px hard-shadowed
  `.bigemoji` circle, progress **dots** instead of "Step N of 3".
- **Intermission:** big paper sticker choice cards + **select-then-confirm**
  (highlight + green confirm CTA) so a mistap is recoverable.
- **Sound:** promote the corner popover to a full "🔊 Sound" overlay with chunky
  ink slider tracks + round knobs and real pill toggle switches (Captions/Rumble).

### Phase 8 — P2 · Global pass
- Phone-frame decision (status bar app-wide, or drop cleanly — see open question).
- Palette sweep: purge every `#ffe79a/#aaffe2/#00ff88/#fde047/#5eead4` leftover and
  every `0 0 Npx` glow shadow → hard `Nx Ny 0 var(--ink)` shadows.
- Boss arena: reconcile the elaborate multi-councilor arena with spec §8, reskin
  fully off the gold-on-dark base.
- Juice pass: sticker press physics everywhere, dock wobble + notification dots,
  charge-hint copy swaps, motion-token consistency, audio/haptic tie-in.

---

## Resolved product decisions (user, 2026-06-08)
1. **World map / Travel → REMOVE.** Delete `#mapScreen` + `#travelBtn` as a nav
   peer; region-advance becomes a consequence of clearing the venue boss,
   surfaced just-in-time + on the location chip. `map-screen.ts` and the
   `.map-*`/dark-theme CSS get removed.
2. **Phone-frame / faux status bar → DROP.** No fake status bar/notch/bezel. The
   reaction overlay's spec'd "one status bar" is N/A — this is a real mobile web
   app. (Resolves the reaction-review's escalation.)
3. **Accreted subsystems → KEEP, move behind a "More" surface.** Preserve Codex,
   Conquests, Hall of Trophies, research economy, ferment rack, multi-councilor
   boss; relocate them to a secondary Stats/More screen so the core spine
   (ticket → plate → blast → reaction → ladder) stays clean. Lab Book collapses
   to its 2 spec tabs; the rest moves to "More".
