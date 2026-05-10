# Visual Critic v3 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> five-line block at `docs/PLAN.md` §F (the "Visual critic" subsection).
> Same v1→v2→v3 redesign approach as `docs/FUN_CRITIC.md` and
> `docs/AUDIO_CRITIC.md`. v3 adds an Art Direction axis covering visuals-
> as-art (Disney 12 Principles / Bacher production design / Itten color
> theory / Vignelli restraint / Bringhurst typography / McCloud visual
> storytelling) — the aesthetic dimension v2 didn't measure.

---

## 1. Why v1 failed

The v1 visual critic in `docs/PLAN.md` §F gave **visual=9** to iterations 5, 7, and 8 — even though `docs/iteration-log.md` row 8 of the Notes section explicitly logged that iter-2's visual critic flagged "legacy CSS issues (font sizes <14px on mobile, user-scalable=no, layout-thrashing keyframes, small touch targets)" as port-time TODOs. The TODOs were partially addressed in the Tier 0.3 port (transform-only animations, focus-visible styles, removal of `user-scalable=no`) and at iter 6 (`.ach-desc` raised from 0.85em to 0.9em to clear the 14px floor), but the rubric never *re-tested* mechanically. v1's failures:

1. **Vibe axes.** "Readability, polish, animation smoothness, kid-vibes" are reader judgments. Two reviewers will score the same screenshot 4 points apart with no shared anchor.
2. **No tools run.** v1 listed "Read, Glob, image-viewing on screenshot files" as tools. axe-core, Lighthouse, Playwright performance traces — none required. The rubric prescribed eyeballing.
3. **Hard blockers narrow.** "Text under 14px on mobile, clipped elements, contrast failing AA, layout-thrashing keyframes" — good list, but no mechanism to run them. The critic *could* spot a 13.6px footer in CSS but wasn't required to.
4. **No Web Vitals.** LCP / CLS / INP are not in v1. Toast injection, font swaps, achievement-popup layout shifts can all degrade CLS and v1 has no way to detect.
5. **No focus-management gate.** Keyboard accessibility isn't scored — only "readability." Iter 6 had a real focus issue (toast `pointer-events:auto` intercepting clicks; flagged by visual critic but as a "real iter 6 blocker," ad-hoc).
6. **No color-only-information check.** WCAG SC 1.4.1. v1 doesn't ask whether grade is distinguishable for the ~8% of boys with deuteranopia.
7. **No reading-level check for kid-appropriateness.** "Kid-vibes" is the closest v1 axis; it tested for nothing concrete.
8. **Forgiving calibration.** A 9 was given for transform-only animations and a focus-visible outline — table stakes for AA conformance, not what 9/10 should mean.

**Observable in `docs/iteration-log.md`:** visual scores 6, 6, 8, 6, 9, 8, 9, 9 across iters 1-8. The 9s are at iters 5, 7, 8 — at no point did the rubric require axe-core or Lighthouse to substantiate them.

### 1.1 What v3 adds to v2

v2 caught technical visuals (contrast, touch targets, viewport zoom, layout-thrash, reduce-motion, focus, body-size, color-only, CLS). User stress-test exposed a further class v2 doesn't reach: **art direction.** A page could pass every v2 gate (axe-clean, Lighthouse-perfect, all touch targets ≥44×44, transform-only animations) and still look like a Bootstrap form with rainbow accents — chaotic palette, inert animations (scale 0.95 + snap-back), three handwritten typefaces stacked, no shape language, no committed visual reference. v3 adds an eighth axis — **Art Direction** — backed by 12 cited principles spanning Disney's 12 Principles of Animation (Thomas & Johnston 1981), production design (Hans Bacher *Dream Worlds*, Mary Blair, Pixar color scripts), color theory (Itten, Albers), shape language, character/appeal (Loomis), UI-animation wind-up/pop/settle (Val Head), staging (Storaro/Deakins), kid-game visual precedents (Sesame, *Crossy Road*, *Untitled Goose Game*, *Cuphead*), typography as voice (Bringhurst/Spiekermann), Penner easing equations (Nabors *Animation at Work*), Vignelli/Rand restraint, and McCloud visual storytelling. The axis maps Annie / BAFTA Best Artistic Achievement criteria into operationalizable lens-questions. v2 axes/gates remain unchanged; v3 is purely additive.

---

## 2. Design principles backing v3

Each axis and gate below traces to one or more cited principles. Principles are V1-V14 (parallel to FUN_CRITIC.md's P1-P19 and AUDIO_CRITIC.md's A1-A15).

| # | Principle | Source |
|---|---|---|
| V1 | **Contrast minimum (text)** — text & images-of-text need ≥4.5:1 (normal) / 3:1 (large, ≥18pt or 14pt bold). | W3C WCAG 2.2 SC 1.4.3 (Recommendation, Oct 2023). |
| V2 | **Non-text contrast** — UI components & graphical objects need ≥3:1 against adjacent colors (slider thumbs, focus rings, button outlines, gas-cloud silhouette). | W3C WCAG 2.2 SC 1.4.11. |
| V3 | **Touch-target size** — interactive elements ≥44×44 CSS px (Apple HIG / WCAG AAA SC 2.5.5; WCAG AA SC 2.5.8 floor is 24×24 but kids' games target 44×44). | W3C WCAG 2.2 SC 2.5.8; Apple HIG; Material Design 48dp. |
| V4 | **Resize-text / no zoom-block** — text resizable to 200% without loss; `user-scalable=no` and `maximum-scale=1` violate AA. | W3C WCAG 2.1 SC 1.4.4 (carried into 2.2); ACT Rule "Meta viewport allows for zoom." |
| V5 | **Focus visible / not obscured** — every keyboard-focusable element has a visible indicator; toasts/banners must not entirely cover focused content. | W3C WCAG 2.2 SC 2.4.7 (AA) + SC 2.4.11 (new in 2.2, AA). |
| V6 | **Animation from interactions / `prefers-reduced-motion`** — interaction-triggered motion must be disable-able; vestibular-disorder safety. | W3C WCAG 2.2 SC 2.3.3 (AAA); CSS Media Queries Level 5 `prefers-reduced-motion`. |
| V7 | **Animation performance: transform/opacity-only** — animating layout properties triggers Layout→Paint→Composite; only `transform`/`opacity` runs on the compositor and reliably hits 60fps (16.67ms frame budget). | Paul Lewis & Jake Archibald, "Rendering Performance" (web.dev); Paul Irish, "What forces layout / reflow" (gist). |
| V8 | **Core Web Vitals** — LCP ≤2.5s, CLS ≤0.1, INP ≤200ms at the 75th percentile. | Google Web Vitals (web.dev). |
| V9 | **CLS sources** — layout shifts caused by missing `width`/`height` on media, font swap (FOUT/FOIT), late-loaded content (toasts, achievements popups) without reserved space. | Google web.dev "Optimize CLS." |
| V10 | **Visual hierarchy / signifiers / data-ink** — every interactive element needs a perceivable cue (button shape, hover, cursor, icon); decorative ink should not dominate functional ink. | Edward Tufte, *Visual Display of Quantitative Information* (Graphics Press 1983/2001); Don Norman, *Design of Everyday Things* (Basic Books 1988/2013) on signifiers & affordances. |
| V11 | **Gestalt grouping** — proximity, similarity, closure, continuity, figure/ground govern perceived structure. | Max Wertheimer, *Psychologische Forschung* 4 (1923); Kurt Koffka, *Principles of Gestalt Psychology* (Harcourt 1935). |
| V12 | **Color-only-information / color-blindness** — information must not be conveyed by color alone; ~8% of males have CVD (mostly deuteranopia). | W3C WCAG 2.2 SC 1.4.1 (Level A); Cynthia Brewer, *ColorBrewer 2.0* (Penn State 2002); NCBI Webvision color-vision deficiencies table. |
| V13 | **Typography for kids: minimum body 16px, line-length 45-75ch, line-height 1.4-1.6** — early-reader legibility benefits from larger body type and rounded sans-serifs with high x-height. | Robert Bringhurst, *The Elements of Typographic Style* 4th ed. (Hartley & Marks 2013); WCAG 2.2 SC 1.4.12 Text Spacing; Material Design 3 type scale (Body Large = 16px). |
| V14 | **Kid-specific UI heuristics** — errorless interaction; sub-100ms tap-to-feedback; one primary action per screen; no IAP/ads on kids' apps; reading level ≤Grade 3 for ages 5-10. | Sesame Workshop UX research practice; BBC Global Experience Language (GEL) Children's Design Principles; Common Sense Media 14-point app review rubric; Sesame Workshop, ACM Computers in Entertainment 2003. |
| V15 | **Disney 12 Principles of Animation (UI subset)** — Squash & Stretch, Anticipation, Staging, Slow-In/Slow-Out, Arcs, Follow-Through & Overlapping, Secondary Action, Timing, Exaggeration, Appeal. UI animations should pass ≥4 of 6 applicable principles. | Frank Thomas & Ollie Johnston, *The Illusion of Life: Disney Animation* (Abbeville 1981, ISBN 0-89659-698-2). |
| V16 | **Limited intentional palette** — production has ≤6 hue families with assigned narrative roles (hero / antagonist / ambient / accent / danger / reward); hues outside the palette are forbidden or reserved for specific story beats. | Hans Bacher, *Dream Worlds: Production Design for Animation* (Focal 2007); Mary Blair concept paintings for Disney's *Cinderella* (1950); Ralph Eggleston, color script for *Finding Nemo* in *The Art of Finding Nemo* (Chronicle 2003). |
| V17 | **Color theory: scheme, saturation hierarchy, value structure** — colors related by named scheme (complementary / analogous / triadic / tetradic); saturation hierarchy with no more than 3 fully-saturated elements simultaneously; readable as 3-tone grayscale (dark / midtone / light). | Johannes Itten, *The Art of Color* (Reinhold 1961); Josef Albers, *Interaction of Color* (Yale UP 1963, ISBN 0-300-01846-0). |
| V18 | **Visual identity / shape language** — production picks a dominant shape vocabulary (rounded / geometric / asymmetric); ≥70% of borders/clip-paths/SVG primitives derive from one family. Blind-screenshot test: cropped frame is identifiable as *this* game vs generic Bootstrap dashboard. | Hans Bacher, *Dream Worlds* (2007); Lou Romano, color script for *The Incredibles* in *The Art of The Incredibles* (Chronicle 2004). |
| V19 | **Character / appeal** — every named element has personality via asymmetry, exaggerated proportions, or distinctive silhouette. Silhouette test: rendered as solid black at 32×32, still recognizable. | Disney 12's "Appeal" (Thomas & Johnston 1981); Andrew Loomis, *Figure Drawing for All It's Worth* (Viking 1943). |
| V20 | **UI animation: wind-up / pop / settle** — meaningful interactive animations have three beats: anticipation (~80-120ms wind-up moving opposite the final direction), the pop (action with stretch on leading edge, ~150-250ms), the settle (overshoot + bounce, ~200-400ms). | Disney 12 (Anticipation, Squash & Stretch, Follow-Through); Val Head, *Designing Interface Animation* (Rosenfeld Media 2016, ISBN 1-933820-31-6) ch. 3. |
| V21 | **Staging / focal hierarchy** — at any moment, exactly one element is the focal point via value contrast, saturation isolation, or scale. Squint test: blur the screen — does ONE element jump out, or do 3+ compete? | Disney 12 (Staging); Vittorio Storaro, *Writing With Light* (Electa 2001-2003); Roger Deakins commentary tracks on directing the eye. |
| V22 | **Single visual reference commitment** — the game can be described in one phrase (e.g., "1930s rubberhose," "low-poly," "kid's notebook doodle") and ≥80% of visual elements pull from that single reference. *Crossy Road* / *Cuphead* / *Untitled Goose Game* each commit to one. | Andy Sum on *Crossy Road* (GDC 2015); Studio MDHR, *The Art of Cuphead* (Dark Horse 2020, ISBN 1-50671-313-7); House House on *Untitled Goose Game*; Caroll Spinney, *The Wisdom of Big Bird* (Villard 2003) on Sesame's craft. |
| V23 | **Typography as voice** — typeface choice is a tonal commitment; ≤2 typefaces per design unless a third has a defended role; cross-platform fallback determinism (`cursive` is non-deterministic). | Robert Bringhurst, *The Elements of Typographic Style* 4th ed. (Hartley & Marks 2012, ISBN 0-88179-212-0); Erik Spiekermann, *Stop Stealing Sheep & Find Out How Type Works* 3rd ed. (Adobe Press 2014, ISBN 0-321-93428-7). |
| V24 | **Animation timing & rhythm** — easing curves communicate physicality (Penner equations: back/elastic/bounce); ≤4 distinct curves with named roles; rhythm has composed beats (wind-up : pop : settle), not random durations. | Robert Penner, *Programming Macromedia Flash MX* (McGraw-Hill 2002, ISBN 0-07-222356-8) ch. 7 easing equations; Rachel Nabors, *Animation at Work* (A Book Apart 2017, ISBN 1-937557-65-7). |
| V25 | **Negative space / breathing room** — empty space is content, not absence. Vignelli's "rule of three" (≤3 weights / ≤3 sizes / ≤3 colors per layout); kid-game density 3-7 interactive elements per viewport; remove any decorative element — does the design collapse, or was it filler? | Massimo Vignelli, *The Vignelli Canon* (Lars Müller 2010, ISBN 3-03778-225-6); Paul Rand, *A Designer's Art* (Yale UP 1985, ISBN 0-300-05553-6). |
| V26 | **Visual storytelling — show, don't tell** — visual vocabulary communicates state without text labels. Hide all labels: ≥70% of states/affordances should remain understandable. Icons share line weight, corner treatment, abstraction level. | Scott McCloud, *Understanding Comics: The Invisible Art* (Tundra/Kitchen Sink 1993, ISBN 0-06-097625-X) chs. 2-3 on iconic abstraction. |

---

## 3. The v3 rubric

### 3.1 Nine mechanism-level axes

Each scored 1-10, average is the raw score, then capped by hard gates (§3.2).

| Axis | What it measures | Backing principles |
|---|---|---|
| **Contrast & Color** | axe-core `color-contrast` violations = 0; non-text UI ≥3:1; deuteranopia simulator pass. | V1, V2, V12 |
| **Touch & Tap Ergonomics** | All interactive elements ≥44×44 CSS px at 375×667 with ≥8px spacing. | V3 |
| **Typography** | Body ≥16px (or ≥14px on meta/footer); line-length 45-75ch on prose; line-height ≥1.4; sans-serif fallback declared. | V13 |
| **Motion Safety & Performance** | `prefers-reduced-motion: reduce` honored; all `@keyframes` animate transform/opacity only; ≥95% of frames during animation under 16.67ms. | V6, V7 |
| **Focus & Keyboard** | Every focusable element has a visible indicator (≥3:1 contrast change vs blurred); tab order present and complete; no toast/modal obscures focus. | V5 |
| **Layout Stability** | Lighthouse mobile LCP ≤2.5s, CLS ≤0.1, INP ≤200ms; explicit dimensions on media; reserved space for dynamically-injected toasts/banners. | V8, V9 |
| **Hierarchy & Affordance** | One visually-dominant primary CTA per screen; every clickable has a signifier (button shape, cursor:pointer, icon); consistent grouping per Gestalt proximity/similarity. | V10, V11 |
| **Kid-Appropriateness** | Reading level ≤Grade 3 (Flesch-Kincaid) on primary UI strings; no IAP/ads CTAs; tap-to-feedback under 100ms; one primary action per screen. | V14 |
| **Art Direction** *(new in v3)* | Visuals-as-art: ≤6 hue families with documented roles; named color scheme (Itten); ≥4/6 Disney-12 principles in interactive animations; UI motion has wind-up/pop/settle; one dominant shape language; named single visual reference; ≤2 typefaces (cross-platform-deterministic); ≤4 named easing curves; Vignelli rule-of-three observed; ≥70% of states readable with text hidden (McCloud). | V15-V26 |

### 3.2 Nine hard gates (auto-fail to ≤4)

A failure on **any** caps the score at 4 regardless of axis average. The critic must explicitly call out which gate(s) failed and provide evidence (axe finding, file:line, screenshot diff, Lighthouse output).

1. **WCAG-Contrast Gate** (V1). Any axe-core `color-contrast` violation in critical/serious severity → FAIL.
2. **Touch-Target Gate** (V3). Any interactive element with `getBoundingClientRect()` `width<44` OR `height<44` at the 375×667 viewport → FAIL.
3. **Viewport-Zoom Gate** (V4). `index.html` contains `user-scalable=no` or `maximum-scale=1` (or `<2`) on the viewport meta → FAIL.
4. **Layout-Thrash Gate** (V7). Any `@keyframes` block animates `top|left|right|bottom|width|height|margin|padding|font-size|border-width` → FAIL.
5. **Reduced-Motion Gate** (V6). With `page.emulateMedia({ reducedMotion: 'reduce' })`, any animation runs to non-trivial duration (>1ms effective) — i.e. either the global override is absent or specific animations bypass it → FAIL.
6. **Focus-Visible Gate** (V5). Any tab-focusable element shows no visible focus indicator (default browser ring stripped via `outline:none` without replacement, OR replacement indicator has <3:1 contrast against adjacent area). Toast/modal that fully obscures the focused element → also FAIL.
7. **Min-Body-Size Gate** (V13). Primary content body text computes <14px on mobile (375×667), OR any meta/footer/legal text computes <12px → FAIL. (Tiered: primary 14px floor, meta 12px floor.)
8. **Color-Only Gate** (V12). Any game-state distinction (grade, success/failure, danger/safe) communicated *only* by color, with no shape/icon/label backup → FAIL. Manual + deuteranopia-simulator screenshot.
9. **CLS Gate** (V8, V9). Lighthouse mobile CLS > 0.1, OR any single 5-second window shows cumulative shift > 0.1 in PerformanceObserver `LayoutShift` entries → FAIL.

Gates 2, 3, 7 are the three iter-2 logged-but-not-enforced TODOs. v2 promotes them to hard gates so they cannot slip through again.

### 3.3 Required measurement step

Before scoring, the critic MUST execute the following measurements and cite each in the diagnostics output.

| Measurement | Tool | Pass criterion |
|---|---|---|
| WCAG accessibility scan | `@axe-core/playwright` at 3 viewports (375×667, 768×1024, 1440×900) | Zero critical/serious violations |
| Touch-target audit | Playwright `evaluate(el => el.getBoundingClientRect())` over every interactive element at 375×667 | All ≥44×44 |
| Viewport meta | Grep `index.html` | No `user-scalable=no`, `maximum-scale<2` |
| Animation property audit | Grep `@keyframes` blocks in `src/style.css` and any inline animations | No layout-property animation |
| Reduce-motion verification | Playwright `emulateMedia({ reducedMotion: 'reduce' })` + take screenshot during what would be sparkle burst | No animation visible |
| Focus indicator audit | Playwright tab through every interactive; screenshot focused vs blurred | ≥3:1 contrast change visible |
| Performance & vitals | `npx lighthouse http://localhost:5173/fart-factory/ --form-factor=mobile --only-categories=performance,accessibility --output=json` | LCP ≤2.5s, CLS ≤0.1, INP ≤200ms, accessibility ≥95 |
| Layout shift watch | Playwright `LayoutShift` PerformanceObserver during a Launch + achievement-toast spawn | Cumulative shift ≤0.1 in any 5s window |
| Body-size audit | Playwright iterate text nodes; `getComputedStyle(el).fontSize` per | Primary ≥14px; meta ≥12px |
| Color-only audit | Take 3 screenshots; pipe through deuteranopia simulator (`npm i colorblind-simulator`) | Grade letters & key state still visually distinguishable |
| Reading level | `npm i text-readability`; run Flesch-Kincaid on every visible string in `src/ui/`, `src/content/`, `index.html` | Primary UI strings ≤Grade 3 |

For UI-affecting iterations the critic should ALSO take screenshots to `tests/e2e/__snapshots__/iter-N-{mobile,tablet,desktop}.png` (per existing PLAN.md §F input) for human review.

### 3.4 Calibration anchors

| Score | What it looks like |
|---|---|
| **9-10** | All 9 gates pass; ≥8 on every axis; axe-core clean across 3 viewports; Lighthouse mobile a11y ≥95, perf ≥90; deuteranopia & reading-level checks green; one primary CTA per screen; tap-to-feedback measured <100ms. |
| **7-8** | All gates pass; most axes ≥7; axe clean or near-clean; Lighthouse a11y ≥90, perf ≥75; minor hierarchy/affordance issues. |
| **5-6** | All gates pass but ≥2 axes scoring ≤5: weak typography, weak hierarchy, missing reading-level check, or borderline contrast. |
| **3-4** | Default for any iteration that fails ≥1 hard gate. |
| **1-2** | Multiple gate failures; UI is functionally broken on mobile or for assistive-tech users. |

A 9-10 cannot be claimed without measurements being run. Vibes-on-screenshot tops out at 7.

### 3.5 Output schema

Same shape as `FUN_CRITIC.md` §3.6 / `AUDIO_CRITIC.md` §3.5.

```json
{
  "score": 4,
  "rationale": "<2-4 sentences citing principle codes V1-V14 and file:line/screenshot evidence>",
  "blockers": ["<gate name + evidence>", ...],
  "axisScores": {
    "contrastColor": 0,
    "touchTapErgonomics": 0,
    "typography": 0,
    "motionSafetyPerformance": 0,
    "focusKeyboard": 0,
    "layoutStability": 0,
    "hierarchyAffordance": 0,
    "kidAppropriateness": 0,
    "artDirection": 0
  },
  "diagnostics": {
    "axeViolations": [],
    "lighthouseMetrics": {"lcpMs": 0, "cls": 0, "inpMs": 0, "a11yScore": 0, "perfScore": 0},
    "smallestTouchTargetPx": [0, 0],
    "smallestPrimaryFontPx": 0,
    "smallestMetaFontPx": 0,
    "userScalableNoPresent": false,
    "layoutThrashingKeyframes": [],
    "reduceMotionRespected": false,
    "focusInvisibleElements": [],
    "colorOnlyStateIndicators": [],
    "readingLevelGrade": 0,
    "primaryCTAsPerScreen": 0,
    "tapToFeedbackMs": 0,
    "screenshotPaths": ["tests/e2e/__snapshots__/iter-N-{mobile,tablet,desktop}.png"],
    "artDirection": {
      "hueFamiliesUsed": 0,
      "paletteScheme": "<named scheme | none>",
      "fullySaturatedSimultaneous": 0,
      "valueTiers": "<dark/mid/light distribution>",
      "shapeLanguageDominantPct": 0,
      "blindScreenshotIdentifiable": false,
      "namedVisualReference": "<one phrase | absent>",
      "disney12PrincipalsPerAnimation": 0,
      "windUpPopSettleAnimations": 0,
      "typefaceCount": 0,
      "fallbackDeterministic": false,
      "easingCurvesNamed": [],
      "decorativeElementsRemovableWithoutCollapse": 0,
      "labelHiddenStatesReadablePct": 0,
      "iconLineWeightConsistent": false
    }
  },
  "hardGatesFailed": []
}
```

### 3.6 Tools the critic may use

- **Read, Grep, Glob** — same as v1.
- **Playwright via shell (`npx playwright test ...`)** — REQUIRED for axe-core scan, touch-target audit, focus indicator audit, reduce-motion verification, layout-shift watch.
- **Lighthouse CLI** (`npx lighthouse`) — REQUIRED for Web Vitals on UI-touching iterations.
- **Bash (read-only)** — `grep` for viewport meta and keyframes; `ls` for screenshot paths.
- **Screenshot inspection** — for non-text contrast (V2), gestalt grouping (V11), focus-state visual diff (V5).

---

## 4. v2 applied to current Fart Factory state

Evaluating commit `11f58ec` on `overhaul-v2`. Worked-validation evidence is partly source-inspection (where measurement requires a live browser, the critic should mark TODO and run the tool — for this written validation I cite source code only and flag where Lighthouse / axe must be run live).

### 4.1 Diagnostics (source-inspection layer)

- **Viewport meta** at [index.html:5](index.html:5): `width=device-width, initial-scale=1.0, viewport-fit=cover`. No `user-scalable=no`. **Gate 3 PASSES.**
- **Touch targets** in [src/style.css](src/style.css):
  - slider thumb: `width:44px; height:44px` ([style.css:43-44](src/style.css:43))
  - `.btn` `min-height: 44px` ([style.css:75](src/style.css:75))
  - Random and Launch are flex:1 children of `.buttons` — at 375px viewport with gap:10 and container max-width:500 padding:10, each button ≈173×~50px, both ≥44×44.
  - Onboarding Skip / Next set `min-width:100/130px` and inherit `.btn` `min-height:44`. **Gate 2 PASSES.**
- **Animation properties** in [src/style.css](src/style.css) (all `@keyframes`):
  - `react`: scale + rotate (V7 ✓)
  - `float`: scale + translateY (V7 ✓)
  - `shake`: translateX (V7 ✓)
  - `comboPulse`: scale (V7 ✓)
  - `toastIn` / `toastOut`: translateY + opacity (V7 ✓)
  - `sparkleBurst`: translate + scale + rotate + opacity (V7 ✓)
  - `onboardingFade`: opacity (V7 ✓)
  - All animations transform/opacity-only. **Gate 4 PASSES.**
- **Reduced-motion** at [src/style.css:337-343](src/style.css:337):
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
  ```
  Universal selector clamps every animation. **Gate 5 PASSES** (subject to Playwright verification at runtime).
- **Focus-visible** at [src/style.css:52,77](src/style.css:52): sliders + buttons declare `:focus-visible { outline: 3px solid #ffeb3b; outline-offset: 4px; }`. Yellow on dark navy yields ~10:1 contrast. **Gate 6 PASSES** (subject to verification on every focusable element including onboarding Skip/Next).
- **Body-size audit** in [src/style.css](src/style.css):
  - body sets no explicit `font-size`, inherits browser default 16px.
  - `.subtitle`, `.slider-label`, `.val`, `.score-row`, `.hall-entry`, `.onboarding-step-indicator` all `0.95em` → ~15.2px. ✓
  - `.btn` `1.15em` → ~18.4px. ✓
  - `.commentary` `1.05em` → ~16.8px. ✓
  - `.onboarding-body` `1.05em` → ~16.8px. ✓
  - `.ach-desc` `0.9em` → ~14.4px. ✓ (raised from 0.85em at iter 6 specifically to clear this floor)
  - `footer` `0.85em` → ~13.6px. **Below 14px primary floor but ≥12px meta floor.** Gate 7 tiered policy treats footer as meta — **PASSES**. (Note: would benefit from `0.9em` raise for parity with `.ach-desc`.)
- **Color-only state indicators**: grade letters are unique strings (`F-`, `D`, `C`, `C+`, `B`, `B+`, `A`, `A+`, `S+` — see [src/scoring/grade.ts:8-16](src/scoring/grade.ts:8)) AND each has a unique color. Both signals carry the state. **Gate 8 PASSES.** (Note: stinkiness emoji backup also serves this role.)
- **Layout-thrash sources for CLS**: achievement toasts inserted into `.achievement-host` ([src/style.css:286-297](src/style.css:286)) which has `position: fixed` and is OUT of normal flow — toast injection does NOT shift content. ✓ Onboarding overlay similarly `position: fixed; inset: 0`. ✓ No `<img>` mascot to cause dimension shifts. CLS from source inspection is likely ≤0.1, but **Lighthouse must be run live** to confirm gate 9.
- **Color contrast (V1)** — needs axe-core to confirm. Visual inspection: white text on dark navy gradient is fine; commentary `#ffff88` on dark navy ≈10:1 ✓; `.val` black on `#00ff00` background ≈14:1 ✓; `.hall-empty` was raised to `#ffcc88` per port (originally `#aa8844`) — likely passes 4.5:1 against `rgba(80,50,0,0.3)` background but this is borderline. **Gate 1 requires axe to confirm.**
- **Art Direction (new in v3)**:
  - **Hue families used** (V16): inspect [src/style.css](src/style.css) sample — navy gradient (blue), neon green border (`#00ff00`), red-orange Launch (`#ff0000`-`#ff6600`), purple Random (`#9b59b6`-`#8e44ad`), pink results border (`#ff00ff`), gold Hall (`#ffaa00`-`#ffcc00`), yellow commentary (`#ffff88`), light cream hall-empty (`#ffcc88`), gold-orange achievement toast, neon green onboarding border (`#00ff88`), orange combo banner (`#ff5722`/`#ff9800`/`#ffc107`). **8+ hue families** simultaneously visible. **Fail V16.** No documented role per hue.
  - **Palette scheme** (V17): no named color scheme. Hues are not on a complementary / analogous / triadic geometry — they're scattered. Multiple elements at S=100% L=50% (#00ff00 lime, #ff00ff magenta, #ffff00 hint, #ff0000 launch). **Fail V17.** Itten's vibrating-boundary phenomenon is happening on the Launch button and the lab panel border.
  - **Fully saturated simultaneous**: ≥4 visible at once (lab border #00ff00, launch gradient #ff0000, results border #ff00ff, hall border #ffaa00). Itten's hierarchy violated. **Fail V17 saturation hierarchy sub-test.**
  - **Value structure**: convert mentally to grayscale — most elements land in the dark-mid range due to dark backgrounds; but the saturated borders all read as similar mid-light values. No clean dark/midtone/light hierarchy.
  - **Shape language dominant %** (V18): mixed `border-radius: 12-20px` (rounded rectangles for buttons + cards), `border-radius: 50%` (circles for slider thumbs), and rounded-rectangle gas clouds (radial gradients). ~70% rounded-rectangle, ~20% circles, ~10% organic blobs (gas clouds). The dominant family is rounded rectangles, which is reasonable. **Pass V18 narrowly.**
  - **Blind-screenshot identifiable** (V18 follow-up): ambiguous — neon-cartoon-lab vibe is recognizable, but the chaotic palette would also fit "any kid-coded HTML game with bright colors." Marginal.
  - **Named visual reference** (V22): no single phrase commits the design. Could be described as "neon arcade meets cartoon laboratory meets kids' chalkboard meets emoji confetti" — four references. **Fail V22.**
  - **Disney-12 principles per animation** (V15): inspect each `@keyframes`:
    - `react`: scale + rotate. Score: Squash&Stretch (no — uniform scale), Anticipation (no), Slow-In/Slow-Out (default ease only), Arcs (no — straight scale), Follow-Through (no — hard stop), Secondary Action (no). **1/6.**
    - `float` (gas cloud): scale + translateY + opacity. Has a slow-in/slow-out via 50% keyframe. **1-2/6.**
    - `shake`: linear translate. **0/6** (mechanical buzzing).
    - `comboPulse`: scale 1→1.05→1, ease-in-out, infinite. **1/6** (timing only).
    - `toastIn`/`toastOut`: translateY + opacity. **2/6** (timing + slow-in/out).
    - `sparkleBurst`: translate + scale + rotate over 1.8s ease-out. **2-3/6** (timing + arcs via combined transforms + exaggeration).
    - `onboardingFade`: opacity only. **1/6.**
    - **Average: ~1.4/6. Fail V15** (need ≥4/6 average).
  - **Wind-up/pop/settle animations** (V20): `.btn:active { transform: scale(0.95) }` with `transition: transform 0.1s` is the canonical "two states, linear time, no anticipation, no overshoot" anti-pattern. Zero buttons exhibit wind-up + pop + settle. **Fail V20.**
  - **Typeface count** (V23): three handwritten-register faces stacked — `'Comic Sans MS', 'Chalkboard SE', cursive`. **Fail V23 (≤2 typefaces with defended roles).** Cross-platform fallback non-deterministic: `cursive` on iOS without manual install resolves to system Apple Chancery / Snell Roundhand — three different voices on three machines.
  - **Easing curves named** (V24): inspect — `transition: transform 0.1s` (default ease), `ease`, `ease-in-out`, `ease-out`. No Penner-named curves (back/elastic/bounce). All animations feel "default" — none has a personality of its own. **Fail V24** (≤4 distinct curves with named roles).
  - **Decorative elements removable without collapse** (V25): glowing borders on every card, gradient backgrounds, rainbow slider track, text-shadows on h1, particles on launch — at least 4-5 elements are pure decoration. The crop test would remove most without collapse. The "no breathing room" Vignelli failure. **Fail V25.**
  - **Label-hidden states readable %** (V26): hide every text label and inspect. Sliders without labels are still parseable as draggable controls (gradient track + circular thumb). The lab panel and results panel are bordered cards — distinguishable. But the grade letter, the hall entries, the achievement toast contents, the commentary — all collapse to undifferentiated rectangles or empty space. Estimated **40-50% readable, below the 70% target.** **Fail V26.**
  - **Icon line weight consistent**: emoji-heavy design (no custom icons). Emoji rendering is system-dependent. No bespoke icon set. The app punts on icon design.

### 4.2 Per-axis scores (source-evidence and pending live measurements)

- **Contrast & Color: 7.** Source inspection of color choices is mostly clean; deuteranopia OK because grade encoding uses both letter and color. Pending axe-core run. Without measurement, cap at 7.
- **Touch & Tap Ergonomics: 9.** All interactive elements meet 44×44 in source. Spacing checks (`gap: 10px` on `.buttons`, ample padding throughout) clear the 8px minimum.
- **Typography: 7.** Body 16px (default), most text ≥0.9em, `.ach-desc` was deliberately raised. Footer 0.85em is borderline but clears the meta-tier 12px floor. Line-length not measured (no `max-width` on commentary text — it inherits `.container` `max-width:500`, which yields ~50ch on most fonts; close to 45-75ch ideal). Sans-serif fallback ('Comic Sans MS', 'Chalkboard SE', cursive) — `cursive` keyword is the OS-fallback; Comic Sans absent on iOS without manual install means iPad renders cursive system font. Acceptable but not ideal.
- **Motion Safety & Performance: 9.** All `@keyframes` are transform/opacity only. Universal reduce-motion override. Frame timing not measured (would need Playwright trace) but the animation choices give high prior probability of 60fps.
- **Focus & Keyboard: 7.** Sliders and `.btn` have `:focus-visible`. Onboarding Skip/Next inherit `.btn` styles. No explicit verification that toasts don't obscure focused Launch — gate passes pending live test. No tab-order test in current `tests/e2e/` directory. The `aria-live` test confirms grade announcement, but full keyboard flow isn't covered.
- **Layout Stability: 6.** Source inspection suggests low CLS (toasts/onboarding `position: fixed`). But Lighthouse never run; INP and LCP unknown. Without measurement, cap at 6.
- **Hierarchy & Affordance: 7.** Launch is the visually-dominant CTA (1.4em font, gradient background, larger boxshadow). Random is secondary (smaller-feeling gradient, less visual weight). Sliders have signifiers (gradient track, white circular thumb, focus ring). Onboarding tutorial uses one Next per step. ✓ on the BBC-GEL "one primary action" rule.
- **Kid-Appropriateness: 6.** Reading level not measured. Spot-check of UI strings: "LAUNCH FART", "Random", "Fart Report Card", "Hall of Shame", "Launch" — all Grade 1-2. Commentary strings vary: "That fart had CHAPTERS." (Grade 3-4) is fine; "The Geneva Convention would like a word." (Grade 6-7 due to "Geneva Convention" complexity) is above the ≤Grade 3 target. Tap-to-feedback measured: synchronous click handler at [src/main.ts:182](src/main.ts:182) → `playFart` called immediately, audio + visuals fire same frame. Likely <100ms but unmeasured. No IAP/ads ✓. One primary action per screen ✓ (except onboarding has Skip + Next, but Next is dominant).
- **Art Direction: 3** *(new in v3)*. Eight of twelve craft sub-tests fail (palette intentionality, color scheme, saturation hierarchy, named visual reference, Disney-12 principles per animation averaging 1.4/6, wind-up/pop/settle absent, typeface count + fallback determinism, easing curves named, breathing room / Vignelli rule-of-three, label-hidden states readability). Three pass (shape language narrowly, value structure marginally, Kid-Appropriateness section's primary CTA). The build is **uncommitted on craft**: multi-reference, multi-palette, multi-typeface, multi-saturation. Single most diagnostic failure: there is no one-phrase answer to "what is this game's visual world?" The fix is *reduction*, not addition.

Average: (7+9+7+9+7+6+7+6+3) / 9 = 61/9 = **6.78**.

### 4.3 Verdict

- **Hard gates failed**: zero from source inspection. Live tool measurements (axe-core, Lighthouse) may surface contrast or CLS findings; until run, gate verdicts are *provisional pass with TODO*.
- **v3 score: 7** (raw 6.78 → rounds to 7; the new Art Direction axis pulls average from v2's 7.25 to 6.78).
- **v2 score on the same artifact: 7.** Delta v2→v3: −0.5 raw (rounds to same final integer), but Art Direction axis exposes 8 specific craft sub-test failures the technical axes didn't surface.
- **v1 score on the same artifact: 9** (iter 8). Delta v1→v3: **−2**.

The v3 delta is more about **specific diagnosis** than score. v2 said "axe + Lighthouse measurements MUST run before claiming ≥8." v3 adds: "AND the design is uncommitted on craft — chaotic palette, inert UI animations, three handwritten typefaces, no named visual reference, breathing room violated." Even when the v2 measurements ship clean, score caps at 8 max (not 9) because Art Direction is 3/10. To clear 9-10, the design must commit to a single visual reference, document a ≤6-hue palette, replace inert `scale 0.95` button presses with wind-up/pop/settle motion, drop to ≤2 typefaces, and apply Vignelli reduction.

### 4.4 Measurements that MUST run on next iteration to justify ≥8

1. `npx playwright test` with `@axe-core/playwright` adapter — gate 1.
2. `npx lighthouse http://localhost:5173/fart-factory/ --form-factor=mobile --output=json` — gates 8/9, axes 1 and 6.
3. Playwright `emulateMedia({ reducedMotion: 'reduce' })` test asserting no sparkle/shake animation visible during a Launch — gate 5.
4. Playwright tab-through assertion checking every interactive element (slider × 6, Launch, Random, onboarding Skip, onboarding Next) has visible focus — gate 6.
5. Touch-target audit Playwright spec asserting `getBoundingClientRect()` ≥44×44 on every `<input>`, `<button>` at 375×667 — gate 2 hardening.
6. Reading-level test on commentary strings (Flesch-Kincaid) — axis 8.

Without these, score is capped at 7 even on a clean source. v1 critic happily gave 9 without them; v2 cannot.

### 4.5 Blockers (must address before visual ≥ 8)

**v2 technical blockers (still required):**
1. **Add an axe-core E2E test.** Drop `tests/e2e/axe.spec.ts` running `@axe-core/playwright` against `/fart-factory/` at 3 viewports; assert zero critical/serious violations. Closes gate 1 measurement.
2. **Add a Lighthouse CI check.** Either a pre-push hook or a Playwright-driven Lighthouse run; track LCP/CLS/INP across iterations. Closes gates 8/9 measurement.
3. **Add a touch-target Playwright spec.** Already cheap given existing infrastructure; iterate every interactive element and assert dimensions.
4. **Raise `footer` font to 0.9em** for parity with `.ach-desc`. Pure consistency — meta-tier is fine but parity is cleaner.
5. **Reading-level lint on commentary.** Drop `tests/unit/reading-level.test.ts` running Flesch-Kincaid on every commentary string; flag any above Grade 5; allow ≤Grade 5 for "comedy strings" (commentary is allowed to use 'Geneva Convention' once or twice for adult laughs) but UI strings must be ≤Grade 3.

**v3 craft blockers (additional, must clear for visual ≥ 8-9):**
6. **Pick one visual reference and commit** (V22). One phrase: "neon-cartoon laboratory" or "kid's chalkboard with periodic-table vibes" or "1960s sci-fi B-movie poster" or "Saturday-morning cartoon mad scientist." Then make ≥80% of visuals pull from that reference. Right now the design hedges across four references; this single decision drives every other craft fix.
7. **Document a ≤6-hue palette** (V16). `docs/PALETTE.md` listing hex codes + assigned roles. Suggested for a fart-themed kids' lab: bg-deep (navy `#0f3460`), accent-lab (lime `#00ff88`), warning-stink (orange `#ff6600`), reward-gold (`#ffcc00`), error-skunk (`#ff0099`), neutral-text (`#fff`). Six hues, six roles. All current colors must be auditioned against this palette; non-conformers either reassigned or removed. Vignelli rule-of-three (≤3 simultaneously fully-saturated).
8. **Replace `scale(0.95)` button-presses with wind-up/pop/settle** (V20, V24). Use Penner `easeOutBack` for the pop, `easeOutBounce` for the settle. Codify as a CSS class: `.btn-press { animation: press-windup 80ms, press-pop 200ms 80ms, press-settle 300ms 280ms; }`. Apply to Launch and Random. Same approach for slider thumb on drag-end.
9. **Drop typeface stack to ≤2 with deterministic fallback** (V23). Either commit to ONE handwritten face (`'Comic Sans MS', system-ui` — single face, deterministic system fallback) or pair a display face with a body face (`'Bangers', 'Comic Sans MS', cursive` for headlines + `system-ui` for body). The current three-handwritten stack reads as indecisive.
10. **Add wind-up/pop/settle to Launch animation** (V15, V20). On Launch click, the button should: (a) squash 80ms (anticipation), (b) explode outward via stretch + scale 200ms (the pop), (c) overshoot + settle via spring 300ms. Pair with a "wind-up" audio cue (see AUDIO_CRITIC.md §4.4 #6). Disney's "Anticipation" + "Squash & Stretch" + "Follow-Through" all in one button.
11. **Apply Vignelli reduction** (V25). Audit every gradient, glow, text-shadow, and decorative border. Remove ≥30% of decorative ink. Keep glow on the *one* primary CTA per screen (Launch). Remove from secondary controls. Negative space is content.
12. **Add icon vocabulary or delete icons** (V26). Either commission/draw a custom set of icons that share line weight + corner treatment + abstraction level (the slider thumb deserves a fart-cloud icon, not a generic white circle), or remove decorative icons and rely on labels.

Items 6-7 are the keystone — the palette doc + visual reference commitment cascade through every other craft fix. Without them, items 8-12 are local touch-ups on a still-uncommitted design. Items 6-12 together would lift Art Direction from 3 to 7-8, and the overall visual score from 7 to 8-9.

---

## 5. Migration into PLAN.md

Replace PLAN.md §F's five-line "Visual critic" block with:

```markdown
### Visual critic

Full rubric: [docs/VISUAL_CRITIC.md](VISUAL_CRITIC.md). v3 evolves v2 with an Art Direction axis (visuals-as-art): Disney 12 Principles, Bacher palette, Itten/Albers color theory, shape language, character/appeal, wind-up/pop/settle UI motion, single visual reference commitment, typography as voice, Penner easing equations, Vignelli restraint, McCloud visual storytelling. v2's eight technical axes + nine gates remain unchanged.

- **Axes (9, each 1-10):** Contrast & Color, Touch & Tap Ergonomics, Typography, Motion Safety & Performance, Focus & Keyboard, Layout Stability, Hierarchy & Affordance, Kid-Appropriateness, Art Direction *(new in v3)*.
- **Hard gates (9, any failure caps score at 4):** WCAG-Contrast, Touch-Target, Viewport-Zoom, Layout-Thrash, Reduced-Motion, Focus-Visible, Min-Body-Size, Color-Only, CLS.
- **Required measurements:** v2 measurement battery + v3 craft diagnostic (palette inventory + named scheme; Disney-12 audit per animation; wind-up/pop/settle inspection; typeface count + cross-platform fallback test; easing-curve catalog; shape-language proportion; blind-screenshot identifiability; label-hidden state readability %).
- **Output schema:** `{score, rationale, blockers, axisScores, diagnostics, hardGatesFailed}` — see VISUAL_CRITIC.md §3.5.
- **Tools:** Read, Grep, Glob, Playwright (REQUIRED with @axe-core/playwright), Lighthouse CLI, screenshot inspection.
```

The orchestrator's parsing logic at PLAN.md §F lines 376-385 needs **no change**.

---

## 6. Verification

| Scenario | v1 verdict | v2 expected verdict |
|---|---|---|
| Current Fart Factory @ `11f58ec` (autonomous-session HEAD) | visual=9 (iter 8) | **visual=7 by source inspection alone; capped without axe/Lighthouse run; could reach 8-9 with measurements green** |
| Same game with `user-scalable=no` re-introduced | could still pass v1 if "looks fine" | **visual ≤4** (gate 3 fires) |
| Same game with a 13px primary body text | could pass v1 if not eyeballed | **visual ≤4** (gate 7 fires) |
| Same game with all 5 §4.5 measurements run + clean | (no test) | visual = 8-9 |

§4 above is the executed verification of row 1. The v1 vs v2 delta of -2 is smaller than for fun (-7) or audio (-3), reflecting that the iter-0.3 port and iter-6 fixup actually addressed the major v1 TODOs. v2's stricter measurement requirement still prevents the unjustified 9.

---

## 7. What v2 deliberately does not change

- The orchestrator loop / critic-spawning / JSON-parse retry at PLAN.md §E and §F lines 376-385.
- The Quality, Fun, Audio critics — `docs/QUALITY_CRITIC.md`, `docs/FUN_CRITIC.md`, `docs/AUDIO_CRITIC.md` are companion docs.
- The 4-critic averaging math.

---

## 8. Open follow-ups

- Ship the §4.5 measurements (axe-core spec, Lighthouse CI, touch-target spec, reading-level lint) as one combined iteration. ETA ~30 min for the experienced operator.
- Consider adding a *visual-regression* gate: snapshot diffs at 3 viewports, fail on >2% pixel-diff vs baseline. Common in design-system pipelines; adds drift detection that this rubric currently lacks.
- The Color-Only Gate (gate 8) currently relies on manual deuteranopia-simulator inspection. A custom Playwright helper that programmatically applies a deuteranopia color matrix and screenshots would automate this.
