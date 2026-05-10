# Fun Critic v4 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> seven-line block at `docs/PLAN.md` §F (the "Fun critic" subsection).
> v4 evolves v3 after a user playtest of the shipped game ("I'd give this a
> 3 or 4") revealed structural-game failures my v3 rubric scored 7 on. v4
> adds 12 cited principles (P20-P31), 2 new axes (System Integration,
> Choice Architecture), and 4 new hard gates (Disjoint Systems, Open
> Continuous Input, Loop-Only Design, Displayed-Target Puzzle). The v3
> axes/gates remain unchanged — v4 is layered on top.

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

### 1.2 What v4 adds to v3

After session 2's iter 24-26 shipped a daily challenge, Hard Mode, 14-sample SFX library, achievements, and best-today persistence, v3 scored the build at 7/10 on Fun. The user playtested the deployed game and said *"I'd give this a 3 or 4"* with four specific structural critiques:

1. **Two parallel scoring systems unintegrated** — the original "total → grade" system from v1 still ran alongside the daily-challenge match%. Player can max all sliders and get S+ grade *regardless* of the daily challenge. v3 detected the visible-target dominant strategy in Hard Mode but didn't flag the disjoint-strategy issue across systems.
2. **Open continuous input space** — six unbounded sliders 1-10 each. v3's Dominant Strategy gate caught this in spirit but didn't name the *input modality* as the root cause. The slider model itself precludes meaningful choice — switching to Hard Mode hides feedback but doesn't change the input space.
3. **No inventory / no resource scarcity** — sliders are independently maxable. There's no budget, no pick-K-of-N, no combinatorial selection. v3 had Goal Stacking but not a check that the input space supports combinatorial choice.
4. **No collection / no real save / no arc** — best-today is a single number per day; nothing unlocks, no recipes are discovered, no character grows. v3's Progression axis scored partially on best-today persistence, but persistence-of-one-number is not an arc.

The user proposed: replace sliders with a **food-eating** mechanic (pick 3-5 foods from a growing inventory; foods have fart-properties; combinations produce emergent results; new foods unlock through play). That suggestion is operationalized below in §4.5.

v4's mission: catch this class of structural failure. A cleanly-shipped slider game can pass v3 with a 7; under v4 it scores 3-4 because the *choice architecture* itself is broken regardless of polish.

### 1.1 What v3 added to v2

v2 caught the structural-collapse failures (dominant strategy, decision drought, no-failure, etc.). User stress-testing then exposed two further weaknesses. First, v2's prescription in §4.5 ("replace pure-sum scoring with target matching") was itself trivially soluble — once the target was visible on screen, the meta-strategy "match the displayed numbers" was a new dominant strategy. v3 doesn't fix the prescription's depth (that lives in §4.5 below), but it does add the rubric axes/gates that catch *that* class of failure too. Second, v2 had no axis for **long-term progression** (across-session mastery and content), no axis for **goal stacking** (concurrent multi-timescale goals), no axis for **curiosity gaps** (visible-but-inaccessible information), no sub-test for **anticipation design** (cue-to-payoff arc), and no gate for **endogenous value** (the score must feed into in-system consequences, not float as a hollow number). v3 adds three axes (Progression, Goal Stacking, Curiosity Gaps), one sub-test under Game Feel (Anticipation), and one new hard gate (Hollow Score). The v2 axes and gates remain unchanged.

---

## 2. Design principles backing v3

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
| P13 | **Mastery progression / chunking** — fun is the brain's reward for chunking new patterns; once a pattern is mastered it becomes "noise" and the game must continually present the next-harder variation. | Raph Koster, *A Theory of Fun for Game Design* (Paraglyph 2004; rev. ed. O'Reilly 2013) |
| P14 | **Skill atoms / content progression** — content delivers nested skill atoms (`Action → Simulation → Feedback → Modeling`); each major progression beat introduces a *new* atom rather than inflating numbers around an existing one. | Daniel Cook, "The Chemistry of Game Design," Gamasutra 2007 |
| P15 | **Meta-progression / persistence** — state surviving the end of a run/session converts failure into incremental forward motion and gives a long-arc reason to return. | Jesper Juul, *Half-Real* (MIT 2005); roguelike-revival design (*Hades* 2020, *Slay the Spire* 2019, *Rogue Legacy* 2013) |
| P16 | **Goal stacking** — concurrent goals at multiple timescales (30 sec / 5 min / 30 min / multi-session / 100 hr); at any moment the player can answer "what am I doing and why" at every layer. | Schell Lens #38 "Goals"; Andrew Rollings & Ernest Adams, *On Game Design* (New Riders 2003) |
| P17 | **Endogenous value** — value generated by the game's own rule system vs. value imported from outside (real-money prizes, social bragging). A score must feed back into in-system consequences (unlocks, content, ability changes) to feel earned. | Bernard Suits, *The Grasshopper* (1978); Salen & Zimmerman, *Rules of Play* (MIT 2003) Ch. 7; Schell Lens #7 |
| P18 | **Anticipation / appetitive design** — dopamine spikes on the *cue* predicting reward, not the reward itself; design must telegraph rewards, support near-miss states, and pace cue-to-payoff arcs (slot-style reveals, glowing chests, count-ups). | John Hopson, "Behavioral Game Design," Gamasutra 2001; Berridge & Robinson, "Parsing reward," *Trends in Neurosciences* 26 (2003) |
| P19 | **Curiosity / information-gap theory** — curiosity is the aversive feeling of becoming aware of a gap between what one knows and what one *could* know; designs generate it via "collative variables" (novelty, complexity, surprise) and visible-but-inaccessible information. | George Loewenstein, "The psychology of curiosity," *Psychological Bulletin* 116 (1994); Daniel Berlyne, *Conflict, Arousal, and Curiosity* (McGraw-Hill 1960); Schell Lens #6 |
| P20 | **Single-loop coherence / system integration** — when a game has multiple scoring/feedback systems, each must trace to ONE named central objective and reward correlated player behaviors. Parallel systems with independent dominant strategies are a structural failure. Test: name the central goal; list every scoring system; for each write the dominant strategy. PASS = all dominant strategies coincide. | Salen & Zimmerman, *Rules of Play* (MIT 2003) Ch. 3 on meaningful play; Daniel Cook, "Chemistry of Game Design" (Lostgarden 2007); Ian Schreiber, *Game Design Concepts* (course archive 2009) Level 3 |
| P21 | **Decision-space typology** — classify the input space: (a) open continuous, (b) bounded discrete, (c) combinatorial selection (pick K of N), (d) budget-constrained allocation, (e) sequential. Open continuous spaces with no scarcity layer collapse to dominant uniform strategies ("max all" or "match displayed target"). | Greg Costikyan, *Uncertainty in Games* (MIT 2013, ISBN 978-0-262-01896-8) Ch. 2-3; Sid Meier GDC 2012 (already cited P1) sharpened with opportunity-cost criterion; Reiner Knizia design notes on *Modern Art* |
| P22 | **Inventory as choice engine** — a bounded inventory converts continuous-input space into combinatorial AND ties moment-to-moment choice to long-arc progression. Pick-K-of-N with growing-N is the canonical engine. Unbounded resources eliminate both effects. | Mark Rosewater, "Lenticular Design" / "When Cards Go Bad" (Wizards.com 2003-2017); Eric Barone (ConcernedApe), GDC 2019 "Stardew Valley: Designing Game Feel"; Raph Koster, *A Theory of Fun* 2nd ed. (O'Reilly 2013, ISBN 978-1-449-36321-5) |
| P23 | **Crafting / recipe / combination systems** — combinations are meaningful only if (a) ≥30% of pairs produce non-additive (synergy or conflict) results, (b) some recipes are *discovered* not displayed, (c) wrong combinations have a cost. Pure-additive combination is arithmetic, not crafting. | Daniel Cook, "Steambirds Postmortem" / "Game Design Theory I Wish I Had Known" (Lostgarden 2009/2012); Reiner Knizia, *Dice Games Properly Explained* (Blue Terrier 2010, ISBN 978-1-907110-10-8); Persson/Bergensten GDC 2011 "The Word of Notch: Minecraft" |
| P24 | **Save system as persistent state** — save state is meaningful only if it stores ≥5 structured, player-modifiable fields (inventory, unlocked recipes, discovered combos, streak, character stats). A single number per day is not save-worthy. | Janet Murray, *Hamlet on the Holodeck* (MIT Press 2017 reissue, ISBN 978-0-262-53348-5) Ch. 4; Jesse Schell, *Art of Game Design* 3rd ed. (CRC 2019), Lens #74 (Persistent Realities); Costikyan (op. cit.) |
| P25 | **Scarcity as cognitive engagement driver** — bounded resources increase decision quality and engagement; unbounded resources produce indifference (the cognitive-science "bandwidth tax" of irrelevance). | Sendhil Mullainathan & Eldar Shafir, *Scarcity: Why Having Too Little Means So Much* (Times Books 2013, ISBN 978-0-8050-9264-6); Dan Ariely, *Predictably Irrational* rev. ed. (Harper Perennial 2010, ISBN 978-0-06-135324-6) Ch. 1 |
| P26 | **Loops vs arcs** — every viable game has BOTH a loop (per-session repeating action) AND an arc (across-session one-way progression). Loop-only design is structurally a slot machine. | Daniel Cook, "Loops and Arcs" (Lostgarden, May 2012); Schell Lens #45 (Story) and Lens #69 (Reward) |
| P27 | **Combinatorial explosion as replay metric** — replayability = count of meaningfully distinct play-states reachable, where each non-dominated. A continuous-input game has infinite raw states but ~1 meaningful state. C(N,K) inventory has C(N,K) meaningful states. | Mark Rosewater, "Lenticular Design" (Wizards.com May 2014); Garfield, Elias, Gutschera, *Characteristics of Games* (MIT Press 2012, ISBN 978-0-262-01713-8) |
| P28 | **Progressive disclosure / skill-atom layering (sharpened)** — mechanics introduced individually, mastered, then layered. Day-1-vs-day-7 set comparison: day 7 must include day-1 items AND new items must combine non-trivially with old items. | Anna Anthropy & Naomi Clark, *A Game Design Vocabulary* (Addison-Wesley 2014, ISBN 978-0-321-88692-7) Ch. 5 on Mario 1-1; Cook "Chemistry" (op. cit. P14) |
| P29 | **Endogenous goal generation (sharpened)** — score must purchase something IN the game (unlocks, inventory, capability, narrative). Score that only changes a leaderboard number is exogenous. Trace each scoring output: does it drive in-game state change, or only a wall-of-numbers? | Bernard Suits, *The Grasshopper* (1978; Broadview 2014, ISBN 978-1-55481-156-4); Schell Lens #7 sharpened with trace-the-output test |
| P30 | **Just-one-more-run compulsion / meaningful failure** — failure must advance some persistent counter (recipe discovered, item unlocked, lore revealed). Pure-reset failure produces fatigue; meta-progression failure (Spelunky/Hades/Slay the Spire model) produces "one more run." | John Hopson, "Behavioral Game Design" (Gamasutra 2001); Derek Yu, *Spelunky* (Boss Fight Books 2016, ISBN 978-1-940535-11-1) Ch. 6-8; Mark Brown "Game Maker's Toolkit" 2016 "What Makes a Good Roguelike" |
| P31 | **Hidden information / deduction layer** — a game becomes a *puzzle* (vs. arithmetic exercise) only when relevant state is hidden and must be deduced through play. Displaying the optimization target eliminates the puzzle. | Reiner Knizia, *Dice Games Properly Explained* (op. cit. P23) on *Lost Cities*/*Tigris & Euphrates*; Loewenstein 1994 (sharpened from P19); design pattern of Mastermind / Codenames / Yokai |

---

## 3. The v4 rubric

### 3.1 Ten mechanism-level axes

Each scored 1-10, average is the raw score, then capped by hard gates (§3.2).

| Axis | What it measures | Backing principle |
|---|---|---|
| **Decision Quality** | Are there interesting decisions? Do options trade off? | P1, P2, P8 |
| **Skill Curve** | *Within-session* floor → ceiling delta. Can a skilled player meaningfully outperform a novice in one sitting? | P3, P5 |
| **Game Feel** | Per-input feedback density (multi-modal); input-to-response latency under 100ms; discernibility of outcomes; **anticipation arc** (P18 sub-test) — cue-to-payoff telegraphing, near-miss states, paced reveals. | P7, P9, P18 |
| **Failure & Recovery** | Is there meaningful failure? Does failing teach? Is restart latency under 2s? Or, if no failure, is the game declared a sandbox toy with intent? | P10 |
| **Variation & Replay** | Is run N+1 meaningfully different from run N? Variation through changed mechanics / objectives, not just randomized cosmetics. | P4 (Discovery), P11 |
| **Progression** | *Across sessions:* does the mastery curve continue past hour 1? Are new patterns introduced as old ones automate (P13)? Do new mechanics get layered on as content scales (P14)? **Meta-progression sub-test** (P15) — does losing a run still persist *something* (currency, unlock progress, journal entry)? | P13, P14, P15 |
| **Goal Stacking** | Concurrent multi-timescale goals. Can the player answer all four — "what am I doing right now / next minute / this session / across sessions" — at the same time? Are goals concrete, achievable, rewarding (Schell #38 criteria)? | P16 |
| **Curiosity Gaps** | Within the first 10 minutes, does the game plant ≥3 *visible* information gaps the player wants to close (locked-but-visible content, mystery icon, partial maps, hinted backstory)? Are collative variables (novelty, complexity, surprise) used deliberately? **Hidden-information sub-test (P31):** is the optimal action computable from displayed information alone, or does it require deducing at least one hidden variable? | P19, P31 |
| **System Integration** *(new in v4)* | If the game has multiple scoring/feedback systems, do all of them trace to a single named central objective AND share a dominant strategy? OR is at least one parallel system that can be maxed independently? Test: name the goal; list each scoring system; compute the dominant strategy of each. | P20 |
| **Choice Architecture** *(new in v4)* | What is the input-space type — open continuous / bounded discrete / combinatorial pick-K-of-N / budget-constrained allocation / sequential? Is there a bounded inventory that grows? Are core resources scarce (using one precludes another)? Are combinations non-additive (synergy/conflict, not just sum)? Are recipes discoverable (P31)? Is failure meta-progressing (P30)? Is the save state ≥5 structured fields (P24)? | P21, P22, P23, P25, P30, P24 |

The age-appropriateness (kid-safety) check from v1 is preserved as a separate hard gate rather than a numeric axis (§3.2 gate 6).

### 3.2 Hard gates (auto-fail)

A failure on **any** of these collapses the score to **≤4** regardless of the per-axis average. The critic must explicitly call out which gate(s) failed and provide evidence (file:line citations or scenario outputs).

1. **Dominant Strategy Gate.** If the optimal observable strategy across the input space achieves ≥95% of max reward AND that strategy is one a 5-year-old would discover within 30 seconds, FAIL. Tested by enumerating extremal inputs in §3.4. Any uniform "set everything to max" strategy that hits the top reward tier is a dominant strategy.
2. **Bushnell Floor-Ceiling Gate.** If the score a brand-new player can achieve on run #1 within 30 seconds is ≥80% of max possible, FAIL. There is no mastery to chase.
3. **Decision Drought Gate.** If a typical run features fewer than 2 player decisions whose outcomes meaningfully diverge, FAIL. Six sliders that all push score in the same direction collapse to *one* decision ("set them all high?"), not six.
4. **Feedback Gate.** If any player input lacks **both** visible AND audible response, FAIL (degraded-mode users can mute or screen-read; absence on both modalities at once is unacceptable for engagement).
5. **No-Failure Gate.** If there is no fail state — no way to perform poorly — and the game does not explicitly self-classify as a sandbox toy in `docs/`, FAIL. ("You can always launch a fart" is the *absence* of a fail-state design choice, not the presence of one.)
6. **Kid-Safety Gate** (preserved from v1). Any text or imagery a parent of a 5-10yo would not want their kid reading or seeing → FAIL.
7. **Hollow Score Gate** (new in v3). If the game's primary score / currency / progress metric does not feed into ≥1 *in-system* consequence (unlocks, new content, mechanic changes, persistent character growth, narrative gating), FAIL. A high-score number that exists only for its own sake — or only for an external leaderboard — is *exogenous* in Suits' / Schell's #7 sense; the in-game value chain is hollow. Test: ask "what does score buy?" If the answer is "a place on a list," the gate fails. Backed by P17, sharpened by P29.
8. **Disjoint Systems Gate** (new in v4). If the game has ≥2 scoring/feedback systems AND any two of them have *independent dominant strategies* (i.e. there's a strategy that maxes system A while ignoring system B and vice versa), FAIL. The systems are parallel, not integrated. Test: list each system; for each, write the dominant strategy; check whether all dominant strategies coincide. Backed by P20.
9. **Open Continuous Input Gate** (new in v4). If the input space is open continuous (e.g. independently-set sliders 1-10) AND there is no scarcity layer (budget cap, opposing cost, allocation constraint) AND the optimal action is a uniform fixed configuration ("max all" or "match displayed target"), FAIL. The input modality itself precludes meaningful choice — switching feedback mode (e.g. hiding the target) doesn't fix the underlying input. Backed by P21, P25.
10. **Loop-Only Gate** (new in v4). If the across-session arc is unnameable (no growing inventory, no unlock chain, no narrative progress, no character growth — only "today's score") OR if the arc collapses to "rank on a leaderboard," FAIL. Pure-loop design with no arc is structurally a slot machine. Backed by P26. Test: name the arc in one sentence — "Across sessions, player goes from state A to state Z, never returning to A." If the answer is "your score number changes," fail.
11. **Displayed-Target Puzzle Gate** (new in v4). If a game claims to be a puzzle / inference / matching challenge AND the optimal action is computable from displayed information alone (no hidden variable to deduce, no recipe to discover), FAIL. Visible-target matching is arithmetic, not deduction. Backed by P31. Sandbox / pure-skill games are exempt — this gate is for games whose stated mode is "match a target."

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

Anchors describe the *raw average across all 8 axes* before gate capping. Eight axes is harder to average ≥7 on than five; this is intentional — v3 is a higher bar.

| Score | What it looks like |
|---|---|
| **9-10** | Polished short-form game scoring ≥7 on all 8 axes: clear interesting decisions, multi-orders-of-magnitude mastery curve (Koster), telegraphed rewards with near-misses, multi-modal feedback under 100ms, meaningful failure with sub-2s restart, mechanically varied content per run, persistent meta-progression, concurrent multi-timescale goals, ≥3 active curiosity gaps. Score feeds into in-system unlocks. Comparable to *Crossy Road*, *Threes*, *Slay the Spire* in design integrity (not in scope). |
| **7-8** | Solid mechanic with at least one clear interesting decision, observable skill ceiling, juice + anticipation on inputs, some run-to-run variation, basic progression beyond the first session, score feeds *something* in-system. Plays for repeat sessions. |
| **5-6** | Has a loop but with axis gaps: shallow decisions, weak skill curve, thin progression, or hollow-feeling score. Plays once but not twice. |
| **3-4** | Loop is degenerate or trivial, OR the game fails ≥1 hard gate. Default for any iteration that fails any gate, regardless of per-axis average. |
| **1-2** | No loop, or pure spectacle without gameplay. |

The score reflects **the game's current state including the new feature**, not the diff alone. Sparkle particles laid over a degenerate loop do not move 5 → 9; they move 5 → 5 because the gates still fail. A 3-step onboarding tutorial added on top of a hollow-score game does not move 5 → 9 either.

### 3.6 Output schema

Replaces v1's free-form `{score, rationale, blockers}` with a structured object. The orchestrator's parser at §F lines 376-385 still reads `.score` and `.blockers` unchanged; new fields are additive.

```json
{
  "score": 4,
  "rationale": "<2-4 sentences citing specific mechanics by file:line or DOM id>",
  "blockers": ["<must-fix items, including every hard-gate failure verbatim>"],
  "axisScores": {
    "decisionQuality": 0,
    "skillCurve": 0,
    "gameFeel": 0,
    "failureRecovery": 0,
    "variationReplay": 0,
    "progression": 0,
    "goalStacking": 0,
    "curiosityGaps": 0
  },
  "diagnostics": {
    "dominantStrategy": {
      "detected": true,
      "strategy": "<plain English description>",
      "evidence": "<file:line or scenario output>"
    },
    "skillCurve": { "novicePeakScore": 0, "expertPeakScore": 0, "delta": 0 },
    "decisionsPerRun": 0,
    "feedbackModalities": { "visual": false, "audio": false, "haptic": false },
    "anticipationArc": { "telegraphsRewards": false, "hasNearMissStates": false, "cueToPayoffMs": 0 },
    "failureMode": "<description, or 'none — sandbox toy' if intentional>",
    "restartLatencyMs": 0,
    "loop": "<one-sentence loop description>",
    "variationPerRun": "<what changes between runs>",
    "progression": {
      "withinSessionCurve": "<describe novice→expert delta>",
      "acrossSessionCurve": "<describe what's different at hour 10 vs hour 1>",
      "metaProgressionPersists": false,
      "metaProgressionEvidence": "<what survives a losing run, or 'nothing'>"
    },
    "goalStack": {
      "rightNow": "<30-sec goal, or 'absent'>",
      "nextMinute": "<5-min goal, or 'absent'>",
      "thisSession": "<30-min goal, or 'absent'>",
      "acrossSessions": "<multi-session goal, or 'absent'>"
    },
    "curiosityGaps": [
      "<describe each visible info gap, or '[]' if none>"
    ],
    "endogenousValue": {
      "scoreBuysWhat": "<list in-system consequences, or 'nothing — hollow'>"
    },
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
  "hardGatesFailed": ["dominantStrategy", "...", "hollowScore"]
}
```

The legacy 4-axis output `{score, rationale, blockers}` remains valid input to the orchestrator (it still parses min/avg). The richer `diagnostics` block is for human review of commit bodies and post-hoc auditing.

### 3.7 Tools the critic may use

- **Read, Grep, Glob** — same as v1.
- **Playwright via shell (`npx playwright test`)** — REQUIRED to run the four simulation scenarios when the iteration touches game logic, UI, or scoring.
- **Iteration log** — for tracking which gates have ever cleared and trending.
- **Sub-shell `node -e "..."` traces** — for code-only logic verification (e.g. iterating `gradeFart` over a range).

---

## 4. v4 applied to current Fart Factory state (post-iter-26 deployed build)

(Applied as a worked example, evaluating commit `7db0c8e` on `main` — the
deployed Pages build at https://jonoo407.github.io/fart-factory/ as of
2026-05-10. v3 of this rubric scored this same build a 7. v4 scores it a
**3** — matching the user's playtest gut score.)

### v4.1 The four structural failures the user identified

1. **Two parallel scoring systems.** `gradeFart(total)` at [src/scoring/grade.ts:8](src/scoring/grade.ts:8) maps `total = sum(sliders)` to a letter grade (F-/D/C/.../S+). Independently, `computeMatch(actual, target)` at [src/state/challenge.ts:99-103](src/state/challenge.ts:99) maps slider config to 0-100% closeness to the daily target. Both fire on every Launch. **Mash-all-sliders → S+ grade regardless of match%.** **Match-the-target → 100% match regardless of total.** Two systems, two strategies, zero integration. Disjoint Systems Gate (v4 #8) **FAILS**.

2. **Open continuous input space.** Six independent sliders 1-10. No budget. No cap. No scarcity. Slider-7 doesn't exclude slider-8. Open Continuous Input Gate (v4 #9) **FAILS**.

3. **No inventory / no resource scarcity.** Sliders are not items. No pick-K-of-N, no growing collection, no unlock chain. Choice Architecture axis: input space is type (a) open continuous; no inventory; no scarcity layer.

4. **No save-worth-saving / no arc.** localStorage stores `fart_mute`, `fart_hard_mode`, `fart_onboarding_seen`, `fart_best_<date>`, `fart_achievements` (8 IDs), `fart_hall` (top 5 entries). That's structured but mostly *settings* — only `fart_best_<date>` and `fart_achievements` are arc-like, and the achievements unlock ~5 of 8 on the first mash-max launch. Loop-Only Gate (v4 #10) **FAILS** (no nameable arc beyond "your score number changes").

### v4.2 v3-style simulation outputs (preserved for context)

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
- **anticipationArc**: telegraphsRewards = false; hasNearMissStates = false; cueToPayoffMs = 0. Sliders give no preview of what's coming; clicking Launch jumps straight to outcome with no buildup. Reward delivery is flat — no count-up, no glowing meter, no "1 point from S+" indicator. Fails the anticipation sub-test under Game Feel.
- **failureMode**: none. Every launch yields a positive event with a comedic comment. Even at total=6 (F-), the response is "Did you even try?" delivered as a joke. No fail state, no sandbox declaration, no boss/timer. Fails No-Failure Gate.
- **restartLatencyMs**: ~0 — sliders persist between runs, click Launch again is instant. Passes the casual-web heuristic.
- **loop**: "set 6 sliders → click Launch → see grade + commentary → repeat."
- **variationPerRun**: commentary string is randomly picked from a 30-string pool ([src/content/commentary.ts:1-32](src/content/commentary.ts:1)); mechanics are deterministic; there are no varying constraints, targets, or objectives.
- **progression**:
  - withinSessionCurve: "none — score determined entirely by slider settings, not skill."
  - acrossSessionCurve: "none — same six sliders, same scoring formula on session 1 and session 100. Zero new mechanics introduced over time. No Koster mastery curve. No Cook skill atoms layered."
  - metaProgressionPersists: weakly. Hall of Shame stores top 5 scores; achievements (6 total at [src/state/achievements.ts:16-53](src/state/achievements.ts:16)) unlock on conditions like "first toot" and "S+ grade", most reachable on run #1 with mash-max. Combo streak counter resets per session, doesn't persist a meaningful long-arc.
  - metaProgressionEvidence: "Hall of Shame top 5 + 6 achievements, ~5 of which unlock within first 60 seconds of play."
- **goalStack**:
  - rightNow: "set sliders, click Launch" — present.
  - nextMinute: absent. There is no next-minute goal beyond "launch again."
  - thisSession: absent. No session-level objective ("clear 5 challenges," "reach the boss").
  - acrossSessions: weak. "Fill the achievement set" exists nominally but most unlocks come on run 1; no across-session arc that pulls the player back.
- **curiosityGaps**: zero visible info gaps. Every UI element is fully revealed at frame 1: 6 sliders all unlocked, all named, ranges visible. No "?" zones, no locked-but-visible content, no fog-of-war, no hinted backstory. The only mystery is which commentary string will appear, which is reactive (revealed *after* the launch), not anticipatory (a gap to close).
- **endogenousValue**: score buys nothing. `total` produces a grade letter and a Hall of Shame entry, neither of which feeds back into in-system consequences. No unlocks gated by score. No new content. No mechanic changes. Score is a hollow number. Fails Hollow Score Gate.
- **schellLens39**:
  - Q1 — choices: 6 slider positions.
  - Q2 — meaningful?: no, all push the same metric.
  - Q3 — **dominant strategy exists?: yes**. Mash-max → S+.
  - Q4 — well placed? n/a; collapses at Q3.

### 4.3 v4 per-axis scores (10 axes)

Note: scoring the **deployed** build (post iter 9-26), not the original v1 game. Iters 13-26 added daily challenge, axis hints, Hard Mode, SFX library, audience reactions, etc. on top of the slider model. The user's "3-4" critique is of the deployed build with all those features.

- Decision Quality: **2**. Hard Mode hides hints, but the input space is still 6 unbounded sliders; the optimal action under Hard Mode is "use the audience trend to bisect-search slider configs" — a real inference, but heavily mechanical. In Easy Mode, "match displayed target" or "max all" remain dominant.
- Skill Curve: **3**. Hard Mode introduces some inference skill. But the same challenge profile played 10 times stops being interesting on launch ~3.
- Game Feel: **8**. Multi-modal feedback excellent. Wind-up/pop/settle on Launch. 14 named SFX samples. Anticipation cue. Reactive challenge-card pulse on high match. Solid axis.
- Failure & Recovery: **2**. There's no fail state. Even the "audience evacuated" reaction is just text — game doesn't end, no cost, retry is identical.
- Variation & Replay: **5**. 12 daily challenges rotate; 14 SFX samples; per-axis hints + audience reactions add per-launch micro-variety. But no input-space variation across sessions.
- **Progression: 2.** Best-today persistence is the only across-session signal. No collection, no inventory, no unlock chain. Achievements are 8 binary flags, most reachable on session 1.
- **Goal Stacking: 3.** "Right now" (this launch) + "today" (beat your best, hit the challenge) exist. "Across sessions" is empty (no week-long collection, no streak counter that crosses days).
- **Curiosity Gaps: 4.** Hard Mode's hidden target is a real Loewenstein info-gap. Daily challenge name without Hard Mode-style obscuration is partial. But no locked-but-visible content, no "?" zones, no recipe book to discover.
- **System Integration: 1** *(new in v4)*. Two parallel scoring systems, both with independent dominant strategies. Disjoint Systems Gate fails outright.
- **Choice Architecture: 1** *(new in v4)*. Input type (a) open continuous; no inventory; no scarcity; no combinatorial pick; no recipe layer; no meta-progression; save state has the structure but not the *content* — no inventory[], no unlocked_recipes[], no discovered_combos[].

Raw average: (2+3+8+2+5+2+3+4+1+1) / 10 = 31/10 = **3.1**.

### 4.4 v4 Verdict

- **Hard gates failed (v4)**: bushnellFloorCeiling (#2 — partial), noFailure (#5), hollowScore (#7), **disjointSystems (#8 NEW)**, **openContinuousInput (#9 NEW)**, **loopOnly (#10 NEW)**. **6 of 11 gates fail.** (Dominant Strategy #1 weakly cleared by Hard Mode for the *match* system, not the *grade* system; counted half-failure.)
- **v4 score: 3** (raw 3.1, gate-capped at 4 — both routes converge near 3-4. Matches the user's playtest gut score.)
- **v3 score on the same artifact: 7** (post-iter-26 deployed build).
- **Delta v3 → v4: −4.** Same artifact, same code, two different rubrics — v4 catches what v3 missed.

The v3→v4 delta is the proof that v4 catches structural-game failures v3 didn't surface. v3 was rewarding the iter 13-26 *features* (daily challenge UI, hints, Hard Mode, SFX library, achievements, reactive pulse) without auditing whether the *underlying choice architecture* supported a real game. v4 audits the architecture: 6/11 gates fail because the slider model + dual scoring is structurally unsound. Polish on top doesn't fix the foundation.

This is consistent with the user's playtest verdict: *"this isn't really a game as is."*

### 4.5 Blockers (must address before fun ≥ 6)

> v4 supersedes the v3 §4.5 prescription. The user's playtest revealed that
> the entire **choice architecture** is wrong, not just the scoring system.
> Patches like Hard Mode (which v3 §4.5 #1 prescribed) treat the *feedback*
> layer; the underlying *input* layer (six unbounded sliders) and *progression*
> layer (one number per day) are structurally broken. v4 prescribes replacing
> them with a combinatorial inventory + crafting model, which is what the user
> proposed: **food-eating**.

#### The food-eating redesign (v4 prescribed mechanic)

Each round, the player picks 3-5 **foods** from a growing **inventory**. Foods have *fart-properties* (e.g. beans → wet+stinky, garlic → loud+stinky, dairy → wet+sustained, asparagus → musical+stinky). Foods *combine* with synergy/conflict bonuses. New foods unlock via play. Recipes are discoverable.

This redesign clears the v4 gates and lifts axes:

| v4 gate / axis | Slider game (current) | Food game (prescribed) |
|---|---|---|
| Open Continuous Input #9 | FAILS — 6 unbounded sliders | PASSES — pick 3-5 of N inventory items (combinatorial) |
| Loop-Only #10 | FAILS — only "today's score" persists | PASSES — arc = "unlock all 30 foods + discover all recipes" |
| Disjoint Systems #8 | FAILS — grade ⊥ match | PASSES — grade derived from match-against-craved-food, single objective |
| Hollow Score #7 | FAILS — score buys nothing | PASSES — score → unlock new foods → expand recipe space |
| Displayed-Target Puzzle #11 | FAILS — visible target is just arithmetic | PASSES — recipes hidden, audience cravings hidden, deduction layer real |
| Choice Architecture axis | 1/10 | 7-9/10 (combinatorial; scarcity from limited slots; recipes discovered) |
| Progression axis | 2/10 | 7-9/10 (inventory grows; recipes discovered persist; meta-progression P30) |
| Decision Quality axis | 2/10 | 7+/10 (interesting decisions per Sid Meier — multiple viable recipes, real tradeoffs) |
| Curiosity Gaps axis | 4/10 | 8/10 (locked-but-visible foods, hidden recipes, audience preferences) |

### Rarity color palette (instantly-readable convention)

Foods, recipes, and audiences carry a **rarity tier** rendered with the gaming-canonical 5-color palette established by Diablo II (Blizzard 2000), standardized by World of Warcraft (2004), and re-used across League of Legends / Hearthstone / Borderlands / Slay the Spire / dozens more. Cultural fluency: any player who has touched an RPG since 2000 reads it without instruction.

| Tier | Color | Hex | Visual signal |
|---|---|---|---|
| **Common** | Grey | `#9ca3af` (slate-400) | neutral border, no glow — "this is the floor" |
| **Uncommon** | Green | `#22c55e` (green-500) | mild outer-glow, pleasant |
| **Rare** | Blue | `#3b82f6` (blue-500) | distinct outer-glow, "interesting find" |
| **Epic** | Purple | `#a855f7` (purple-500) | strong glow + slight pulse, "you should be excited" |
| **Legendary** | Gold | `#f59e0b` (amber-500) | bright glow + sparkle particles + ambient pulse, "this is the moment" |

These are CSS colors / box-shadows / borders — not new font weights or sizes. Implementation: a shared `.rarity-{tier}` class system that any element (food card, recipe entry, audience portrait, fart announcement) can inherit.

The 5-color rarity palette is a **documented sub-palette** of `docs/PALETTE.md` — it overlaps with `reward` gold (legendary) but adds grey/green/blue/purple as semantic-tier-only colors. Per V16 (limited intentional palette), the full game palette is ≤6 *role-bearing* hue families plus this rarity sub-palette which is conventional and culturally pre-loaded.

Concretely, the minimum-viable food redesign:

1. **Inventory data structure** (`src/state/inventory.ts`). Catalog of ~30 named foods, each with: `id`, `name` (e.g. "Black Beans", "Pickled Egg"), `emoji`, `unlocked: boolean`, `properties: { wet, dry, stink, musical, length, volume, temp }` (each property 0-5 contribution rather than a slider value). Persists to localStorage as `fart_pantry`.

2. **Pick-K-of-N selection** (`src/state/recipe.ts` + UI). Replace the slider lab with a pantry grid showing unlocked foods. Player taps to add to a "plate" (max 4 slots). Each tap adds the food's properties to the brewing fart. Tapping a slot removes it.

3. **Combination rules with synergy/conflict** (`computeFartFromRecipe(plate)`). Per P23: at least 30% of pairs produce non-additive results. Examples:
   - Beans + Dairy → "Swamp Beast" pattern (wet/stink synergy, +bonus)
   - Beans + Garlic → "Volcano" pattern (stink/heat synergy)
   - Asparagus + Cheese → conflict (canceling), penalty
   - Pickle + Egg → discovery: "Sulfur Bomb" (hidden combo, unlocks recipe entry)

4. **Crave-of-the-day replaces target sliders**. Daily challenge becomes "today's audience craves a Swamp Beast" — the player must construct a recipe that matches the cravings. Cravings are hidden in Hard Mode (P31 deduction); shown as a profile-of-properties in Easy Mode.

5. **Inventory expansion as primary progression** (P22, P28). Score from launches buys new foods at the "pantry shop" between runs. Day 1: 6 starter foods. Day 7: 12-15 foods (with combinations). Day 30: all 30 foods + recipes discovered.

6. **Recipe book** (`src/state/recipes.ts`). Discovered combinations get logged into a "Lab Notebook" — Player can see "you've discovered 7 of 18 recipes." Some recipes need specific food combinations only revealed by trying. P23 + P31.

7. **Meaningful failure** (P30). A run with a low match doesn't reset to zero — the player banks "research notes" toward the next food unlock. Failure progresses.

8. **Single grading system** (P20). The "grade" letter is removed entirely. Score = match-quality of the recipe vs. crave. There's one number, not two. Disjoint Systems gate cleared.

Items 1-3 are the minimum to pass gates 8/9/10/11. Items 4-8 lift the axes. Together, they would move v4 from 3 to 7-8 in a single substantial iteration.

#### Why preserve the slider game?

The slider game is the *legacy v1 game with v2/v3 polish* — keep it as a "Sandbox Mode" toggle (or as the legacy archive at `legacy/index.legacy.html`). The food game becomes the canonical Story / Daily Challenge mode. This way characterization tests of the slider game stay green and the project history is preserved without forcing a destructive rewrite.

---

> v3's §4.5 (preserved for context — these blockers are now superseded by v4's food redesign):
> Goal Stacking, Endogenous Value, Curiosity Gaps) get concrete mechanisms.

The minimum credible design that clears all 7 hard gates and lifts the average above 6:

1. **"Mastermind for farts" — hidden target with audience-reaction feedback.** Each round, a hidden audience has a hidden target profile. Player launches; audience reacts per-axis (loved / coughed / evacuated / shrugged) hinting which sliders are too high/low/right. Player has 4-5 launches per round to converge. *Clears:* Dominant Strategy gate (no a-priori best move because target is hidden), Bushnell (inference + system-vocabulary skill builds with play), Decision Drought (each launch is a real decision informed by prior feedback), No-Failure (run out of launches → fail). *Adds:* Curiosity Gap (the hidden target *is* the gap), Anticipation sub-test (audience leans in / frowns as you adjust sliders, telegraphing).
2. **Score banks toward unlocks — endogenous value chain.** Score isn't just a number — banking enough across runs unlocks new audience archetypes (e.g. "The Aristocrat" prefers musical+dry+long, "The Toddler" prefers wet+loud+short, "The Skunk" prefers stinky-but-quiet). Each new audience adds a new target-mapping puzzle. *Clears:* Hollow Score gate. *Adds:* Endogenous value (score → unlocks → new content), Cook's content progression (each unlock introduces a new skill atom — a new audience to learn).
3. **Multi-timescale goal stacking.** *Right now:* hit current audience target. *Next minute:* finish this round's 3-audience set. *This session:* clear today's daily challenge (themed audience lineup). *Across sessions:* unlock the full audience roster (~20 archetypes). *Adds:* Goal Stacking axis ≥6.
4. **Meta-progression: failed runs persist research notes.** Even on a busted run, the player banks "research notes" toward audience unlocks. A bad day still moves the long arc forward. *Adds:* Progression axis sub-test (meta-progression).
5. **Within-session difficulty curve.** Audiences encountered in a session start with wide tolerances (±3 across axes) and tighten with each successful match (±2, ±1, ±0). One miss ends the session. *Adds:* Skill Curve ≥6 (within-session ceiling now meaningfully exceeds floor), Stakes (uncertainty of outcome), Anticipation (tightening tolerance as visible meter).
6. **Curiosity scaffolding for unlocks.** The unlock screen shows greyed-out audience silhouettes with cryptic names ("The ???") and unlock criteria ("score 200 across 5 sessions"). *Adds:* ≥3 visible info gaps from frame 1.

Together these six items address every hard gate and lift every axis. They share a single architecture — hidden-target audiences with reactions, banked score unlocking new audiences, and a tightening tolerance curve — so they ship as one coherent design rather than six separate features.

---

## 5. Migration into PLAN.md

In `docs/PLAN.md` §F, replace the v2 stub block (currently 6 bullets pointing at FUN_CRITIC.md) with:

```markdown
### Fun critic

Full rubric: [docs/FUN_CRITIC.md](FUN_CRITIC.md). v3 evolves v2 with three new axes (Progression, Goal Stacking, Curiosity Gaps), an Anticipation sub-test under Game Feel, and a new Hollow Score gate.

- **Axes (8, each 1-10):** Decision Quality, Skill Curve, Game Feel (incl. Anticipation), Failure & Recovery, Variation & Replay, Progression (incl. meta-progression), Goal Stacking, Curiosity Gaps.
- **Hard gates (7, any failure caps score at 4):** Dominant Strategy, Bushnell Floor=Ceiling, Decision Drought, Feedback Density, No-Failure (without sandbox declaration), Kid-Safety, Hollow Score.
- **Required simulation:** four scenarios (Mash-max, Mash-min, Median, Domain-skill) before scoring.
- **Schell Lens #39:** four questions answered verbatim per iteration.
- **Output schema:** `{score, rationale, blockers, axisScores, diagnostics, hardGatesFailed}` — see FUN_CRITIC.md §3.6. Orchestrator's existing parsing (§F lines 376-385) still reads `.score` and `.blockers`.
- **Tools:** Read, Grep, Glob, Bash (read-only), Playwright (for simulation).
```

The orchestrator's parsing logic at PLAN.md §F lines 376-385 needs **no change** — it already reads `score` and `blockers`. The new `axisScores`, `diagnostics`, and `hardGatesFailed` fields are additive and serve human review.

---

## 6. Verification (RULE 3 — verify behavior, not data shape)

The way to verify v2 actually catches the failures v1 missed is to point the new rubric at known-degenerate scenarios and check it produces the expected verdict:

| Scenario | v1 verdict | v3 expected verdict |
|---|---|---|
| Current Fart Factory @ `11f58ec` (autonomous-session HEAD) | fun=9, no blockers, "quality target hit" | **fun = 2, 5 hard gates failed (dominant strategy, Bushnell, decision drought, no-failure, hollow score), 6 of 8 axes scoring ≤3** |
| Hypothetical: target-profile scoring with visible target | (would still score similarly) | fun ≤ 4 — the meta-strategy "match displayed target" is a new dominant strategy; gate 1 still fails. Hollow Score gate may also still fail unless score buys unlocks. |
| Hypothetical: full Mastermind + audience unlocks + goal stacking design from §4.5 | (would still score similarly in v1) | fun = 7-8 — all 7 gates clear, Progression / Goal Stacking / Curiosity Gaps axes all ≥6. |
| Hypothetical: pure cosmetic iteration (palette swap on degenerate game) | could score high in v1 if "cute" | fun ≤ 4 because all the gates the game already failed still fail. |

Section 4 above is the executed verification of row 1: applying v3 to the current state produces score 2 with five gate failures explicitly named and per-axis scores at or below 3 on six of eight axes. v1 produced score 9 on the same artifact and triggered the §I "quality target hit" stop condition. The v1 → v3 delta of 7 points is the proof v3 is the stricter rubric that actually fires on degenerate gameplay.

Row 2 is the user-stress-test scenario (target-matching with a visible target) — and it's important: v3 must still fail this even though it superficially looks like an improvement, because the meta-strategy "match what's displayed" is itself dominant. v3's gate 1 catches this; v2's would too. The §4.5 prescription accordingly does NOT propose visible-target matching alone — it requires hidden targets, audience reactions, and unlock chains stacked together.

---

## 7. What v3 deliberately does not change

- The orchestrator loop, critic-spawning mechanism, and JSON-parse retry logic at PLAN.md §E and §F lines 376-385.
- The Quality / Visual / Audio critics. Strong evidence these need parallel treatment (audio at iter 2 scored 3 with 6 blockers but commit shipped anyway; visual at iter 2 scored 6 despite legacy-CSS issues; the v1 fun rubric's "vibe axes + no anti-pattern gate + forgiving calibration" pattern likely repeats elsewhere). Captured as a follow-up; do not bundle into this commit.
- The 4-critic averaging math. v3's hard gates feed into the existing min<6 fixup trigger by emitting a `blockers` array on gate failure — no orchestrator code change required.
- The kid-safety hard blocker — preserved verbatim as gate 6.

---

## 8. Open follow-ups (not part of this rubric, but flagged for the orchestrator)

- **Apply the v1→v3 fun-critic redesign approach to the Quality, Visual, and Audio critics.** Each likely needs (a) mechanism-level axes replacing vibes, (b) hard gates derived from cited principles in its discipline, (c) a required simulation/measurement step, (d) a worked-example validation against the current state. Track separately.
- A test battery of "synthetic critic-input scenarios" with golden expected outputs (5-10 cases) would let us regression-test the rubric itself. Drop in `tests/critic-fixtures/`.
- The Audio critic should similarly be reviewed for whether it actually fails on the SFX-library being absent (manifest-not-yet-generated case at the time of writing).
- Consider whether the Quality critic should also gain hard gates (e.g. "any new `any` type → blocker").
