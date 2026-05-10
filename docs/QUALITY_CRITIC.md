# Quality Critic v2 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> six-line block at `docs/PLAN.md` §F (the "Quality critic" subsection).
> Same v1→v2 redesign approach as `docs/FUN_CRITIC.md`,
> `docs/AUDIO_CRITIC.md`, `docs/VISUAL_CRITIC.md`.

---

## 1. Why v1 failed

The v1 quality critic in `docs/PLAN.md` §F gave **quality=8 or 9** to every iteration of the autonomous overhaul session — including iter 1 (toolchain scaffold; nothing to evaluate yet) and iter 8 (haptics + onboarding tutorial; 220 lines of new TS, 3 new tests). v1's "axes" — readability, modularity, accessibility, performance, kid-safety/content — and "penalize/reward" lists are reasonable for a senior-developer code review but offer no anchors to mechanical tools. Concretely, v1's failures:

1. **Vibe axes.** "Readability" and "modularity" are reader judgments; "performance" was awarded points without `npm run build --report` ever running.
2. **No measurement step.** v1 listed `tests/` as an input but never required `--coverage`, `tsc --noEmit`, ESLint with `complexity`, mutation testing, or `npm audit`. The autonomous run's `docs/FINAL_REPORT.md` line 52 explicitly states "Coverage : not measured this run" — a quality critic awarding 9s without coverage data is awarding on faith.
3. **Penalize/reward lists, not gates.** `Penalize: ... new any types, ... hard-coded API keys` — but no automatic blocker. Reviewer is supposed to deduct points, but with vague axes the deduction is fungible: "a new `any` is bad" + "good naming elsewhere" can still average to 8.
4. **No TDD-ordering check.** The user's global `CLAUDE.md` RULE 1 is red-green TDD always (failing test FIRST). Quality v1 has no mechanism to verify a test was committed before the production code it tests.
5. **No mutation-testing check.** Coverage proves code *executed*; mutation score proves tests *would catch a regression*. v1 had neither.
6. **No supply-chain check.** `npm audit`, lockfile integrity, dep-justification — none in v1.
7. **Inflation-friendly calibration.** v1 awarded 9 to scaffold-only iter 1 and to iter 8's mostly-CSS work. A 9 should mean "exceptional quality." When 9 is the modal score, the rubric has lost calibration.

**Observable in `docs/iteration-log.md`:** quality scores 8, 8, 9, 9, 9, 9, 9, 9 across iters 1-8 — a perfect 9 streak after iter 2, with no single quality blocker ever cited despite known issues (no coverage measurement, no mutation testing, no audit, no commit-ordering verification). Compared to fun (5,7,6,8,9,8,8,9) and audio (5,4,8,8,7,7,7,7), Quality is the *most* scoring-inflated of the four critics.

---

## 2. Design principles backing v2

Each axis and gate below traces to one or more cited principles. Principles are Q1-Q12 (parallel to FUN_CRITIC.md's P1-P19, AUDIO_CRITIC.md's A1-A15, VISUAL_CRITIC.md's V1-V14).

| # | Principle | Source |
|---|---|---|
| Q1 | **Red-green TDD discipline** — failing test FIRST; production code second; refactor under green. | Kent Beck, *Test-Driven Development by Example* (Addison-Wesley 2002, ISBN 0-321-14653-0); user's global `CLAUDE.md` RULE 1. |
| Q2 | **Cyclomatic complexity ≤10** — independent linear paths through a function should not exceed 10; above this, testability and comprehension degrade non-linearly. | Thomas J. McCabe, "A Complexity Measure," *IEEE Transactions on Software Engineering* SE-2(4):308-320, December 1976; threshold popularized in McCabe & Watson, NIST Special Publication 500-235 (1996). |
| Q3 | **Cohesion & coupling / SRP** — modules should have one reason to change; high cohesion within, loose coupling between; no circular imports. | Yourdon & Constantine, *Structured Design* (Yourdon Press 1979); Robert C. Martin, *Agile Software Development, Principles, Patterns, and Practices* (Prentice Hall 2002) on SRP. |
| Q4 | **TypeScript strict mode** — `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`; no `any`, no `as` casts, no `@ts-ignore`. Discriminated-union exhaustiveness via `never`. | TypeScript Handbook, "Strictness" (typescriptlang.org/docs); Microsoft, ongoing. |
| Q5 | **OWASP Top 10 (2021)** — minimum security-risk floor: injection (A03), cryptographic failures (A02), vulnerable components (A06), broken authn (A07), SSRF (A10). | OWASP Foundation, "OWASP Top 10:2021" (owasp.org/Top10); OWASP XSS Prevention Cheat Sheet. |
| Q6 | **Web Vitals + bundle budgets** — page-level UX bounded by LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; bundle/asset budgets are the code-level lever. | Google Web Vitals (web.dev/articles/vitals); Addy Osmani, "Performance budgets 101"; Lighthouse CI. |
| Q7 | **Naming, function size, single level of abstraction** — functions do one thing, ≤~50 lines, intention-revealing names, no cryptic abbreviations. | Robert C. Martin, *Clean Code* (Prentice Hall 2008, ISBN 0-13-235088-2), Chapters 2-3. |
| Q8 | **Coverage floor + mutation testing** — line/branch coverage proves code *executed*; mutation score proves tests *would catch a regression*. Coverage is necessary but not sufficient. | ISO/IEC/IEEE 29119-4:2021 on test techniques; Just, Jalali, Inozemtseva, Ernst, Holmes, Fraser, "Are mutants a valid substitute for real faults?", *FSE 2014*. |
| Q9 | **Dependency hygiene / supply chain** — every dep is attack surface; lockfiles committed, audits run, additions justified, abandonware flagged. | CISA, "Securing the Software Supply Chain" (2022); NIST SSDF SP 800-218 (2022). |
| Q10 | **WCAG 2.2 source-level conformance** — semantic HTML, correct ARIA, keyboard reachability, programmatic labels at the source level (Visual critic checks rendered output; Quality checks the source). | W3C WCAG 2.2 (Recommendation, Oct 2023); `eslint-plugin-jsx-a11y`; `@axe-core/playwright`. |
| Q11 | **Error-handling discipline** — caught exceptions must be handled, logged, or rethrown; no empty catches; no swallowed promise rejections. | Joshua Bloch, *Effective Java* 3rd ed. (Addison-Wesley 2018), Item 77 "Don't ignore exceptions"; Dave Cheney, "Don't just check errors, handle them gracefully" (2016). |
| Q12 | **Self-documenting code** — names and structure express intent; comments explain *why*, never restate *what*; no commented-out zombie code. Aligns with user's global `CLAUDE.md` "default to writing no comments." | Robert C. Martin, *Clean Code*, Ch. 4; Martin Fowler, *Refactoring* 2nd ed. (Addison-Wesley 2018) on comments as a code smell. |

---

## 3. The v2 rubric

### 3.1 Six mechanism-level axes

Each scored 1-10. The score is mechanically derived from a checklist of pass/fail items per axis (axis score = round(10 × passed/total)). Average is the raw score, capped by hard gates (§3.2).

| Axis | Checklist (each pass = +1, scaled to 10) | Backing principles |
|---|---|---|
| **TDD Discipline** | (a) every new src file has a test file in same/preceding commit; (b) coverage delta on new lines ≥80% (`vitest --coverage`); (c) coverage thresholds enforced in `vitest.config.ts`; (d) Stryker mutation score on new code ≥60%; (e) tests fail when target body is replaced with no-op (verified once per axis); (f) red-green commit ordering — failing test commit precedes implementation commit OR same commit shows test-first. | Q1, Q8 |
| **Type Safety** | (a) `tsconfig.json` has `"strict": true`; (b) `noUncheckedIndexedAccess: true`; (c) zero `: any` in src/; (d) zero `as any` or `as unknown as`; (e) zero `// @ts-ignore`/`// @ts-nocheck`; (f) discriminated-union switches end with exhaustive `never`-check. | Q4 |
| **Code Health** | (a) zero functions >50 LOC (warn) / >100 LOC (error); (b) cyclomatic complexity ≤10 in every function (ESLint); (c) zero circular imports (`madge --circular`); (d) max fan-out ≤7 per module; (e) zero empty catches; (f) zero swallowed promise rejections (`@typescript-eslint/no-floating-promises`); (g) names ≥3 chars in non-trivial scope (excl. `i`, `j`, `x`, `y`); (h) zero commented-out code blocks. | Q2, Q3, Q7, Q11, Q12 |
| **Security & Dependencies** | (a) `npm audit --audit-level=high --omit=dev` clean; (b) lockfile committed; (c) zero hardcoded secrets (regex scan + `gitleaks`); (d) zero `innerHTML`/`document.write` with concatenated *user-input* taint (template literals with static/internal data are OK); (e) every new dep has a `dep:` justification line in commit body; (f) zero deps last-published >24 months and <100 weekly downloads; (g) `.env` in `.gitignore`. | Q5, Q9 |
| **Performance & Bundles** | (a) `vite build` reports gzipped bundle ≤100 KB (configurable); (b) `npx size-limit` budget enforced and clean; (c) Lighthouse mobile perf ≥75; (d) dynamic imports used for non-critical heavy modules >50 KB; (e) sourcemaps committed for prod debugging; (f) `tsc -b --noEmit` runs in build script. | Q6 |
| **Source-Level Accessibility** | (a) `eslint-plugin-jsx-a11y` (or HTML-aware equivalent) clean; (b) every interactive element is `<button>`/`<a>`/native form (no `<div onclick>`); (c) every `<img>` has `alt`; (d) every `<input>` has an associated `<label>`; (e) `aria-live` regions where dynamic content is announced; (f) `aria-modal`/`role="dialog"` on modals; (g) tab-order test exists in `tests/e2e/`. | Q10 |

The total is 6 axes × 10 = 60-point scale, normalized to 1-10. v1's "performance" and "kid-safety/content" are absorbed into Performance & Bundles and Security & Dependencies respectively (and the Visual critic now also covers rendered-output a11y, with the Quality critic covering source-level a11y — clearer separation of concerns).

### 3.2 Nine hard gates (auto-fail to ≤4)

A failure on **any** caps the score at 4. The critic must explicitly call out which gate(s) failed and provide evidence (file:line, regex match, tool output).

1. **`any`/Cast Escape Gate** (Q4). Any new `: any`, `as any`, `as unknown as`, `// @ts-ignore`, or `// @ts-nocheck` in `src/` since the previous commit on `overhaul-v2` → FAIL. Detect via `git diff HEAD^ HEAD -- src/` regex.
2. **TDD Order Gate** (Q1). New production code in `src/` lacking corresponding test coverage in the same commit (or a preceding red-test commit on the same branch) → FAIL. Test: coverage delta on new lines = 0% means the test does not exercise the new code → equivalent to "no test."
3. **Fake-Test Gate** (Q8). Stryker mutation testing on changed files reports surviving mutants on new lines whose only test is the new test → FAIL. (A test that passes when the target body is replaced with `return undefined` did not assert anything.)
4. **Hardcoded Secret Gate** (Q5, Q9). Regex match for known secret formats (`sk-[A-Za-z0-9]{20,}`, `AKIA[0-9A-Z]{16}`, `Bearer\s+[A-Za-z0-9._-]{20,}`, `password\s*=\s*["']`) in any tracked file → FAIL. Use `gitleaks detect`.
5. **XSS Injection Gate** (Q5). `innerHTML`, `outerHTML`, `document.write`, `eval(`, `new Function(`, `dangerouslySetInnerHTML` with concatenated *user-input taint* (variables originating from `localStorage`/URL params/form fields/network responses without sanitization) → FAIL. Static template literals with internal/constant data are OK and do not fire this gate.
6. **Empty Catch Gate** (Q11). Any `catch (e) { }` or `catch { }` with no body → FAIL. (Catches that return safe defaults with rationale comment are OK.)
7. **Audit Vulnerability Gate** (Q9). `npm audit --audit-level=high --omit=dev` reports any unresolved high or critical → FAIL.
8. **Complexity Gate** (Q2). ESLint rule `"complexity": ["error", 10]` reports any violation in new or modified functions → FAIL.
9. **Unjustified Dep Gate** (Q9). Diff in `package.json` adds a new runtime or dev dep, AND the commit body lacks a `dep: <name> -` justification line → FAIL.

These gates are derived from the research's B1-B12 anti-pattern list (with B12 — `<div onclick>` — folded into the Source-Level Accessibility axis as a checklist item rather than a separate gate, since modern jsx-a11y/HTML lints already block it).

### 3.3 Required measurement step

Before scoring, the critic MUST execute the following measurements. Each must be cited in the diagnostics output.

| Measurement | Tool | Pass criterion |
|---|---|---|
| Type-check | `npx tsc --noEmit` | Zero errors |
| Type-safety escapes scan | `git diff HEAD^ HEAD -- src/` regex for `: any`, `as any`, `// @ts-ignore` | Zero matches in `+` lines |
| Test pass | `npx vitest run` | All green |
| Coverage | `npx vitest run --coverage` | Lines ≥80%, branches ≥75%, new-line coverage ≥80% |
| Mutation score | `npx stryker run` (when configured) | New-code mutation ≥60% |
| Lint + complexity | `npx eslint --rule '{"complexity":["error",10]}' src/` | Clean |
| Circular deps | `npx madge --circular src/` | Zero |
| Audit | `npm audit --audit-level=high --omit=dev` | Zero unresolved high/critical |
| Bundle size | `npx vite build` then `du -k dist/assets/*.js` (or `npx size-limit`) | Within configured budget |
| Lighthouse | `npx lighthouse --only-categories=performance` | Mobile perf ≥75 |
| Secret scan | `gitleaks detect --no-git -v` | Zero findings |
| Accessibility lint | `eslint` with a11y plugin | Zero errors |

For UI-touching iterations the critic should ALSO check the source-level a11y axis (axis 6) more carefully — `eslint-plugin-jsx-a11y` is the primary tool for code-level checks; rendered-output checks live in the Visual critic.

### 3.4 Calibration anchors

| Score | What it looks like |
|---|---|
| **9-10** | Zero gate failures; every axis ≥8: TDD verified by commit ordering and coverage+mutation, strict TS with no escapes, complexity all ≤10, `npm audit` clean, `lighthouse` perf ≥85, jsx-a11y clean, Stryker mutation ≥75% on new code. |
| **7-8** | Zero gate failures; most axes ≥7. Some measurements missing or marginal (e.g. mutation testing not configured, Stryker pending). |
| **5-6** | Gates pass but measurement evidence partial: coverage configured but never invoked, audit not run, no Stryker. |
| **3-4** | Default for any iteration that fails ≥1 hard gate. |
| **1-2** | Multiple gates fire OR build is broken (failing tests, type errors, lint errors). |

A 9-10 cannot be claimed without measurements actually run and clean. v1's iter-8 9 was awarded with `"Coverage : not measured this run"` in `docs/FINAL_REPORT.md` line 52 — under v2 that pins the score at 5-6 max, regardless of how good the diff looks.

### 3.5 Output schema

Same shape as the other critics' v2 schemas.

```json
{
  "score": 4,
  "rationale": "<2-4 sentences citing principle codes Q1-Q12 and file:line/tool-output evidence>",
  "blockers": ["<gate name + evidence>", ...],
  "axisScores": {
    "tddDiscipline": 0,
    "typeSafety": 0,
    "codeHealth": 0,
    "securityDependencies": 0,
    "performanceBundles": 0,
    "sourceA11y": 0
  },
  "diagnostics": {
    "tsc": {"errors": 0},
    "typeEscapes": {"any": 0, "asAny": 0, "tsIgnore": 0},
    "vitest": {"pass": 0, "fail": 0},
    "coverage": {"lines": 0, "branches": 0, "newLineCoverage": 0},
    "mutation": {"score": 0, "tested": false},
    "eslint": {"errors": 0, "complexityViolations": 0},
    "madge": {"circular": []},
    "audit": {"high": 0, "critical": 0},
    "bundle": {"gzippedKb": 0, "budget": 0},
    "lighthouse": {"perfScore": 0, "lcpMs": 0, "inpMs": 0, "clsCount": 0},
    "gitleaks": {"findings": 0},
    "a11yLint": {"errors": 0},
    "innerHtmlSites": [{"file": "...", "line": 0, "userInputTaint": false}],
    "emptyCatches": [],
    "depDiff": {"added": [], "justified": [], "unjustified": []}
  },
  "hardGatesFailed": []
}
```

### 3.6 Tools the critic may use

- **Read, Grep, Glob** — same as v1.
- **Bash (read-only)** — `npx tsc`, `npx vitest run --coverage`, `npx stryker run`, `npx eslint`, `npx madge`, `npm audit`, `npx vite build`, `npx lighthouse`, `gitleaks detect`. Read-only in the sense of no source edits; running tests and builds is required.
- **`git diff` / `git log`** — REQUIRED for TDD ordering and dep-justification checks.
- **Iteration log** — for tracking which gates have ever cleared.

---

## 4. v2 applied to current Fart Factory state

Evaluating commit `11f58ec` on `overhaul-v2`. Source-inspection layer is complete; live tool runs are pending and flagged below.

### 4.1 Diagnostics

- **Type escapes scan** at [src/](src/): `git diff` + repo-wide grep for `: any\b`, `as any\b`, `@ts-ignore`, `@ts-nocheck` returns **zero matches** in `src/`. **Gate 1 PASSES.** Excellent.
- **`tsconfig.json`** has `"strict": true` + `noUnusedLocals: true` + `noUnusedParameters: true` + `noFallthroughCasesInSwitch: true` ([tsconfig.json:14-17](tsconfig.json:14)). Missing `noUncheckedIndexedAccess`. Type Safety axis check (b) fails; (a, c, d, e) pass. (f) — discriminated-union exhaustiveness — n/a, no discriminated unions in current src/.
- **Empty catches scan** on [src/](src/): five `catch` blocks at [src/audio/procedural.ts:13](src/audio/procedural.ts:13), [src/state/hall.ts:16](src/state/hall.ts:16), [src/state/achievements.ts:63](src/state/achievements.ts:63), [src/ui/haptics.ts:16](src/ui/haptics.ts:16), [src/ui/onboarding.ts:33](src/ui/onboarding.ts:33). All five return safe defaults (procedural.ts → null, hall.ts → empty array, achievements.ts → empty Set, haptics.ts → false, onboarding.ts → true with `// safe default — show on corrupt` comment). None are empty. **Gate 6 PASSES.**
- **`innerHTML` scan**: five sites in `src/`:
  - [src/content/commentary.ts:65](src/content/commentary.ts:65) — `el.innerHTML = set.reactions.map(r => '<span class="reaction">' + r + '</span>').join('');` — `r` originates from internal `reactionSets` array of literal emoji strings. No user-input taint.
  - [src/ui/toast.ts:22](src/ui/toast.ts:22) — `toast.innerHTML = `<span...>${a.emoji}</span>...`;` — `a.emoji`, `a.name`, `a.desc` originate from internal `ACHIEVEMENTS` array of literal strings. No user-input taint.
  - [src/ui/onboarding.ts:54](src/ui/onboarding.ts:54) — `overlay.innerHTML = ...` template — content from internal `STEPS` array. No user-input taint.
  - [src/state/hall.ts:39,43](src/state/hall.ts:39) — `el.innerHTML = '...'` static literal AND `el.innerHTML = hall.map(...)` — `hall` items are read from localStorage, but `hall.test.ts` reportedly tests "HTML escaping defense" per FINAL_REPORT line 58. The grade strings come from `gradeFart()` literals; date strings from `Date.toLocaleDateString()`. *No user-controlled input flow into these innerHTML sites.* **Gate 5 PASSES.** (Worth a follow-up: hall.ts's localStorage read should use `textContent` not `innerHTML` defensively, since localStorage is an attack surface in shared environments. Not a current finding because hall data shapes are validated via `Array.isArray` + filter.)
- **Hardcoded secrets scan**: no secret-format regex matches in tracked files. `.env` is in `.gitignore`. `ELEVENLABS_API_KEY` is referenced only in `.env.example`'s comment (no value). **Gate 4 PASSES.**
- **Lockfile**: `package-lock.json` present (123KB per earlier `ls`). Dep additions across iters cannot be audited from this single commit; pending git-log walk per axis check (e).
- **Cyclomatic complexity** in [src/main.ts](src/main.ts): the `onLaunch()` function at [src/main.ts:67-167](src/main.ts:67) is ~100 LOC with linear flow + a few `if` branches (3-4 conditional). Likely cyclomatic complexity ≤8. The other functions (`gradeFart`, `addToHall`, `playFart`, `evaluateLaunch`, `reduceCombo`) are short and structured. Pending ESLint run for definitive answer; **Gate 8 LIKELY PASSES** by inspection.
- **Coverage**: `vitest.config.ts` configures `coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/**/*.ts'] }` ([vitest.config.ts](vitest.config.ts)) but no thresholds and `--coverage` was never invoked in the autonomous run (per `docs/FINAL_REPORT.md` line 52). Coverage data does not exist. Axis check (b) and (c) on TDD Discipline both fail.
- **Mutation testing**: Stryker not configured (`devDependencies` does not include `@stryker-mutator/core`). **Gate 3 cannot fire** (Stryker not installed), but axis check (d) fails — no mutation evidence.
- **TDD ordering**: per `docs/iteration-log.md` Notes section, Iter 2 has an explicit RED demonstration logged. Iters 5+ ship test files alongside src changes per `git log --stat`. Spot-check: iter 5 commit `c88d11b` adds `tests/e2e/particles.spec.ts` AND `src/visuals/particles.ts` AND `src/main.ts` change in same commit — same-commit pattern, not test-first separate commit. Per CLAUDE.md RULE 1's strict reading, "failing test FIRST, see it fail, then write code, see it pass" requires a sequence of *runs*, not a sequence of commits. The iteration-log notes "RED demonstration" for iter 2 (run, saw fail, reverted) but later iters do not document the same explicit run-first sequence. Axis check (a) passes; (f) is partial. **Gate 2 ambiguous** — needs git-log walk + coverage delta. Source-state evidence does not show any `src/` file lacking *any* test reference; pending coverage delta.
- **`npm audit`**: not run in the autonomous session per FINAL_REPORT. Pending live invocation. **Gate 7 unverified.**
- **Bundle size**: `vite.config.ts` outputs to `dist/` with sourcemaps. No `size-limit` config. Pending live `vite build`. Axis check (a, b) unverified.
- **a11y source lint**: no `eslint-plugin-jsx-a11y` (or HTML equivalent) in devDependencies. Several manual a11y checks visible in `index.html` (`role="group"`, `aria-label` on every input, `aria-live` regions, `role="dialog" aria-modal`) and `src/main.ts` (`aria-live` text setting at line 122). Looks clean by source inspection; no automated tool runs.
- **Module structure** in [src/](src/): 9 files across 6 subdirectories (`audio/`, `content/`, `scoring/`, `state/`, `ui/`, `visuals/`). Each ≤200 LOC, single responsibility per module. Naming consistent (`gradeFart`, `addToHall`, `playFart`, `triggerHaptic`, `showAchievementToast`). No circular deps observable from imports. Pending `madge --circular`.
- **Comments**: spot inspection shows minimal commenting; existing comments include `// safe default — show on corrupt` ([src/ui/onboarding.ts](src/ui/onboarding.ts)) which is a "why" comment. No commented-out code blocks. Aligns with user's CLAUDE.md "default to writing no comments." Axis check (h) **PASSES**.

### 4.2 Per-axis scores

- **TDD Discipline: 5.** Tests exist for nearly all features (79/79 unit + 41/41 desktop e2e per FINAL_REPORT). But (b) coverage delta unmeasured, (c) thresholds not enforced, (d) mutation not configured, (f) red-green run-first ordering not documented per-iter except iter 2. Awarded for (a) test-files-exist, (e) test-fail demonstration, partial credit only.
- **Type Safety: 8.** Strict mode + zero escapes in src/ — outstanding. One missing knob (`noUncheckedIndexedAccess`) keeps it from 9-10. No discriminated unions to test exhaustiveness on, so (f) is n/a.
- **Code Health: 8.** Modules small, names clear, no empty catches, no circular deps observable, no commented-out code. `onLaunch` at ~100 LOC is borderline for (a) `>50 LOC warn`; complexity unmeasured but likely ≤10. Catch blocks return safe defaults with rationale where non-obvious. Strong overall.
- **Security & Dependencies: 6.** No hardcoded secrets, .env gitignored, innerHTML uses are user-input-free. But (a) `npm audit` not invoked, (b) lockfile present ✓, (e) per-iter dep justification not verified, (f) abandonware check not run. Defensive coding is good but measurements missing.
- **Performance & Bundles: 4.** No size-limit config, no Lighthouse run, no bundle measurement. The build script does run `tsc -b --noEmit` first ✓. The setup is reasonable but unmeasured.
- **Source-Level Accessibility: 7.** Manual a11y patterns are correct (ARIA, semantic elements, modal patterns), but no automated lint. The visual critic also covers rendered-output a11y; this axis specifically scores source-level. No `<div onclick>` in src/ ✓. ESLint a11y plugin missing.

Average: (5+8+8+6+4+7)/6 = 38/6 = **6.33**.

### 4.3 Verdict

- **Hard gates failed**: zero from source inspection. Several gates are *unverified* due to missing measurements (Gate 2 TDD ordering pending coverage delta; Gate 3 Fake-Test pending Stryker; Gate 7 Audit pending `npm audit`; Gate 8 Complexity pending ESLint).
- **v2 score: 6** (raw 6.33; would be 7-8 with measurements run and clean).
- **v1 score on the same artifact: 9** (iter 8). Delta: **−3**.

The v1→v2 delta of -3 is the proof v2 is calibrated higher. v1 awarded 9 with no coverage data, no audit, no mutation testing, no bundle measurement, no a11y lint. v2 caps at 6-7 until those measurements run, regardless of how clean the source looks.

### 4.4 Blockers (must address before quality ≥ 8)

1. **Run coverage on every iteration.** Add `"test:cov": "vitest run --coverage --coverage.thresholds.lines=80 --coverage.thresholds.branches=75"` to `package.json`. Run it as part of the orchestrator's step 4 ("Run full suite"). Closes TDD Discipline axis checks (b, c).
2. **Configure Stryker.** `npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner`. Stryker config targeting changed files only (`mutate: ["src/**/*.ts"]`). Threshold: ≥60% on new code. Closes axis check (d) and gate 3 measurement.
3. **Add `npm audit` to the orchestrator's step 4 alongside test runs.** `npm audit --audit-level=high --omit=dev`. Closes gate 7 measurement.
4. **Add `eslint` with `complexity` rule and a11y plugin.** `npm i -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-jsx-a11y` (or HTML equivalent for non-JSX projects). Run as part of pre-commit. Closes gate 8 measurement and Source-Level Accessibility axis check (a).
5. **Add `size-limit` and a Lighthouse-CI hook.** `npm i -D size-limit @size-limit/preset-app`; declare a 100KB gzipped JS budget. Add a Lighthouse run for mobile perf. Closes Performance & Bundles axis.
6. **Document `dep:` justification convention.** Update `docs/PLAN.md` §G commit-message template to require `dep: <name> - <reason>` lines on dep-adding commits. Then enforce with a pre-push hook or commit-msg hook. Closes gate 9 enforcement.
7. **(Minor)** Add `noUncheckedIndexedAccess: true` to `tsconfig.json` for axis check (b) on Type Safety. May surface a few index-access nullability warnings to fix.

These seven items, addressed together, would move quality from v2-score 6 to v2-score 8-9 by substantiating each axis with measurements *and* tightening the gates' enforcement.

---

## 5. Migration into PLAN.md

Replace PLAN.md §F's six-line "Quality critic" block with:

```markdown
### Quality critic

Full rubric: [docs/QUALITY_CRITIC.md](QUALITY_CRITIC.md). v2 evolves v1 with six mechanism-level axes derived from per-axis checklists, nine hard gates (incl. NEW TDD Order, Fake-Test, XSS Injection, Audit, Complexity, Unjustified Dep), and a required tools-run measurement step (vitest --coverage, Stryker, ESLint, madge, npm audit, vite build, lighthouse, gitleaks).

- **Axes (6, each 1-10 derived from checklists):** TDD Discipline, Type Safety, Code Health, Security & Dependencies, Performance & Bundles, Source-Level Accessibility.
- **Hard gates (9, any failure caps score at 4):** any/Cast Escape, TDD Order, Fake-Test (Stryker), Hardcoded Secret, XSS Injection (with user-input taint), Empty Catch, Audit Vulnerability, Complexity (>10), Unjustified Dep.
- **Required measurements:** `tsc --noEmit`, `vitest --coverage` (new-line ≥80%), Stryker mutation (≥60% on new code), ESLint with complexity rule, `madge --circular`, `npm audit --audit-level=high`, `vite build` size, `lighthouse` mobile perf, `gitleaks detect`, jsx-a11y (or HTML a11y) lint.
- **Output schema:** `{score, rationale, blockers, axisScores, diagnostics, hardGatesFailed}` — see QUALITY_CRITIC.md §3.5.
- **Tools:** Read, Grep, Glob, Bash (REQUIRED — runs the measurement battery), `git diff`/`git log` (REQUIRED for TDD ordering + dep-justification).
```

Orchestrator parsing in PLAN.md §F lines 376-385 needs **no change**.

---

## 6. Verification

| Scenario | v1 verdict | v2 expected verdict |
|---|---|---|
| Current Fart Factory @ `11f58ec` (autonomous-session HEAD) | quality=9 (iter 8) | **quality=6 by source inspection alone; capped without coverage/audit/mutation/lint measurements; could reach 8-9 with all 7 §4.4 items addressed** |
| Same code with `noUncheckedIndexedAccess` enabled + measurements run clean | (no change) | quality=8-9 |
| Same code with a new `: any` introduced | could pass v1 if other code looked fine | **quality ≤4** (gate 1 fires) |
| Same code with a new dep added without `dep:` justification | could pass v1 | **quality ≤4** (gate 9 fires) |
| Same code with `npm audit --audit-level=high` showing 1 high vuln | could pass v1 (not measured) | **quality ≤4** (gate 7 fires) |
| Pure cosmetic-only iteration (no src changes) | could score 9 in v1 trivially | **quality assessed only on diff lint/types/etc.; n/a for axes that need src changes — score reflects what changed** |

§4 above is the executed verification of row 1. The v1 vs v2 delta of -3 reflects that Quality v1 had vague axes that allowed reviewers to give 9s without measurements; v2 requires measurements for high scores.

---

## 7. What v2 deliberately does not change

- The orchestrator loop / critic-spawning / JSON-parse retry at PLAN.md §E and §F lines 376-385.
- The Fun, Audio, Visual critics — all four are now redesigned to v2/v3.
- The 4-critic averaging math.
- The split of concerns: Quality critic checks source-level a11y; Visual critic checks rendered-output a11y. Together they cover WCAG end-to-end.

---

## 8. Open follow-ups

- The §4.4 #1-7 items are the bulk of the quality-tooling gap; ship them in a single iteration ("tier-Q.1: Quality measurement battery") before the next feature work, so subsequent iterations can be scored under the new rubric immediately.
- Consider a "regression test for the rubric itself": commit a small known-bad branch (with a deliberate `: any` and a deliberate empty catch) and verify the Quality critic produces score ≤4 with the right blockers. Same approach as `FUN_CRITIC.md` §6 verification table.
- Long-term: integrate the orchestrator with a pre-commit hook that runs the §3.3 measurement battery automatically — moves quality enforcement from critic-time (post-implementation) to commit-time (pre-implementation), aligning with the user's CLAUDE.md "test-first" RULE 1.
