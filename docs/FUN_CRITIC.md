# Fun Critic v2 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> seven-line block at `docs/PLAN.md` §F (the "Fun critic" subsection).

---

## 1. Why v1 failed

The v1 fun critic in `docs/PLAN.md` §F awarded **fun=9** to iteration 5 ("sparkle particles on S+", `c88d11b`), **fun=8** to iterations 6 and 7, and **fun=9** to iteration 8 ("mobile haptics + onboarding tutorial", folded into commit `11f58ec`) — while the underlying game remained one in which the optimal strategy is "drag every slider to 10, get S+". Iteration 8 is the most damning data point: pure polish (haptics, a 3-step first-visit tutorial) layered on top of the same degenerate scoring loop scored higher than iterations 6 and 7 — proving the v1 rubric rewards spectacle and onboarding sugar over structural game-design fixes. Concretely, the v1 rubric's failures:

1. **Vibe axes.** "Novelty / replayability / surprise / satisfaction" are reader judgments, not tests. Two reviewers will score the same artifact 4 points apart, and the rubric gives them no anchor to disagree productively.
2. **No play simulation.** v1 inputs are `git diff`, iteration log, commentary strings, and achievements. The critic never runs the game. A degenerate strategy (max-all-sliders) is invisible from the diff because the diff doesn't enumerate the input space.
3. **No anti-pattern gate.** Nothing in v1 flags a dominant strategy, a missing fail state, a flat skill curve, or absent decisions. There is no automatic "this is degenerate, fail" path.
4. **The lens is humor-only.** v1's lens — *"Imagine an 8-year-old playing for 10 minutes. Will they laugh ≥3 times? Find ≥1 new thing to try?"* — tests for comedy text and minor exploration, not for gameplay engagement. A knock-knock-joke generator passes that bar.
5. **Single blocker class.** The only hard blocker in v1 is "text a parent wouldn't want their kid reading." Game-design failures cannot block. So even a perfectly diagnosed dominant-strategy issue cannot stop a green commit.
6. **Forgiving calibration.** 8/10 was achieved by `tier-3.11` (sparkle particles) and `tier-4.16` (achievements toast UI). Neither changes the gameplay loop's structural problems. A rubric where pure spectacle scores 9 has its anchor wrong by ~3 points.
7. **Score is local, not global.** v1 implicitly scores the *iteration's contribution* to fun, not the *game's current fun*. So a polish layer on top of a degenerate core scores high. v2 demands the score reflect the game's current fun, full stop.

**Observable in `docs/iteration-log.md`:** fun scores 5, 7, 6, 8, 9, 8, 8, 9 across iters 1-8. Not a single iteration cited a fun blocker. The critic has never blocked a commit on fun grounds, despite the user's clear judgment that the game isn't fun. The autonomous session terminated by hitting the §I "quality target" gate (two consecutive iterations averaging ≥8) — the v1 rubric thus literally certified the degenerate game as "high quality" and stopped iterating.

---

## 2. Design principles backing v2

Each axis and gate below traces to one or more cited principles.

| # | Principle | Source |
|---|---|---|
| P1 | **Interesting decisions** — a game is a series of interesting decisions; multiple viable options, real tradeoffs, lasting consequences. | Sid Meier, "Interesting Decisions," GDC 2012 |
| P2 | **Dominant / degenerate strategy** — when one strategy strictly dominates, the decision space collapses. | Game theory (von Neumann); Soren Johnson, "What Is Degenerate?", Game Developer 2009 |
| P3 | **Bushnell's Law** — easy to learn, difficult to master; reward the first quarter and the hundredth. | Nolan Bushnell, attributed (Atari, early 1970s) |
| P4 | **MDA & 8 kinds of fun** — Mechanics → Dynamics → Aesthetics; designers build mechanics, players experience aesthetics; every claimed aesthetic must name a producing mechanic. | Hunicke, LeBlanc, Zubek, "MDA: A Formal Approach," AAAI 2004 |
| P5 | **Flow channel** — engagement lives between anxiety (challenge > skill) and boredom (skill > challenge); demands clear goals, immediate feedback, scaling challenge. | Csikszentmihalyi 1990; Jenova Chen, "Flow in Games," USC MFA 2006 |
| P6 | **PENS** — autonomy / competence / relatedness as intrinsic-motivation drivers. | Ryan, Rigby, Przybylski, *Motivation and Emotion* 2006 |
| P7 | **Game feel / juice** — high-density per-input feedback; <100ms input→response; multi-modal. | Steve Swink, *Game Feel* 2008; Jonasson & Purho, "Juice It or Lose It," GDC Europe 2012; Vlambeer, "The Art of Screenshake" 2013 |
| P8 | **Schell's Lens of Meaningful Choices (#39)** — explicitly asks "Are there dominant strategies in the game?" | Jesse Schell, *The Art of Game Design*, lens #39 |
| P9 | **Meaningful play** — outcomes must be both *discernible* (player perceives the change) and *integrated* (it matters later). | Salen & Zimmerman, *Rules of Play* 2003 |
| P10 | **Failure design** — failure must reveal a specific inadequacy the player can address; restart latency must be low. | Jesper Juul, *The Art of Failure* 2013 |
| P11 | **Compulsion / core loop** — anticipation → action → reward, with each iteration producing a small new outcome. | John Hopson, "Behavioral Game Design," Gamasutra 2001 |
| P12 | **Casual web heuristics** — first-fun under 30s; one-input rule; restart latency under 2s; no tutorial wall. | Hyper-casual practitioner consensus (Voodoo, Moloco, Supercent design guides) |

---

## 3. The v2 rubric

### 3.1 Five mechanism-level axes (replacing five vibe axes)

Each scored 1-10, average is the raw score, then capped by hard gates (§3.2).

| Axis | What it measures | Backing principle |
|---|---|---|
| **Decision Quality** | Are there interesting decisions? Do options trade off? | P1, P2, P8 |
| **Skill Curve** | Floor → ceiling delta. Can a skilled player meaningfully outperform a novice? Does difficulty / mastery scale with play? | P3, P5 |
| **Game Feel** | Per-input feedback density (multi-modal); input-to-response latency; discernibility of outcomes. | P7, P9 |
| **Failure & Recovery** | Is there meaningful failure? Does failing teach? Is restart latency under 2s? Or, if no failure, is the game declared a sandbox toy with intent? | P10 |
| **Variation & Replay** | Is run N+1 meaningfully different from run N? Variation through changed mechanics / objectives, not just randomized cosmetics. | P4 (Discovery), P11 |

The age-appropriateness (kid-safety) check from v1 is preserved as a separate hard gate rather than a numeric axis (§3.2 gate 6).

### 3.2 Hard gates (auto-fail)

A failure on **any** of these collapses the score to **≤4** regardless of the per-axis average. The critic must explicitly call out which gate(s) failed and provide evidence (file:line citations or scenario outputs).

1. **Dominant Strategy Gate.** If the optimal observable strategy across the input space achieves ≥95% of max reward AND that strategy is one a 5-year-old would discover within 30 seconds, FAIL. Tested by enumerating extremal inputs in §3.4. Any uniform "set everything to max" strategy that hits the top reward tier is a dominant strategy.
2. **Bushnell Floor-Ceiling Gate.** If the score a brand-new player can achieve on run #1 within 30 seconds is ≥80% of max possible, FAIL. There is no mastery to chase.
3. **Decision Drought Gate.** If a typical run features fewer than 2 player decisions whose outcomes meaningfully diverge, FAIL. Six sliders that all push score in the same direction collapse to *one* decision ("set them all high?"), not six.
4. **Feedback Gate.** If any player input lacks **both** visible AND audible response, FAIL (degraded-mode users can mute or screen-read; absence on both modalities at once is unacceptable for engagement).
5. **No-Failure Gate.** If there is no fail state — no way to perform poorly — and the game does not explicitly self-classify as a sandbox toy in `docs/`, FAIL. ("You can always launch a fart" is the *absence* of a fail-state design choice, not the presence of one.)
6. **Kid-Safety Gate** (preserved from v1). Any text or imagery a parent of a 5-10yo would not want their kid reading or seeing → FAIL.

### 3.3 Schell Lens #39 — required verbatim

The critic MUST answer Schell's lens-#39 questions as part of every iteration's output, so the dominant-strategy question is asked literally every time:

- *Q1:* What choices is the game asking the player to make? (Enumerate them.)
- *Q2:* Are they meaningful? (For each: does it change the outcome non-trivially?)
- *Q3:* **Are there dominant strategies in the game?** (If yes, gate 1 fails.)
- *Q4:* Are choices placed where players can make them, in the right amounts, with the right consequences?

### 3.4 Required simulation step

Before scoring, the critic MUST simulate at minimum four scenarios. For UI-touching iterations the critic should run them via Playwright; for logic-only iterations a code-trace through `src/scoring/grade.ts` and `src/main.ts` is acceptable evidence.

| Scenario | Inputs | Required output |
|---|---|---|
| **Mash-max** | Set every input to its max | Grade, total, what feedback fires |
| **Mash-min** | Set every input to its min | Grade, total, what feedback fires |
| **Median** | Set every input to mid-range | Grade, total, what feedback fires |
| **Domain-skill** | Configure inputs as a knowledgeable player would, given the iteration's stated objective | Grade, total, what feedback fires |

If any uniform strategy (Mash-max, Mash-min) ties or exceeds the Domain-skill score, gate 1 (Dominant Strategy) automatically fails and the critic records the evidence.

### 3.5 Calibration anchors

| Score | What it looks like |
|---|---|
| **9-10** | Polished short-form game with clear interesting decisions, observable skill curve over 5+ runs, multi-modal feedback under 100ms, meaningful failure with sub-2s restart, varied content per run. Comparable to *Crossy Road*, *Threes*, *Flappy Bird* in design integrity. |
| **7-8** | Solid mechanic with at least one clear interesting decision, observable skill ceiling, juice on inputs, some run-to-run variation. Plays for a session. |
| **5-6** | Has a loop but with structural gaps: shallow decisions, weak skill curve, or thin feedback. Plays once but not twice. |
| **3-4** | Loop is degenerate or trivial. Default for any iteration that fails ≥1 hard gate. |
| **1-2** | No loop, or pure spectacle without gameplay. |

The score reflects **the game's current state including the new feature**, not the diff alone. Sparkle particles laid over a degenerate loop do not move 5 → 9; they move 5 → 5 because the gates still fail.

### 3.6 Output schema

Replaces v1's free-form `{score, rationale, blockers}` with a structured object. The orchestrator's parser at §F lines 376-385 still reads `.score` and `.blockers` unchanged; new fields are additive.

```json
{
  "score": 4,
  "rationale": "<2-4 sentences citing specific mechanics by file:line or DOM id>",
  "blockers": ["<must-fix items, including every hard-gate failure verbatim>"],
  "diagnostics": {
    "dominantStrategy": {
      "detected": true,
      "strategy": "<plain English description>",
      "evidence": "<file:line or scenario output>"
    },
    "skillCurve": { "novicePeakScore": 0, "expertPeakScore": 0, "delta": 0 },
    "decisionsPerRun": 0,
    "feedbackModalities": { "visual": false, "audio": false, "haptic": false },
    "failureMode": "<description, or 'none — sandbox toy' if intentional>",
    "restartLatencyMs": 0,
    "loop": "<one-sentence loop description>",
    "variationPerRun": "<what changes between runs>",
    "schellLens39": {
      "choicesEnumerated": [],
      "areTheyMeaningful": false,
      "dominantStrategyExists": false,
      "wellPlaced": false
    },
    "simulation": {
      "mashMax": { "inputs": "...", "result": "..." },
      "mashMin": { "inputs": "...", "result": "..." },
      "median":  { "inputs": "...", "result": "..." },
      "domainSkill": { "inputs": "...", "result": "..." }
    }
  },
  "hardGatesFailed": ["dominantStrategy", "..."]
}
```

The legacy 4-axis output `{score, rationale, blockers}` remains valid input to the orchestrator (it still parses min/avg). The richer `diagnostics` block is for human review of commit bodies and post-hoc auditing.

### 3.7 Tools the critic may use

- **Read, Grep, Glob** — same as v1.
- **Playwright via shell (`npx playwright test`)** — REQUIRED to run the four simulation scenarios when the iteration touches game logic, UI, or scoring.
- **Iteration log** — for tracking which gates have ever cleared and trending.
- **Sub-shell `node -e "..."` traces** — for code-only logic verification (e.g. iterating `gradeFart` over a range).

---

## 4. v2 applied to current Fart Factory state

(Applied as a worked example, evaluating commit `11f58ec` on `overhaul-v2` — the head of the autonomous session per `docs/iteration-log.md` row 8.)

### 4.1 Simulation outputs

| Scenario | Sliders [L,W,V,St,T,M] | Total | Grade |
|---|---|---|---|
| Mash-max | [10,10,10,10,10,10] | 60 | **S+** |
| Mash-min | [1,1,1,1,1,1] | 6 | F- |
| Median | [5,5,5,5,5,5] | 30 | C+ |
| "Skilled" — guess what the system rewards | indistinguishable from Mash-max | 60 | **S+** |

### 4.2 Diagnostics

- **dominantStrategy**: detected. `gradeFart(total)` at [src/scoring/grade.ts:8-16](src/scoring/grade.ts:8) thresholds purely on `total = sum(sliders)`. Maximizing every slider is always optimal. Evidence: `S+` grade requires `total >= 54`; mash-max produces `total = 60`. No input combination produces a higher reward than mash-max.
- **skillCurve**: novicePeak = 60 (achievable in run #1, 6 drag-to-right gestures, ~5 seconds). expertPeak = 60. delta = 0. The Bushnell test fails completely: floor = ceiling.
- **decisionsPerRun**: 0 meaningful. The six sliders are one collapsed decision ("how high should I set them?"), and the dominant answer is always "max."
- **feedbackModalities**: visual ✓ (`spawnGas`, `spawnSparkles`, `showReactions`), audio ✓ (`playFart`), haptic ✓ (`triggerHaptic` at [src/main.ts:72](src/main.ts:72)). Passes Feedback Gate.
- **failureMode**: none. Every launch yields a positive event with a comedic comment. Even at total=6 (F-), the response is "Did you even try?" delivered as a joke. No fail state, no sandbox declaration, no boss/timer. Fails No-Failure Gate.
- **restartLatencyMs**: ~0 — sliders persist between runs, click Launch again is instant. Passes the casual-web heuristic.
- **loop**: "set 6 sliders → click Launch → see grade + commentary → repeat."
- **variationPerRun**: commentary string is randomly picked from a 30-string pool ([src/content/commentary.ts:1-32](src/content/commentary.ts:1)); mechanics are deterministic; there are no varying constraints, targets, or objectives.
- **schellLens39**:
  - Q1 — choices: 6 slider positions.
  - Q2 — meaningful?: no, all push the same metric.
  - Q3 — **dominant strategy exists?: yes**. Mash-max → S+.
  - Q4 — well placed? n/a; collapses at Q3.

### 4.3 Per-axis scores

- Decision Quality: **1**. There are zero interesting decisions; mash-max dominates.
- Skill Curve: **1**. Floor = ceiling. Bushnell test fully fails.
- Game Feel: **7**. Multi-modal feedback, screen shake on total>40, sparkles on S+, gas clouds, haptics. Solid; the only good axis.
- Failure & Recovery: **2**. No fail state; restart fast (1 point retained for instant retry).
- Variation & Replay: **3**. Only the commentary string varies. Achievements give weak goal pull but most unlock on first mash-max run.

Average: (1+1+7+2+3) / 5 = 2.8.

### 4.4 Verdict

- **Hard gates failed**: dominantStrategy, bushnellFloorCeiling, decisionDrought, noFailure. **4 of 6.**
- **v2 score: 2** (capped by §3.2; raw average would be 2.8 anyway).
- **v1 score on the same artifact: 9** (iter 8). Delta: **−7**.

The v1 → v2 delta is the proof that v2 fires where v1 didn't. Iteration 8 added a 3-step onboarding tutorial and mobile haptics — both genuinely useful polish, but neither changes Decision Quality, Skill Curve, Failure & Recovery, or Variation. v1 rewarded the polish; v2 sees right past it because the four hard gates the game already failed still fail.

### 4.5 Blockers (must address before fun ≥ 6)

1. **Replace pure-sum scoring with target-matching.** Each round names a *desired profile* (e.g. "wet but quiet" → wetness high & volume low) and grades by **closeness to target**. Scoring becomes `−sum(|slider_i − target_i|)` rather than `+sum(slider_i)`. Mash-max no longer dominates because mash-max only matches profiles like "everything max." This single change clears gates 1, 2, and 3 simultaneously.
2. **Add a fail mode or declare sandbox.** Either (a) introduce time pressure, an opposition (boss meter, audience mood), or a budget (slider points to allocate), or (b) document in `docs/` that the toy is intentionally a sandbox — and accept the gate failure honestly. Option (a) is what the user described as "fun design"; option (b) is for design honesty if the team really wants a free-play toy.
3. **Add per-run variation that changes inputs, not just outputs.** Daily challenge with seeded sliders; constraint cards ("this round: stinkiness must be 1"); locked sliders; bonus multipliers on specific axes. Variation must change *what the player should do*, not just what jokes appear.
4. **Reduce slider count or differentiate them.** Six sliders that all positively contribute to score is the v1 trap. Either differentiate them (some sliders are "good," some are "bad," some context-dependent) or reduce them so each remaining choice carries more weight.

These four blockers, addressed together, would move the game from v2-score 2 to v2-score 6+ in a single iteration.

---

## 5. Migration into PLAN.md

In `docs/PLAN.md` §F, replace the seven-line "Fun critic" block (current text starting `### Fun critic` and ending with `Hard blocker: any text a parent wouldn't want their kid reading.`) with:

```markdown
### Fun critic

Full rubric: [docs/FUN_CRITIC.md](FUN_CRITIC.md).

- **Axes:** Decision Quality, Skill Curve, Game Feel, Failure & Recovery, Variation & Replay (each 1-10, average is raw score).
- **Hard gates** (any failure caps score at 4): Dominant Strategy, Bushnell Floor=Ceiling, Decision Drought, Feedback Density, No-Failure (without sandbox declaration), Kid-Safety.
- **Required simulation:** four scenarios (Mash-max, Mash-min, Median, Domain-skill) before scoring. Critic must report each scenario's outcome.
- **Schell Lens #39:** the four lens questions (especially "Are there dominant strategies?") must be answered verbatim per iteration.
- **Output schema:** `{score, rationale, blockers, diagnostics, hardGatesFailed}` — see FUN_CRITIC.md §3.6. Orchestrator's existing parsing (§F lines 376-385) still reads `.score` and `.blockers`.
- **Tools:** Read, Grep, Glob, Bash (read-only), Playwright (for simulation scenarios).
```

The orchestrator's parsing logic at PLAN.md §F lines 376-385 needs **no change** — it already reads `score` and `blockers`. The new `diagnostics` and `hardGatesFailed` fields are additive and serve human review.

---

## 6. Verification (RULE 3 — verify behavior, not data shape)

The way to verify v2 actually catches the failures v1 missed is to point the new rubric at known-degenerate scenarios and check it produces the expected verdict:

| Scenario | v1 verdict | v2 expected verdict |
|---|---|---|
| Current Fart Factory @ `11f58ec` (autonomous-session HEAD) | fun=9, no blockers, "quality target hit" | **fun ≤ 4, blockers cite dominant strategy + Bushnell + decision drought + no failure** |
| Hypothetical: same game with target-profile scoring | (would still score similarly) | fun=6+, dominant-strategy gate cleared |
| Hypothetical: same game with a 30-second timer & shrinking-target | (would still score similarly) | fun=7+, all gates cleared except possibly variation |
| Hypothetical: pure cosmetic-only iteration (palette swap on degenerate game) | could score high in v1 if "cute" | fun ≤ 4 because the gates the game already failed still fail |

Section 4 above is the executed verification of row 1: applying v2's procedure to the current state produces score 2 with the four gate failures explicitly named. v1 produced score 9 on the same artifact and triggered the §I "quality target hit" stop condition. The delta of 7 points is the proof that v2 is a stricter rubric that actually fires on degenerate gameplay.

---

## 7. What v2 deliberately does not change

- The orchestrator loop, critic-spawning mechanism, and JSON-parse retry logic at PLAN.md §E and §F lines 376-385.
- The Quality / Visual / Audio critics. Those are out of scope for this revision; they may need similar treatment but no evidence they're misfiring at the same rate.
- The 4-critic averaging math. v2's hard gates feed into the existing min<6 fixup trigger by emitting a `blockers` array on gate failure — no orchestrator code change required.
- The kid-safety hard blocker — preserved verbatim as gate 6.

---

## 8. Open follow-ups (not part of this rubric, but flagged for the orchestrator)

- A test battery of "synthetic critic-input scenarios" with golden expected outputs (5-10 cases) would let us regression-test the rubric itself. Drop in `tests/critic-fixtures/`.
- The Audio critic should similarly be reviewed for whether it actually fails on the SFX-library being absent (manifest-not-yet-generated case at the time of writing).
- Consider whether the Quality critic should also gain hard gates (e.g. "any new `any` type → blocker").
