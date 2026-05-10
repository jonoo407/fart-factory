# Fart Factory — Palette & Type System

> Operationalizes Visual Critic v3 principles V16 (limited intentional
> palette ≤6 hue families with assigned roles), V17 (color-theory scheme +
> saturation hierarchy), and V23 (typography as voice, ≤2 typefaces with
> deterministic fallback). Authority document for any future visual change.

---

## 1. Six-hue palette

The Fart Factory commits to one visual reference: **neon-cartoon laboratory**
— a kid's mad-scientist lab where the equipment glows. Six hue families,
each with one assigned role. Hues outside this palette are forbidden in
new work.

| Role | Family | Hex | Where it appears | Why this hue |
|---|---|---|---|---|
| **bg-deep** | navy gradient | `#1a0a2e` → `#0f3460` | body background | the dim lab room — desaturated so accent hues read |
| **lab-accent** | neon green | `#00ff00` / `#00ff88` | lab panel border, slider track high end, onboarding card border, mute idle | "the equipment is on" — only one cool bright per scene |
| **action** | red-orange | `#ff0000` → `#ff6600` | Launch button, slider track danger end | the one CTA the eye is drawn to |
| **reward** | gold | `#ffaa00` → `#ffcc00` | Hall of Shame, achievement toasts, challenge card border | "you did it" warmth (kept distinct from action red) |
| **report** | magenta | `#ff00ff` / `#ff88ff` | results panel border, grade-letter accents | reserved for the post-launch report card; signals "here's your verdict" |
| **commentary** | warm yellow | `#ffff88` / `#ffd97a` | commentary text, challenge name, hint emojis | the narrator's voice — quiet but legible |

Two retired colors:
- `#9b59b6` / `#8e44ad` (Random button purple) — folded into the **action** family. Random is not a primary CTA; future iteration may swap this to a desaturated lab-accent variant for true CTA hierarchy.
- `cursive` font fallback — replaced with deterministic stack (§3).

### Saturation hierarchy (V17 / Itten)

At any given viewport, **at most 3 elements** may be at S=100%:
- Launch button gradient (action).
- Lab panel border (lab-accent).
- Achievement toast (reward), only when active.

Slider track gradient is decorative and treated as a single element.
Other elements (hall border, results border, challenge border) use S=70-85%.
This gives a clear focal hierarchy: Launch > lab > current event.

### Color-only-information (V12)

Every state distinction also carries a non-color signal:
- Grade letters (`F-`, `D`, `C`, `C+`, `B`, `B+`, `A`, `A+`, `S+`) carry the score independently of `gradeEl.style.color`.
- Stink emoji alongside numeric value covers stinkiness.
- Match score has both a number and a tier emoji (`🎯💥` / `🔥` / `👍` / `🤏` / `😬` / `💀`).
- Challenge hints use directional emoji (`🎯` / `⬆️` / `⬇️` / doubled for far) plus `data-dir` / `data-intensity` attributes.

Deuteranopia simulation should still distinguish all of these.

---

## 2. Shape language (V18)

Dominant: **rounded rectangles, ~12-20px border-radius**.
- All cards (lab, results, hall, challenge, onboarding card): `border-radius: 15px` or `20px`.
- All buttons: `border-radius: 12px`.

Minor exceptions (each justified):
- Slider thumb: `border-radius: 50%` (circular handle is the conventional affordance).
- Stink-meter end-cap: `border-radius: 0 8px 8px 0` (continuous with the meter bar).
- Gas-cloud particles: organic radial gradients (deliberate texture, not UI chrome).

Future visual changes must not introduce sharp-cornered cards or pill shapes that break the rounded-rectangle vocabulary.

---

## 3. Typography stack (V23)

Two registers, both handwritten:

```css
font-family: 'Comic Sans MS', 'Marker Felt', system-ui, sans-serif;
```

Roles:
- **`Comic Sans MS`** — primary. Designed by Vincent Connare (Microsoft, 1994) for casual / child-coded contexts. Wide install base on Windows, Android, ChromeOS.
- **`Marker Felt`** — Apple fallback. Bundled on macOS and iOS since 2008. Same handwritten register, slightly thicker stroke; preserves the tonal commitment on Apple devices instead of falling through to non-handwritten.
- **`system-ui`** — last-resort deterministic. Resolves to Segoe UI on Windows, San Francisco on Apple, Roboto on Android. Lower priority than the two handwritten faces; only kicks in if neither is installed (rare).
- **`sans-serif`** — final generic fallback for completeness.

The previous `cursive` fallback (replaced) was non-deterministic — on iOS without Comic Sans installed, browsers were free to resolve it to Apple Chancery, Snell Roundhand, or other faces in different metrics. `system-ui` is deterministic per OS.

### Body & display sizes

Body text inherits browser default 16px. Component sizing is em-relative:
- Display (H1): `2.2em` ≈ 35px with `text-shadow` glow.
- Section headings (H2): `1.3-1.5em`.
- Body / labels: `1em` to `1.05em`.
- Hint / meta: `0.9em` (≥14px floor for primary; per V13 tier).
- Footer: `0.85em` (~13.6px) — meta tier, ≥12px floor; flagged for parity raise to `0.9em` in iter 18.

Line-height ≥ 1.4 throughout (V13 / WCAG SC 1.4.12).

---

## 4. Animation palette (V20, V24)

Three named easing curves (V24 ≤4 distinct):
- **`cubic-bezier(0.18, 0.89, 0.32, 1.28)`** ("Penner easeOutBack") — Launch button wind-up/pop/settle. Has overshoot, communicates impact.
- **`ease-in-out`** — combo banner pulse, onboarding fade. Soft, ambient.
- **`ease-out`** — gas cloud float, sparkle burst, achievement toast in/out. Decay feel.

Forbidden: `linear` (mechanical), unbounded `infinite` animations on non-banner elements.

### Wind-up / Pop / Settle (V20)

The Launch button's animation timeline (`launchWindupPopSettle`, 600ms total) is the project's reference for impactful motion. Future high-impact CTAs (boss-fight victory, S+ celebration) should follow the same beats:
- 0-15%: anticipation / squash (transform opposite the final direction).
- 15-50%: pop / stretch + flash (the action itself).
- 50-100%: settle / overshoot bounce.

---

## 5. Shipped vs. excluded

**Shipped under this palette:** lab panel, sliders, Launch + Random + Mute buttons, results card, hall card, challenge card, axis hints, achievement toast, onboarding modal, combo banner.

**Not yet shipped (palette-flagged for future iters):**
- Boss-fight Stink-O-Meter (Tier 4.18) — should use `action` red with `report` magenta accents.
- Mascot reaction by grade tier (Tier 3.12) — should use `commentary` yellow for friendly, `action` red for "evacuate" tier.
- Daily challenge calendar / streak history — use `reward` gold + `lab-accent` green hierarchy.
