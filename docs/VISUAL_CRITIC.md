# Visual Critic v2 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> five-line block at `docs/PLAN.md` §F (the "Visual critic" subsection).
> Same v1→v2 redesign approach as `docs/FUN_CRITIC.md` and
> `docs/AUDIO_CRITIC.md`.

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

---

## 2. Design principles backing v2

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

---

## 3. The v2 rubric

### 3.1 Eight mechanism-level axes

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
    "kidAppropriateness": 0
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
    "screenshotPaths": ["tests/e2e/__snapshots__/iter-N-{mobile,tablet,desktop}.png"]
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

### 4.2 Per-axis scores (source-evidence and pending live measurements)

- **Contrast & Color: 7.** Source inspection of color choices is mostly clean; deuteranopia OK because grade encoding uses both letter and color. Pending axe-core run. Without measurement, cap at 7.
- **Touch & Tap Ergonomics: 9.** All interactive elements meet 44×44 in source. Spacing checks (`gap: 10px` on `.buttons`, ample padding throughout) clear the 8px minimum.
- **Typography: 7.** Body 16px (default), most text ≥0.9em, `.ach-desc` was deliberately raised. Footer 0.85em is borderline but clears the meta-tier 12px floor. Line-length not measured (no `max-width` on commentary text — it inherits `.container` `max-width:500`, which yields ~50ch on most fonts; close to 45-75ch ideal). Sans-serif fallback ('Comic Sans MS', 'Chalkboard SE', cursive) — `cursive` keyword is the OS-fallback; Comic Sans absent on iOS without manual install means iPad renders cursive system font. Acceptable but not ideal.
- **Motion Safety & Performance: 9.** All `@keyframes` are transform/opacity only. Universal reduce-motion override. Frame timing not measured (would need Playwright trace) but the animation choices give high prior probability of 60fps.
- **Focus & Keyboard: 7.** Sliders and `.btn` have `:focus-visible`. Onboarding Skip/Next inherit `.btn` styles. No explicit verification that toasts don't obscure focused Launch — gate passes pending live test. No tab-order test in current `tests/e2e/` directory. The `aria-live` test confirms grade announcement, but full keyboard flow isn't covered.
- **Layout Stability: 6.** Source inspection suggests low CLS (toasts/onboarding `position: fixed`). But Lighthouse never run; INP and LCP unknown. Without measurement, cap at 6.
- **Hierarchy & Affordance: 7.** Launch is the visually-dominant CTA (1.4em font, gradient background, larger boxshadow). Random is secondary (smaller-feeling gradient, less visual weight). Sliders have signifiers (gradient track, white circular thumb, focus ring). Onboarding tutorial uses one Next per step. ✓ on the BBC-GEL "one primary action" rule.
- **Kid-Appropriateness: 6.** Reading level not measured. Spot-check of UI strings: "LAUNCH FART", "Random", "Fart Report Card", "Hall of Shame", "Launch" — all Grade 1-2. Commentary strings vary: "That fart had CHAPTERS." (Grade 3-4) is fine; "The Geneva Convention would like a word." (Grade 6-7 due to "Geneva Convention" complexity) is above the ≤Grade 3 target. Tap-to-feedback measured: synchronous click handler at [src/main.ts:182](src/main.ts:182) → `playFart` called immediately, audio + visuals fire same frame. Likely <100ms but unmeasured. No IAP/ads ✓. One primary action per screen ✓ (except onboarding has Skip + Next, but Next is dominant).

Average: (7+9+7+9+7+6+7+6) / 8 = 58/8 = **7.25**.

### 4.3 Verdict

- **Hard gates failed**: zero from source inspection. Live tool measurements (axe-core, Lighthouse) may surface contrast or CLS findings; until run, gate verdicts are *provisional pass with TODO*.
- **v2 score: 7** (raw 7.25 → rounds to 7; would be 7-8 with measurements green, 4 if any gate fires).
- **v1 score on the same artifact: 9** (iter 8). Delta: **−2**.

The v1→v2 delta is smaller for visual than for fun (-7) or audio (-3) because the iter 0.3 port and iter-6 fixup *did* address the major v1 TODOs (transform-only animations, `user-scalable=no` removed, `.ach-desc` font size). The delta of -2 still reflects v2's refusal to award 9 without measurements run — measurements that v1 did not require.

### 4.4 Measurements that MUST run on next iteration to justify ≥8

1. `npx playwright test` with `@axe-core/playwright` adapter — gate 1.
2. `npx lighthouse http://localhost:5173/fart-factory/ --form-factor=mobile --output=json` — gates 8/9, axes 1 and 6.
3. Playwright `emulateMedia({ reducedMotion: 'reduce' })` test asserting no sparkle/shake animation visible during a Launch — gate 5.
4. Playwright tab-through assertion checking every interactive element (slider × 6, Launch, Random, onboarding Skip, onboarding Next) has visible focus — gate 6.
5. Touch-target audit Playwright spec asserting `getBoundingClientRect()` ≥44×44 on every `<input>`, `<button>` at 375×667 — gate 2 hardening.
6. Reading-level test on commentary strings (Flesch-Kincaid) — axis 8.

Without these, score is capped at 7 even on a clean source. v1 critic happily gave 9 without them; v2 cannot.

### 4.5 Blockers (must address before visual ≥ 8)

1. **Add an axe-core E2E test.** Drop `tests/e2e/axe.spec.ts` running `@axe-core/playwright` against `/fart-factory/` at 3 viewports; assert zero critical/serious violations. Closes gate 1 measurement.
2. **Add a Lighthouse CI check.** Either a pre-push hook or a Playwright-driven Lighthouse run; track LCP/CLS/INP across iterations. Closes gates 8/9 measurement.
3. **Add a touch-target Playwright spec.** Already cheap given existing infrastructure; iterate every interactive element and assert dimensions.
4. **Raise `footer` font to 0.9em** for parity with `.ach-desc`. Pure consistency — meta-tier is fine but parity is cleaner.
5. **Reading-level lint on commentary.** Drop `tests/unit/reading-level.test.ts` running Flesch-Kincaid on every commentary string; flag any above Grade 5; allow ≤Grade 5 for "comedy strings" (commentary is allowed to use 'Geneva Convention' once or twice for adult laughs) but UI strings must be ≤Grade 3.

These five items, addressed together, would likely move visual to **9** under v2 by both passing all gates AND substantiating each axis with measurement evidence.

---

## 5. Migration into PLAN.md

Replace PLAN.md §F's five-line "Visual critic" block with:

```markdown
### Visual critic

Full rubric: [docs/VISUAL_CRITIC.md](VISUAL_CRITIC.md). v2 evolves v1 with eight mechanism-level axes, nine hard gates (incl. NEW Touch-Target, Viewport-Zoom, Reduced-Motion, Focus-Visible, Color-Only, CLS), and a required tools-run measurement step (axe-core + Lighthouse + Playwright traces).

- **Axes (8, each 1-10):** Contrast & Color, Touch & Tap Ergonomics, Typography, Motion Safety & Performance, Focus & Keyboard, Layout Stability, Hierarchy & Affordance, Kid-Appropriateness.
- **Hard gates (9, any failure caps score at 4):** WCAG-Contrast, Touch-Target, Viewport-Zoom, Layout-Thrash, Reduced-Motion, Focus-Visible, Min-Body-Size (tiered: primary 14px / meta 12px), Color-Only, CLS.
- **Required measurements:** axe-core at 3 viewports; Lighthouse mobile (LCP/CLS/INP/a11y); Playwright touch-target audit; Playwright reduce-motion verification; Playwright focus indicator audit; deuteranopia simulator on screenshots; Flesch-Kincaid reading level on visible strings.
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
