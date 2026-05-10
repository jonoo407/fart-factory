# Fart Factory — Multi-Hour Autonomous Overhaul Plan

## Context

**What's being changed:** the game at `E:\app_design\fart-factory\index.html` (one 401-line static HTML file, deployed at https://jonoo407.github.io/fart-factory/). It's a slider-driven procedural-audio fart generator with grading, witty commentary, gas-cloud animation, and a top-5 localStorage leaderboard. Solid foundation; very little polish; no tests; no build; no a11y.

**Why now:** the user wants to stress-test Claude Code on a 1-2 hour autonomous self-orchestrating run that takes the game from "novelty" to "vastly improved kids' game" with multi-agent quality gates. This plan defines the architecture, the iteration loop, the critic rubrics, and the launch procedure so the user can paste a kickoff prompt into a fresh Claude Code session and walk away.

**Outcome:** a green `overhaul-v2` branch on the user's local repo and on `origin`, with a working Vite + TS + Vitest + Playwright project, a 30+ ElevenLabs-generated SFX library, real visuals/gamification/a11y, characterization tests locking the original behavior, a `docs/iteration-log.md` showing every iteration's critic scores, and a `docs/FINAL_REPORT.md` summarizing what shipped. **No merge to `main`. No GH Pages redeploy.** The user reviews and merges manually.

---

## User-confirmed forks (decided)

1. **Run host:** local long-running Claude Code session on the user's Windows 11 machine. Not Anthropic remote agents.
2. **Stack:** Vite + TypeScript + Vitest + Playwright. Build outputs to `dist/`, deployable to GH Pages.
3. **Assets:** anything goes; ElevenLabs API key is provided for SFX generation. Procedural Web Audio still in play for overlays.
4. **Stop rule:** `(elapsed > 60min AND quality target hit) OR elapsed = 120min` — whichever first.

---

## Non-negotiable rules (from user-global CLAUDE.md)

- **RULE 1 — RED-GREEN TDD always.** Failing test FIRST, see it fail, then write code, see it pass, then commit. No exceptions, including "small change", "UI is hard", "I'm in a hurry". The orchestrator must enforce this every iteration.
- **RULE 2 — Verify, don't assume.** Before asserting any fact about state, check directly. Especially relevant: the ElevenLabs endpoint shape — verify with current docs / a dry-run before bulk generation.
- **RULE 3 — Verify behavior, not just data shape.** Tests-pass + file-deploys ≠ feature-works. Every UI iteration must include a Preview MCP or Playwright check at mobile (375×667), tablet (768×1024), desktop (1440×900) viewports.

---

## A. Project scaffolding

### Pre-flight (user runs once before launching the autonomous session)

```powershell
cd E:\app_design\fart-factory
git status                              # must be clean (currently is — fresh clone)
git checkout -b overhaul-v2
Copy-Item .env.example .env -ErrorAction SilentlyContinue   # if not present, agent creates .env.example first
notepad .env                            # paste ELEVENLABS_API_KEY=sk_...
node --version                          # >= 20 expected
npm --version                           # >= 10 expected
```

### Scaffolding commands the agent runs in Tier 0

```powershell
npm create vite@latest . -- --template vanilla-ts   # answer "ignore existing files"
npm i
npm i -D vitest @vitest/ui jsdom @vitest/coverage-v8
npm i -D @playwright/test
npx playwright install chromium
npm i -D cross-env dotenv tsx
git mv index.html legacy/index.legacy.html
```

The legacy file is preserved so characterization tests can drive it via `file://` and lock its current behavior before any rewrite.

### Final directory layout

```
E:\app_design\fart-factory\
├─ index.html                  # Vite entry (replaces the legacy monolith)
├─ vite.config.ts              # base: '/fart-factory/', outDir: 'dist'
├─ vitest.config.ts            # jsdom env
├─ playwright.config.ts        # 3 viewports, screenshot baselines
├─ tsconfig.json
├─ package.json
├─ .env                        # gitignored
├─ .env.example                # committed
├─ .gitignore                  # adds .env, dist/, test-results/, .session/
├─ legacy/index.legacy.html    # frozen original
├─ src/
│  ├─ main.ts
│  ├─ ui/      (sliders, results, hall, reactions, live-region)
│  ├─ audio/   (engine, procedural, sample-player, mixer, types)
│  ├─ scoring/ (grade, scores, combos)
│  ├─ state/   (hall, achievements, settings)
│  ├─ visuals/ (gas-cloud, particles, mascot, shake)
│  └─ content/ (commentary, reactions)
├─ public/
│  ├─ sfx/manifest.json + *.mp3
│  └─ favicon.svg
├─ tests/
│  ├─ unit/    (grade, scores, hall, manifest-schema, audio-procedural, combos)
│  ├─ e2e/     (characterization, launch-flow, a11y, visual, particles, ...)
│  └─ helpers/audio-stub.ts
├─ scripts/
│  ├─ generate-sfx.ts           # ElevenLabs pipeline
│  ├─ verify-manifest.ts
│  └─ session-clock.ts
├─ docs/
│  ├─ PLAN.md                   # this plan, copied in
│  ├─ iteration-log.md          # appended each iteration
│  ├─ ARCHITECTURE.md
│  ├─ KID_SAFETY.md
│  └─ FINAL_REPORT.md           # written at stop
└─ .session/                    # gitignored, runtime state
   ├─ start.txt                 # ISO timestamp
   └─ critic-streak.json        # last 2 iteration averages
```

### `.env` strategy

`ELEVENLABS_API_KEY` is read **only** by `scripts/generate-sfx.ts` via `dotenv.config()`. Never `import.meta.env.VITE_*` — that bundles into client code. mp3 files in `public/sfx/` are static; the runtime never sees the key.

### GH Pages deploy stays manual

`vite.config.ts` sets `base: '/fart-factory/'`. A `.github/workflows/deploy.yml` builds and publishes `dist/` to `gh-pages` **on push to `main` only**. The autonomous run pushes `overhaul-v2`, never `main`, so deploy never auto-fires.

### Migration sequence (Tier 0 only — three iterations)

1. **Lock with characterization tests.** Playwright drives `legacy/index.legacy.html`, asserts the 10 lock-points in §B.
2. **Translate, don't rewrite.** Cut+paste functions from the script tag into typed modules. No logic changes. Tests must still pass.
3. **Refactor under green.** Only after the new build matches do we touch logic. Grade table and noise constants stay byte-identical until a feature explicitly changes them.

---

## B. Test strategy (RULE 1 compliance)

### What gets a Vitest unit test (jsdom)

- `gradeFart(total)` — every threshold boundary (9 grades).
- `impressiveness`, `soundQuality`, `durScore` — clamp to ≤10.
- `addToHall` — keeps top 5, sorts desc, survives corrupt JSON.
- `manifest.json` schema — `{id, name, prompt, file, durationMs, checksum}`, ids unique.
- Combo state machine (Tier 4) — pure reducer.
- `playFart` under stubbed `AudioContext` — expected duration, node count per slider config.

### What gets a Playwright E2E

- Click `#launchBtn` → `#results` visible, `#grade` matches `/^(F-|D|C\+?|B\+?|A\+?|S\+)$/`.
- ARIA: `[aria-live="polite"]` announces grade within 2s.
- Visual: screenshots at 375×667 / 768×1024 / 1440×900, baselines in `tests/e2e/__snapshots__/`.
- Settings: Mute → Launch produces silent audio (`window.__audioStats.lastSampleRMS ≈ 0`).
- Hall of Shame survives reload.

### Concrete failing-test example — "particles on S+"

Before any particle code exists, write `tests/e2e/particles.spec.ts`:

```ts
test('S+ grade spawns at least 20 sparkle particles', async ({ page }) => {
  await page.goto('/');
  for (const id of ['s1','s2','s3','s4','s5','s6']) {
    await page.locator(`#${id}`).fill('10');
  }
  await page.click('#launchBtn');
  const count = await page.locator('.sparkle').count();
  expect(count).toBeGreaterThanOrEqual(20);
});
```

Run `npx playwright test particles.spec.ts` → fails (`.sparkle` doesn't exist). **Now** implement `visuals/particles.ts`, re-run → green. Commit.

### Audio testing

- **Procedural:** custom `AudioContext` stub records every node creation. Assert non-empty buffer, distinct durations per length value, no `NaN` frequencies.
- **Manifest:** `tests/unit/manifest-schema.test.ts` walks every entry; `fs.statSync(path).size > 0`; checksum matches.
- **Variety:** ≥20 entries, ≥10 unique durations bucketed to nearest 100ms, no two prompts identical.

### 10 characterization assertions (Tier 0, lock the legacy)

Run against `legacy/index.legacy.html`, then against the new `index.html` after migration. Both must pass identically.

1. All sliders default to `5`; total starting score is 30.
2. Click Launch with all sliders at 5 → grade is `B` or `B+`.
3. All sliders at 10 → grade is `S+`, `#grade` color `#ff0000`.
4. All sliders at 1 → grade is `F-`.
5. After Launch, `#results` has `display: block`.
6. `#sc1` text matches `/^\d+\/10 ⭐+$/`.
7. `#stinkFill` width equals `(100 - stink*10)%`.
8. After 6 launches, Hall of Shame has exactly 5 entries (top sorted).
9. `#commentary` is non-empty within 1s of click.
10. Total ≥ 41 applies a `shake` animation to `body`.

---

## C. ElevenLabs SFX pipeline

### Endpoint (verify at script-write time)

The agent **must verify** the current ElevenLabs Sound Effects endpoint shape against the live docs before bulk generation (RULE 2). Expected: `POST /v1/sound-generation` (or `/v1/text-to-sound-effects`) with header `xi-api-key`, JSON body `{ text, duration_seconds, prompt_influence }`, response `audio/mpeg`. The agent does **one** dry-run call with a single seed first, confirms 200 + non-empty mp3, then proceeds.

### `scripts/generate-sfx.ts` (sketch)

```ts
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SEEDS } from './sfx-seeds';

const KEY = process.env.ELEVENLABS_API_KEY!;
const HARD_CAP = 200;                    // spend ceiling per run
const OUT = resolve('public/sfx');
let calls = 0;

for (const seed of SEEDS) {
  const checksum = createHash('sha256')
    .update(`${seed.prompt}|${seed.duration_seconds}|v1`)
    .digest('hex').slice(0, 12);
  const file = resolve(OUT, `${seed.id}.mp3`);
  if (await exists(file) && (await readManifest())[seed.id]?.checksum === checksum) continue;
  if (++calls > HARD_CAP) throw new Error('SFX budget exhausted');
  const res = await fetch('<verified endpoint>', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: seed.prompt, duration_seconds: seed.duration_seconds, prompt_influence: 0.7 }),
  });
  if (!res.ok) { console.warn(`skip ${seed.id}: ${res.status}`); continue; }
  await mkdir(OUT, { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  upsertManifest({ ...seed, checksum, file: `sfx/${seed.id}.mp3` });
}
```

### Seed list (30+)

`squeaky-mouse, wet-ripper, dry-trumpet, machine-gun, splat-puddle, ghost-whoosh, balloon-deflate, motorboat, kazoo-honk, train-whistle, bubbling-pot, cartoon-boing, sad-trombone, victory-fanfare, tuba-burp, whoopee-cushion-classic, helium-squeak, low-rumble-thunder, staccato-pops, rubber-duck, record-scratch, kettle-steam, champagne-pop, paper-tear, flute-trill, tiny-mouse-toot, dragon-roar-soft, bicycle-horn, door-creak, bubblewrap-burst, fizz-soda, crowd-gasp, kid-giggle-tag, applause-tag, boing-spring`.

Each seed: `{ id, prompt, duration_seconds: 1.5–3.0, tags: ['wet'|'dry'|'short'|'long'|'musical'|'tag-line'] }`. Tags drive runtime selection.

### Cost containment

- Checksum cache (above) — unchanged seed = zero API call.
- `HARD_CAP = 200` hard-throws.
- Generation runs **only** via `npm run sfx:generate`. Never on `dev`/`build`/CI.
- 4xx/429 downgrades gracefully: skip seed, manifest marks `procedural-fallback: true`, runtime substitutes procedural synthesis.

### Runtime audio architecture

```
slider values → classifyFartType() → FartType ('wet'|'dry'|'musical'|'epic'|'tiny')
                                           ↓
                                    pickSfx(type, tags) → SfxManifestEntry
                                           ↓
                            sample-player decodes mp3 buffer
                            playbackRate = 0.7 + temp*0.04 + (10-length)*0.03  (clamped 0.6–1.6)
                            detune = f(musical)
                                           ↓
                  + procedural overlays (squeak resonance, sputter tail) from procedural.ts
                                           ↓
                                    master gain → destination
```

### Kid-safety

All prompts are static, in `scripts/sfx-seeds.ts`. **No runtime user-supplied prompts ever sent.** `docs/KID_SAFETY.md` documents the allowlist with rationale. Audio critic can flag a seed for removal.

---

## D. Feature backlog (foundation-first, 25 items)

Each item: ETA / failing test / verification.

### Tier 0 — scaffolding & lockdown
1. **Vite/TS/Vitest/Playwright init** (15m). Test: `npm test` exits non-zero with no tests. Verify: `npm test` green with one trivial test.
2. **Characterization E2E suite** (25m). Test: 10 assertions in §B against `legacy/index.legacy.html`. Verify: all 10 green.
3. **Module migration scaffold** (20m). Test: characterization runs against new build. Verify: `npm run build && npx http-server dist`, all 10 green.

### Tier 1 — test infra & types
4. **AudioContext stub for unit tests** (15m). Test: `playFart()` under jsdom throws. Verify: stub records 4 oscillators for default sliders.
5. **Hall schema validation + corruption recovery** (10m). Test: `{"x":"bad"}` in localStorage crashes render. Verify: renders empty hall, no throw.
6. **ARIA live region** (10m). Test: no `aria-live` element exists. Verify: grade announced within 2s.

### Tier 2 — audio variety
7. **SFX manifest pipeline + 5 starter sounds** (30m). Test: `manifest.json` doesn't exist. Verify: 5 mp3s play in browser, schema test green.
8. **Sample player + procedural mixer** (25m). Test: clicking Launch never decodes a mp3. Verify: network panel shows mp3 fetch, audio plays.
9. **Full 30+ SFX library** (20m, mostly waiting on API). Test: manifest <20 entries. Verify: 30+ entries, all >0 bytes.
10. **Mute toggle + persisted setting** (10m). Test: no `#muteBtn`. Verify: mute survives reload.

### Tier 3 — visuals
11. **Sparkle particles on S+** (15m). Test: §B example. Verify: 20+ `.sparkle` nodes at S+.
12. **Animated mascot reaction** (20m). Test: no `#mascot` element. Verify: mascot face changes by grade tier.
13. **Reduce-motion respect** (10m). Test: `prefers-reduced-motion` ignored. Verify: shake/particles suppressed when set.
14. **Refreshed palette + non-Comic-Sans option** (15m). Test: only one font-family in computed style. Verify: settings toggles `kid` vs `silly` palette.

### Tier 4 — gamification
15. **Combo streak counter** (20m). Test: 3 A+ in a row does nothing. Verify: combo banner appears at streak ≥3.
16. **Achievements (10 badges)** (25m). Test: localStorage `achievements` undefined. Verify: badge unlocks on first S+, persists.
17. **Daily challenge (seeded sliders)** (20m). Test: identical date → different challenge. Verify: today's challenge byte-stable across reloads.
18. **Boss-fight: Stink-O-Meter** (25m). Test: no boss UI. Verify: 5 consecutive A+ triggers boss; beating it unlocks confetti.

### Tier 5 — polish & inclusivity
19. **Share/export card (PNG via canvas)** (20m). Test: no `#shareBtn`. Verify: download triggers, PNG decodes.
20. **Onboarding tutorial (3 steps)** (15m). Test: first-visit user sees no help. Verify: tutorial appears once, dismissible.
21. **Mobile haptics on Launch** (10m). Test: no `navigator.vibrate` call. Verify: feature-detected, no throw on desktop.
22. **Keyboard navigation + visible focus rings** (15m). Test: tab order broken. Verify: every control reachable in ≤8 tabs.

### Tier 6 — hardening
23. **Error boundary + offline-tolerant SFX** (15m). Test: blocking mp3 fetch crashes audio. Verify: falls back to procedural.
24. **README + KID_SAFETY.md + ARCHITECTURE.md** (15m). Test: docs missing. Verify: pages exist, README links work.
25. **Axe-style a11y check via Playwright** (15m). Test: contrast violations. Verify: 0 critical axe issues at 3 viewports.

Total ETA if every item shipped: ~7h. The 2h cap and quality target ensure we won't reach all 25 — by design, highest-value items ship first.

---

## E. Iteration loop architecture

Orchestrator = the main Claude Code session at `E:\app_design\fart-factory`. State in `.session/`. **Per iteration:**

1. **Pick item.** Read `docs/iteration-log.md` last entry, advance to next backlog item, considering deadline mode (step 8).
2. **Write failing test.** Create the spec file referenced in the backlog. Run `npm test` (or `npx playwright test <file>`). Capture stderr; assert it contains a failure for the new test specifically. **If it accidentally passes, the test is wrong** — abort iteration, rewrite test, retry.
3. **Implement minimal code.** Only enough to flip that test green. No drive-by refactors.
4. **Run full suite.** `npm test && npx playwright test`. Both green.
5. **Spawn 4 critics in parallel.** One assistant turn with four `Agent` tool calls (subagent_type: `general-purpose`). Each receives `git diff HEAD`, `docs/iteration-log.md`, screenshot dir, manifest snapshot.
6. **Aggregate.** Parse each critic's `{score, rationale, blockers}`. Decide:
   - Any critic <6 OR any non-empty `blockers` → spawn one fix-up subtask through TDD (regression test for blocker, fix, re-run all + critics).
   - All ≥6 → commit on `overhaul-v2`, message body contains four scores.
   - All ≥8 AND prior iteration also all ≥8 AND elapsed > 60min → set `quality_target_hit = true`.
7. **Append `docs/iteration-log.md`** — feature, test names, all four scores, commit SHA, elapsed minutes.
8. **Decide loop continuation:**
   - `elapsed >= 120min` → STOP, write FINAL_REPORT.
   - `elapsed >= 60min AND quality_target_hit` → STOP.
   - `elapsed >= 105min` (last 15min) → **Deadline Mode**: only Tier 5 polish items with ETA ≤10min, and Tier 6 docs. No new features, no API calls.
   - Otherwise: continue from step 1.

### Critic prompt skeleton (role-filled per critic)

```
You are the {ROLE} critic for a kids' fart-themed web game.
Iteration: {N}. Feature shipped: {FEATURE}.

Inputs you may read (read-only tools only):
- git diff: {DIFF_PATH}
- iteration log: docs/iteration-log.md
- {ROLE_SPECIFIC_INPUTS}

Score the feature on a 1-10 scale across the axes below. Be specific and
cite file:line in rationales.

Axes: {AXES}

Return ONLY a single JSON object on the last line:
{"score": <int 1-10>, "rationale": "<2-4 sentences>", "blockers": [<strings>]}

A "blocker" is something that MUST be fixed before commit (a11y violation,
crash, content-safety issue, broken test). Cosmetic complaints are NOT blockers.
```

Orchestrator parses last line, `JSON.parse`. Malformed → re-prompt once: "Your previous output was not valid JSON. Return ONLY the JSON object." Still malformed → score = 5, rationale = "critic output unparseable".

---

## F. Critic rubrics

### Quality critic
- **Axes:** readability, modularity, accessibility, performance, kid-safety/content (each 1-10, final = average).
- **Inputs:** `git diff HEAD`, changed files in full, `tests/` for the iteration.
- **Tools:** Read, Grep, Glob, Bash (read-only).
- **Penalize:** DOM string-concat with user input, new `any` types, tests passing without exercising new code, commented-out code, hard-coded API keys.
- **Reward:** small focused modules, named constants, JSDoc on public APIs.

### Fun critic

Full rubric: [docs/FUN_CRITIC.md](FUN_CRITIC.md). The v1 rubric here certified the autonomous-session game as "high quality" while max-all-sliders was still the dominant strategy; v2 is stricter so degenerate gameplay can no longer pass.

- **Axes:** Decision Quality, Skill Curve, Game Feel, Failure & Recovery, Variation & Replay (each 1-10, average is the raw score).
- **Hard gates** (any failure caps score at 4): Dominant Strategy, Bushnell Floor=Ceiling, Decision Drought, Feedback Density, No-Failure (without sandbox declaration), Kid-Safety.
- **Required simulation:** four scenarios (Mash-max, Mash-min, Median, Domain-skill) before scoring. Critic must report each scenario's outcome.
- **Schell Lens #39:** the four lens questions (especially "Are there dominant strategies?") must be answered verbatim per iteration.
- **Output schema:** `{score, rationale, blockers, diagnostics, hardGatesFailed}` — see FUN_CRITIC.md §3.6. Orchestrator's existing parsing below still reads `.score` and `.blockers`; new fields are additive.
- **Tools:** Read, Grep, Glob, Bash (read-only), Playwright (required for simulation when the iteration touches game logic, UI, or scoring).

### Visual critic
- **Inputs:** Playwright screenshots at 375×667, 768×1024, 1440×900 (taken in step 4 to `tests/e2e/__snapshots__/iter-N-{vp}.png`), changed CSS, animation code.
- **Axes:** readability (contrast, text size), polish (alignment, spacing), implied animation smoothness, kid-vibes.
- **Tools:** Read, Glob, image-viewing on screenshot files.
- **Hard blocker:** text under 14px on mobile, clipped elements, contrast failing AA, layout-thrashing keyframes (`width`/`height`/`top`/`left` animated instead of `transform`).

### Audio critic
- **Inputs:** `public/sfx/manifest.json`, changed audio source files, `tests/unit/audio-procedural.test.ts` output.
- **Axes:** variety (unique durations & checksums), distinctiveness (no two prompts collapse to similar text), crash safety (every code path either plays or no-ops cleanly), mute & hidden-tab handling (`document.visibilityState === 'hidden'` should suspend ctx).
- **Tools:** Read, Grep, Bash (read-only).
- **Hard blocker:** unhandled `audioCtx === null`, unhandled decode failure, mute mid-fart not stopping, no visibilitychange handler.

### Orchestrator parsing logic

```ts
interface CriticResult { score: number; rationale: string; blockers: string[] }
const results = await Promise.all(critics);
const allBlockers = results.flatMap(r => r.blockers);
const min = Math.min(...results.map(r => r.score));
const avg = results.reduce((a, r) => a + r.score, 0) / 4;
if (allBlockers.length || min < 6) return 'fixup';
if (avg >= 8 && previousAvg >= 8 && elapsedMin > 60) return 'qualityHit';
return 'commit';
```

---

## G. Branch & commit strategy

- New branch `overhaul-v2` cut from `main` in pre-flight.
- One commit per passing iteration. Body:

```
feat(tier-N): <feature name>

Tests:
- tests/<unit|e2e>/<file>.test.ts

Critic scores: quality=8 fun=9 visual=7 audio=8 (avg 8.0)
Iteration: 7  Elapsed: 47m

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- `git push origin overhaul-v2` after each green iteration (lets user monitor live).
- **Never** push to `main`. **Never** trigger GH Pages workflow.
- At session end: `git tag overhaul-v2-final` for rollback reference.

### Settings.json safety rails

Project-local `.claude/settings.json` should:
- **Allow** (no prompt): `Bash(npm:*)`, `Bash(npx:*)`, `Bash(git status)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`, `Bash(git commit:*)`, `Bash(git push origin overhaul-v2)`, `Bash(git checkout:*)`, `Bash(git tag:*)`, `Bash(node:*)`, Read/Write/Edit on `E:/app_design/fart-factory/**`, Playwright/Preview MCP tools.
- **Deny outright:** `Bash(git push origin main)`, `Bash(git push --force:*)`, `Bash(git reset --hard:*)`, anything touching `~/.aws`, `~/.ssh`, `C:\Windows\System32\**`.

User can apply these via the `update-config` skill or `fewer-permission-prompts` skill before launch.

---

## H. Launch instructions

### Step 1: pre-flight (user, ~5 min)

```powershell
cd E:\app_design\fart-factory
git status                              # clean
git checkout -b overhaul-v2
notepad .env                            # paste ELEVENLABS_API_KEY=sk_...
node --version ; npm --version          # >=20, >=10
```

Then user copies this plan file to `docs/PLAN.md` (agent will create `docs/` if missing — but copy is so the agent has it from turn 1):

```powershell
mkdir docs -ErrorAction SilentlyContinue
Copy-Item C:\Users\flahe\.claude\plans\okay-now-i-want-robust-castle.md docs\PLAN.md
```

### Step 2: open a fresh Claude Code session at `E:\app_design\fart-factory`

In a new PowerShell:
```powershell
cd E:\app_design\fart-factory
claude
```

### Step 3: paste the kickoff prompt

> You are running the Fart Factory overhaul autonomous session. Read `docs/PLAN.md` (the full plan) and `docs/iteration-log.md` (create if missing) and follow the iteration loop in §E exactly.
>
> Strict rules:
> 1. RED-GREEN TDD always — failing test FIRST, see it fail, then code, see it pass, then commit. No exceptions.
> 2. Verify behavior in a real browser (Preview MCP or Playwright) before claiming any UI feature done.
> 3. Commit to `overhaul-v2` only — never `main`. Push after each green iteration.
> 4. Stop when (elapsed > 60min AND quality target hit per §I) OR elapsed = 120min, whichever first. Then write `docs/FINAL_REPORT.md` and stop.
> 5. Last 15min before deadline: Deadline Mode — small polish only, no new features, no API calls.
> 6. Spawn 4 critics in parallel each iteration; respect their blockers.
> 7. Verify ElevenLabs endpoint shape with a single dry-run before bulk generation (RULE 2).
> 8. Run `/compact` if context exceeds 70%.
>
> Begin by recording start timestamp to `.session/start.txt`, creating `.gitignore` for `.env` + `dist/` + `.session/`, then start at Tier 0 item 1.

### Step 4: walk away

Optionally peek at `docs/iteration-log.md` and `git log overhaul-v2 --oneline` to monitor progress.

---

## I. Stop conditions & final report

### Wall-clock tracking

`.session/start.txt` written at session start with `new Date().toISOString()`. Every step 8 reads it, computes `elapsedMin = (Date.now() - parse(start)) / 60000`. Persists across compactions.

### "Quality target hit" — precise definition

```
quality_hit = (
  iterationsCompleted >= 2 AND
  last_iteration.criticAvg >= 8 AND
  prev_iteration.criticAvg >= 8 AND
  no_blockers_in_either AND
  elapsedMin > 60
)
```

The two-iteration window prevents a single lucky high-score from ending the run early.

### `docs/FINAL_REPORT.md` template

```md
# Fart Factory Overhaul — Final Report
Generated: <ISO>
Branch: overhaul-v2  Commits: <N>  Elapsed: <X>m

## Stop reason
<quality target hit @ 73m | deadline reached @ 120m>

## Features shipped (in order)
- [x] Tier 0.1 — Vite/TS scaffolding (commit abc123, scores 8/9/7/8)
...

## Final critic scores (last iteration)
| Critic   | Score | Rationale |
|----------|-------|-----------|
| Quality  | 9     | ...       |
| Fun      | 9     | ...       |
| Visual   | 8     | ...       |
| Audio    | 9     | ...       |

## Test summary
Vitest: <X> passing / <Y> total
Playwright: <X> passing / <Y> total
Coverage: <pct>%

## Deploy preview
Build: dist/  (run `npm run preview` to view)
GH Pages URL after merge: https://jonoo407.github.io/fart-factory/

## Screenshot grid
<links to tests/e2e/__snapshots__/final-{mobile,tablet,desktop}.png>

## Suggested follow-ups
1. Voice-actor SFX pack
2. Multiplayer fart-off mode
3. Parental settings page
4. <items skipped from backlog>

## Risk events that occurred
- <"ElevenLabs returned 429 at iter 9; fell back to procedural">
- ...
```

---

## J. Risk register

| Risk | Trigger | Mitigation |
|---|---|---|
| ElevenLabs 4xx/429 | Rate limit, prompt rejected | Per-call try/catch, mark `procedural-fallback: true`, runtime substitutes procedural. Iteration still ships. |
| Cost overrun | Loop bug regenerates everything | `HARD_CAP=200` throws. Checksum cache prevents regen. Generation only via `npm run sfx:generate`. |
| Windows path quirks | Vite/Playwright on backslash paths | `cross-env`, `path.posix`, forward slashes in configs, `import.meta.url` + `fileURLToPath` in scripts. |
| Context overflow | 2h of dense iteration logs | Iteration log is durable memory — orchestrator re-reads only last 3 entries each loop. `/compact` at 70%. Checkpoint commits anchor recovery. |
| Kid-safety on ElevenLabs | Model generates inappropriate audio | All prompts static in `scripts/sfx-seeds.ts`; no runtime user prompts. `KID_SAFETY.md` documents allowlist. Audio critic flags suspicious seeds. |
| Hidden-tab audio glitches | Browser throttles `setTimeout`, ctx suspends | `engine.ts` listens to `visibilitychange`, calls `audioCtx.suspend()`/`resume()`. Audio critic explicitly tests this. |
| Critic score gaming | Critic over-rewards near deadline to early-stop | Quality target needs **two consecutive** ≥8 *and* >60min. Single high score doesn't end run. Raw critic JSON in commit body for post-hoc review. |
| Accidental main push | `git push` without explicit ref | settings.json **denies** `Bash(git push origin main)` and `Bash(git push --force:*)`. Only `git push origin overhaul-v2` allowed. |
| Permission-prompt fatigue stalls run | 100s of permission prompts | Apply `fewer-permission-prompts` or `update-config` skill pre-launch (§G). |
| ElevenLabs endpoint shape changed | Plan written from doc snapshot | Agent does single dry-run call first (RULE 2), confirms 200 + non-empty mp3 before bulk. |

---

## Critical files to be created/modified

- `E:\app_design\fart-factory\index.html` — replaced (legacy moves to `legacy/index.legacy.html`)
- `E:\app_design\fart-factory\src\audio\procedural.ts` — extracted `playFart`, the audio core
- `E:\app_design\fart-factory\src\scoring\grade.ts` — grade table & scoring, locked by characterization
- `E:\app_design\fart-factory\scripts\generate-sfx.ts` — ElevenLabs pipeline (kid-safety + cost gate)
- `E:\app_design\fart-factory\public\sfx\manifest.json` — SFX library index
- `E:\app_design\fart-factory\docs\iteration-log.md` — orchestrator's durable memory
- `E:\app_design\fart-factory\docs\FINAL_REPORT.md` — written at stop
- `E:\app_design\fart-factory\.claude\settings.json` — permission rails (created in pre-flight)
- `E:\app_design\fart-factory\.session\start.txt` — wall-clock anchor

---

## Verification (how the user knows it worked)

After the autonomous session stops:

1. **Read `docs/FINAL_REPORT.md`** — the agent's own summary of what shipped.
2. **`git log overhaul-v2 --oneline`** — N+ commits, each with critic scores in body.
3. **`npm test && npx playwright test`** — both fully green at HEAD of `overhaul-v2`.
4. **`npm run dev`** then open `http://localhost:5173` — play the game manually, hit a few sliders, verify audio variety, particles on S+, accessibility (Tab navigation, screen reader announcing grade).
5. **`npx playwright test --ui`** — eyeball the screenshot diffs at 3 viewports.
6. **`npm run build && npm run preview`** — confirm `dist/` deploys cleanly.
7. **Read `docs/iteration-log.md`** — full audit trail of feature/test/scores/elapsed for every iteration.
8. **Spot-check `public/sfx/`** — 30+ mp3s, manifest.json valid, listen to 3-4 picked at random.
9. **Decide:** if happy, `git checkout main && git merge overhaul-v2 && git push origin main` triggers GH Pages redeploy. Otherwise iterate manually or run a follow-up session targeting specific gaps in the report.

---

## What this plan deliberately does NOT include

- Auto-merge to `main`.
- Auto-redeploy of GH Pages.
- Multiplayer / backend / accounts (out of scope; suggested as follow-up).
- Mobile-app packaging (Capacitor, etc.) — pure web stays GH-Pages-deployable.
- Replacing all procedural audio with samples — they coexist (mixer overlays).
- Any change to repo licensing, owner, or remote — we push only to existing `origin`.
