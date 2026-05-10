# Audio Critic v2 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> five-line block at `docs/PLAN.md` §F (the "Audio critic" subsection).
> Same v1→v2 redesign approach as `docs/FUN_CRITIC.md` (committed `4b9f7b3`,
> evolved to v3 in `ca3f7d5`).

---

## 1. Why v1 failed

The v1 audio critic in `docs/PLAN.md` §F gave **audio=7 or 8** to iterations 3-8 — a stretch in which the project's planned ElevenLabs SFX library (Tier 2 of `docs/PLAN.md` §D, plus an entire build pipeline at §C) was never shipped. Per `docs/FINAL_REPORT.md` "What deliberately did NOT ship" §1, the SFX library and sample player were the headline deferred item. The critic recorded this fact in iteration-log notes ("Audio critic over-flagged 'blockers' on every visual-only iter — pre-existing legacy gaps... were repeatedly listed... per §F definition, scope-deferred items aren't blockers") but the rubric kept rewarding the procedural-only audio with 7s as if the planned library didn't matter.

Concretely, v1's failures:

1. **Vibe axes.** "Variety, distinctiveness, crash safety, mute & hidden-tab handling" each scored 1-10 by feel. No threshold for what variety means (number of variants? no-repeat logic? pitch jitter?). No threshold for distinctiveness.
2. **Hard blockers narrowly defined.** v1's hard blockers were `audioCtx === null`, decode failure, mute mid-fart not stopping, no visibilitychange handler. None of those covered "the entire planned sample library was never shipped." The critic correctly *noted* the gap but the rubric had no mechanism to *block* on it.
3. **No mastering checks.** Nothing in v1 checks LUFS, true-peak headroom, or loudness consistency across samples — the standard mastering criteria for any shippable game audio (BS.1770 / EBU R128).
4. **No autoplay-policy check.** Modern browsers (Chrome 2018+) require AudioContext creation/resume inside a user gesture. v1 didn't test for this.
5. **No accessibility check.** WCAG SC 1.2.1 / 1.4.2 require visual indicators for sound-conveyed events and a persistent mute. v1 ignored both.
6. **No measurement step.** v1 listed `tests/unit/audio-procedural.test.ts` as an input but never required actually running the audio system (mute toggle, hidden tab, decode failure simulation).
7. **Forgiving calibration.** A procedural-only synth with no manifest, no mute toggle, no visibilitychange handler scored 7. That should have scored 4-5 at best.

**Observable in `docs/iteration-log.md`:** audio scores 5\*, 4\*\*, 8, 8, 7, 7, 7, 7 across iters 1-8. Asterisks acknowledge the toolchain-only iterations (iter 1) and the legacy-port iter where 6 blockers were filed but committed anyway. The 7s on iters 5-8 are the scoring failure: nothing changed audio-side, the planned library still didn't exist, and yet the score sat at 7.

---

## 2. Design principles backing v2

Each axis and gate below traces to one or more cited principles. Principles inherit numbering scheme from `docs/FUN_CRITIC.md` (which uses P1-P19); audio principles are A1-A15.

| # | Principle | Source |
|---|---|---|
| A1 | **Autoplay-policy compliance** — AudioContext at module-load is silent until a user gesture; must be created or resumed inside a click/tap/key handler. | Chrome Autoplay Policy (Google 2018, developer.chrome.com/blog/autoplay); WHATWG HTML Living Standard "sticky activation"; MDN `BaseAudioContext`. |
| A2 | **`visibilitychange` suspend/resume** — running AudioContext consumes CPU/battery on hidden tabs and bleeds audio into other tabs. | Page Visibility API (W3C Recommendation 2022); Paul Adenot, "Web Audio API: Why Compose When You Can Code?" (Mozilla 2015). |
| A3 | **Decode-failure recovery** — `decodeAudioData()` rejects on corrupt/unsupported assets; every decode must have a `.catch()` and a fallback (alternate format, procedural, silence). | MDN `BaseAudioContext.decodeAudioData()`; WHATWG HTML on codec-support variation. |
| A4 | **Integrated loudness normalization (LUFS)** — perceived loudness ≠ peak amplitude; mismatched LUFS across a sample bank produces volume hell. Game target ≈ -16 to -23 LUFS integrated, true peak ≤ -1 dBTP. | ITU-R BS.1770-4 (ITU 2015); EBU R128 (2014, tech.ebu.ch/publications/r128). |
| A5 | **Variability / no-immediate-repeat** — exact-waveform repetition is perceived as glitch/stutter; need ≥3 variants per logical event with shuffle-bag selection (no-immediate-repeat) plus pitch/gain jitter. | Karen Collins, *Game Sound* (MIT 2008) Ch. 6; Aaron Marks, *The Complete Guide to Game Audio* 2nd ed. (Focal 2008) Ch. 8; Tervaniemi et al. (2000) on auditory mismatch negativity. |
| A6 | **Audio as juice channel** — audio within ~50ms of input or feel goes mushy; multimodal feedback density correlates with perceived game feel. | Steve Swink, *Game Feel* (Morgan Kaufmann/CRC 2008); Vlambeer "The Art of Screenshake" (INDIGO 2013); Pichlmair & Johansen, "Designing Game Feel," FDG 2020. |
| A7 | **`audioCtx.currentTime` not `setTimeout` for scheduling** — `setTimeout` jitters 5-50 ms; sample-accurate scheduling uses `source.start(audioCtx.currentTime + offset)`. | Chris Wilson, "A Tale of Two Clocks" (web.dev 2013); Adenot 2015. |
| A8 | **Format/bitrate budget** — game SFX rarely benefit from >128 kbps; mono content shouldn't ship as stereo; total payload budget for a kids' web game ≈ 2-4 MB. | Aaron Marks, *Complete Guide to Game Audio* Ch. 11; MDN "Web audio codec guide"; Mozilla Opus deployment guide. |
| A9 | **Procedural fallback / dual-stack audio** — game must not be silent when samples 404; either procedural-primary with samples as enrichment, or sample-primary with procedural fallback. | Karen Collins, *Game Sound* Ch. 6; Andy Farnell, *Designing Sound* (MIT 2010). |
| A10 | **Captions / visual indicators (WCAG SC 1.2.1, 1.4.7)** — every sound-conveyed game event must have a simultaneous visible counterpart so the game is playable muted. | WCAG 2.1 (W3C 2018), Success Criteria 1.2.1 and 1.4.7; Game Accessibility Guidelines (Hamilton et al., gameaccessibilityguidelines.com). |
| A11 | **One AudioContext per page** — browsers cap concurrent contexts (~6 in Chrome); creating per-sound is an immediate resource leak. | MDN `AudioContext`; Chris Wilson and Paul Adenot guidance ("just one AudioContext for your whole app"). |
| A12 | **True-peak limiting** — sample peaks ≤ 0 dBFS reconstruct to up to +3 dB after DAC + lossy codec; require ≤ -1 dBTP headroom. | ITU-R BS.1770-4 §"True-peak measurement"; Nielsen & Lund, "0 dBFS+ Levels in Digital Mastering" (AES Convention Paper 6105, 2003). |
| A13 | **Mute persistence (WCAG SC 1.4.2)** — user-set mute must survive reload via `localStorage` or equivalent. | WCAG 2.1 SC 1.4.2 "Audio Control"; Apple HIG and Material Design accessibility guidance. |
| A14 | **Buffer reuse / decode-once cache** — `AudioBuffer` is immutable and reusable; decode each sample once into a Map and create fresh `AudioBufferSourceNode` per play. | MDN `AudioBuffer`; Adenot Web Audio memory model. |
| A15 | **Web Audio chain hygiene** — every effect chain (`OscillatorNode` → filter → gain → destination) must be created with explicit cleanup; one-shot sources auto-disconnect after `onended`, but oscillators with no `stop()` leak. | MDN `OscillatorNode`, `AudioScheduledSourceNode`. |

---

## 3. The v2 rubric

### 3.1 Five mechanism-level axes

Each scored 1-10, average is the raw score, then capped by hard gates (§3.2).

| Axis | What it measures | Backing principles |
|---|---|---|
| **Lifecycle Robustness** | AudioContext lifecycle (autoplay-gated creation, single-context invariant), decode-failure recovery, scheduling precision (currentTime not setTimeout), buffer caching, oscillator cleanup. | A1, A3, A7, A11, A14, A15 |
| **Variety & Game Feel** | Variant pools per logical event (≥3 variants), no-immediate-repeat / shuffle-bag selection, pitch/gain jitter, input-to-audio latency under 50ms, audio coverage of player-input events ≥70%. | A5, A6 |
| **Mastering Quality** | Integrated LUFS within ±3 LU across the sample bank, true-peak ≤ -1 dBTP, format/bitrate sane (≤128 kbps SFX, ≤192 kbps music, mono content as mono), total payload within budget. | A4, A8, A12 |
| **Resilience & Production Reality** | Procedural fallback exists for every sample-driven event; if `package.json`'s `sfx:generate` (or equivalent) is declared, the manifest is present and matches the planned seed count; samples can 404 without silence. | A9 |
| **Accessibility & Persistence** | Every audio-conveyed event has a simultaneous visible indicator (WCAG SC 1.2.1); mute toggle exists, persists across reload, and stops in-progress audio; visibilitychange suspends/resumes context. | A2, A10, A13 |

### 3.2 Seven hard gates (auto-fail to ≤4)

A failure on **any** of these caps the score at 4 regardless of axis average. The critic must explicitly call out which gate(s) failed and provide evidence (file:line citations or scenario outputs).

1. **Audio Crash Gate** (preserved from v1). Unhandled `audioCtx === null`, AudioContext-construction throw not caught, or any uncaught exception thrown from a Launch handler → FAIL.
2. **Decode Failure Gate** (A3). Any `decodeAudioData()` call without an attached `.catch()` (or `try/await` recovery) and a defined fallback → FAIL. If no decode happens, gate passes by absence.
3. **Mute Failure Gate** (preserved from v1, expanded). Either (a) no mute control exists at all, OR (b) toggling mute mid-fart does not silence currently-playing audio within 200ms, OR (c) mute state does not persist across reload via localStorage → FAIL.
4. **Visibility Bleed Gate** (A2). No `visibilitychange` listener that calls `audioCtx.suspend()` when `document.hidden`, AND no equivalent suspension mechanism (e.g. tab-blur-based) → FAIL.
5. **Autoplay Silence Gate** (A1). `new AudioContext()` (or webkit equivalent) at module top-level outside a user-gesture handler, with no `.resume()` wired to a first-input listener → FAIL.
6. **Library Absence Gate** (A9, NEW). If `package.json` declares an audio-pipeline script (e.g. `sfx:generate`, `audio:build`) **and** `public/sfx/manifest.json` (or the project-specific manifest) is absent or empty at iteration end, FAIL — independent of whether procedural fallback works. The project committed to a library; absent it, ship status is incomplete and the rubric must say so. To clear without shipping the library, remove the script declaration from `package.json` and document the change in `docs/PLAN.md`.
7. **Loudness Chaos Gate** (A4). If multiple samples ship and there is no LUFS-normalization evidence in the build pipeline (e.g. an `ffmpeg loudnorm` step, `pyloudnorm` invocation, per-sample GainNode offsets, or a documented LUFS target with measurement), FAIL. Single-sample or no-sample setups pass by absence.

### 3.3 Required measurement step

Before scoring, the critic MUST execute the following measurements. Cite each in the diagnostics output.

| Measurement | Tool | Pass criterion |
|---|---|---|
| AudioContext construction-site audit | Grep `new AudioContext\|new \(.*\)?(Audio|webkit).*Context\(` in `src/` | All sites are inside user-gesture handlers OR resume() is wired |
| `visibilitychange` listener | Grep `visibilitychange` and inspect the handler | Calls `suspend()` when hidden, `resume()` when visible |
| Decode-failure handling | Grep `decodeAudioData` | Every call has `.catch` or `try/catch` |
| `setTimeout` driving audio | Grep `setTimeout.*\.start\b` near `src/audio/` | Zero hits (use `audioCtx.currentTime + offset`) |
| Mute toggle | Grep for `mute` references in src/, run mute mid-fart in dev server | Toggle exists; sets master gain to 0 within 200ms; persists via localStorage |
| Manifest presence | `ls public/sfx/manifest.json` | Present iff `sfx:generate` script exists |
| Manifest schema (if present) | Read manifest, validate `{id, name, prompt, file, durationMs, checksum}` per entry | All entries valid; ids unique |
| Sample inventory (if present) | `ls public/sfx/*.mp3` and per-file `ffprobe` | Each file >0 bytes; format per A8 budget |
| LUFS measurement (if samples exist) | `ffmpeg -af ebur128=peak=true` per sample | Integrated LUFS within ±3 LU; true peak ≤ -1 dBTP |
| Visual indicators for audio events | Inspect `src/main.ts` Launch handler | Each sound trigger has a paired visual fire (particle, animation, score popup) |

For the four required-simulation scenarios from `FUN_CRITIC.md` §3.4 (Mash-max / Mash-min / Median / Domain-skill), the audio critic additionally verifies each scenario produces *audibly distinct* output (different durations, different oscillator counts, different filter shapes) — not just procedurally varied parameters that converge on similar sound.

### 3.4 Calibration anchors

| Score | What it looks like |
|---|---|
| **9-10** | Sample library shipped (≥20 unique entries), LUFS-normalized to documented target, dual-stack with procedural fallback per category, visibilitychange + mute persisting + all-event captions, sample-accurate scheduling, buffer cache, ≤4 MB total payload. |
| **7-8** | Either samples shipped without full mastering OR procedural-only that hits all lifecycle/feel/accessibility gates and is genuinely the intended scope (documented as such in PLAN.md). |
| **5-6** | Audio works but has axis gaps: no LUFS evidence, weak variety, missing mute, no visibilitychange handler, or borderline accessibility. Plays but not shippable as-is. |
| **3-4** | Default for any iteration that fails ≥1 hard gate. The audio system has a structural defect. |
| **1-2** | Audio crashes, no audio at all, or critical accessibility absent (no visible indicators alongside sound). |

### 3.5 Output schema

Same shape as `FUN_CRITIC.md` §3.6. Orchestrator parsing in `PLAN.md` §F lines 376-385 reads `.score` and `.blockers`; new fields are additive.

```json
{
  "score": 4,
  "rationale": "<2-4 sentences citing specific principles by code A1-A15 and file:line>",
  "blockers": ["<must-fix items, including every hard-gate failure verbatim>"],
  "axisScores": {
    "lifecycleRobustness": 0,
    "varietyAndFeel": 0,
    "masteringQuality": 0,
    "resilience": 0,
    "accessibilityPersistence": 0
  },
  "diagnostics": {
    "audioContextConstructions": [{"file": "...", "line": 0, "userGestureGated": false}],
    "visibilityChangeHandled": false,
    "decodeFailurePaths": "<each decodeAudioData call + its handler>",
    "schedulingClock": "<currentTime | setTimeout | both>",
    "muteToggle": {"present": false, "stopsInProgress": false, "persists": false},
    "manifest": {"declared": false, "present": false, "entryCount": 0, "schemaValid": false},
    "samples": {"count": 0, "totalBytes": 0, "lufsRange": "<n/a if no samples>"},
    "captionsCoverage": {"audioEvents": 0, "visualIndicators": 0, "ratio": 0.0},
    "proceduralFallback": {"present": false, "primary": false, "covers": []},
    "simulation": {
      "mashMax": "<audible signature>",
      "mashMin": "<audible signature>",
      "median":  "<audible signature>",
      "domainSkill": "<audible signature>"
    }
  },
  "hardGatesFailed": ["..."]
}
```

### 3.6 Tools the critic may use

- **Read, Grep, Glob** — same as v1.
- **Bash (read-only)** — `ffprobe`, `ffmpeg -af ebur128`, `pyloudnorm`, `ls public/sfx/`. The critic should NOT run sample regeneration (`npm run sfx:generate`) — that is the job of the `Audio` tier's iteration code, not the critic.
- **Playwright via shell** — REQUIRED to run the four simulation scenarios from `FUN_CRITIC.md` §3.4 and capture audible signatures (oscillator-count proxy via `window.__audioStats` if present, otherwise rely on procedural code-trace). Mute and visibilitychange tests likewise via Playwright.
- **Iteration log** — for tracking which gates have ever cleared.

---

## 4. v2 applied to current Fart Factory state

Evaluating commit `11f58ec` on `overhaul-v2` — the head of the autonomous session per `docs/iteration-log.md` row 8.

### 4.1 Diagnostics

- **audioContextConstructions**: one site at [src/audio/procedural.ts:11](src/audio/procedural.ts:11) wrapped in `try/catch`, lazily created by `ensureAudio()` which is called from `playFart()` invoked only inside the Launch click handler at [src/main.ts:73](src/main.ts:73). User-gesture-gated. Passes A1.
- **visibilityChangeHandled**: false. Grep `visibilitychange` across `src/` returns zero hits. Fails A2 / Visibility Bleed Gate.
- **decodeFailurePaths**: n/a — `decodeAudioData` is not called anywhere in the codebase. Pass by absence.
- **schedulingClock**: uses `audioCtx.currentTime` for ramps and `start()`/`stop()` offsets at [src/audio/procedural.ts:37-49,73-85](src/audio/procedural.ts:37). No `setTimeout` driving audio. Passes A7.
- **muteToggle**: not present. Searching for `mute` in `src/` returns zero hits. Fails Mute Failure Gate (a) — no mute control exists.
- **manifest**: `package.json` declares `"sfx:generate": "tsx scripts/generate-sfx.ts"` ([package.json:14](package.json:14)). `public/sfx/manifest.json` is absent; `public/` directory does not exist. The script declaration commits the project to an audio pipeline that hasn't been run. Fails Library Absence Gate.
- **samples**: count=0, totalBytes=0. n/a for LUFS.
- **captionsCoverage**: Launch fires audio at [src/audio/procedural.ts:18](src/audio/procedural.ts:18) AND visual reactions at [src/visuals/gas.ts](src/visuals/gas.ts), [src/visuals/particles.ts](src/visuals/particles.ts), [src/content/commentary.ts:60](src/content/commentary.ts:60), AND haptics at [src/ui/haptics.ts:11](src/ui/haptics.ts:11). Every audio event has a visible counterpart. Passes A10.
- **proceduralFallback**: `playFart()` is the *only* sound source — procedural is primary, no samples exist. Robust to network failures (no fetches happen). Passes A9 *technically*, but only because the Library Absence Gate caught the deeper issue.
- **simulation** (procedural code-trace): Mash-max → 6 oscillator + 1 noise buffer + 4 musical overtones + 3 sputter pops, dur=2.8s. Mash-min → 1 oscillator, dur=0.55s, no noise (stinkiness=1, wetness=1 below thresholds at [src/audio/procedural.ts:55,75](src/audio/procedural.ts:55)). Median → ~3 oscillator/noise nodes, dur=1.55s. Mash-max and mash-min produce audibly distinct signatures. Passes the audible-distinctness check.

### 4.2 Per-axis scores

- **Lifecycle Robustness: 7.** AudioContext lifecycle is solid (try/catch, lazy creation, user-gesture-gated, single context). Scheduling uses `currentTime`. No decode pipeline to fail. The deduction is for missing `visibilitychange` (A2 — but the gate already catches this; the axis still drops).
- **Variety & Game Feel: 5.** Procedural synthesis varies durations and oscillator counts based on slider input. Pitch bends are randomized via `Math.random()` at [src/audio/procedural.ts:41](src/audio/procedural.ts:41). However, no variant *pool* per logical event — same parameters always produce the *same waveform skeleton*; A5's no-immediate-repeat / shuffle-bag pattern is absent. Input-to-audio latency under 100ms (single function call inside click handler). Coverage of input events: only Launch produces audio; the Random button does (it just clicks Launch); slider-drag produces no audio (could be a small juice opportunity). Coverage ~50%.
- **Mastering Quality: 3.** No samples to normalize. Procedural amplitude is set at [src/audio/procedural.ts:31](src/audio/procedural.ts:31) by `master.gain.value = 0.15 + volume * 0.07`, range ~[0.22, 0.85]. Reasonable headroom but no LUFS measurement, no documented target, no compressor/limiter on the master bus. A12 not enforced — at volume=10 with high stinkiness adding noise + 4 overtones + 3 sputters, the sum-of-amplitudes can briefly approach unity gain.
- **Resilience & Production Reality: 4.** Procedural-only game survives all network failures. *But:* the project's `package.json` commits to an SFX pipeline that hasn't shipped, and `docs/PLAN.md` §C describes 30+ ElevenLabs samples with checksum-cached generation. The gap between intent and reality is the entire score.
- **Accessibility & Persistence: 4.** Visual indicators per-event: ✓. Mute toggle: ✗. Volume control: ✗. Visibilitychange: ✗. Mute persistence: n/a (no mute). The captions story is good; the controls story is empty.

Average: (7+5+3+4+4)/5 = **4.6**.

### 4.3 Verdict

- **Hard gates failed**: Mute Failure (no mute exists at all → 3a), Visibility Bleed (no visibilitychange handler), Library Absence (`sfx:generate` declared in package.json but no manifest). **3 of 7.**
- **v2 score: 4** (raw average 4.6 capped at 4 by gate failure).
- **v1 score on the same artifact: 7** (iter 8). Delta: **−3**.

The v1→v2 delta is the proof v2 fires where v1 didn't. The autonomous session ran for 76 minutes, ended with the Audio critic giving 7s, and two of the three gates that v2 would have failed (mute, visibilitychange) are explicit follow-up items in `FINAL_REPORT.md` §"What did NOT ship" — exactly the items v2 would have blocked on. The Library Absence Gate would have prevented the §I "quality target hit" stop condition by keeping the audio score below 6 across all 8 iterations until the SFX pipeline shipped.

### 4.4 Blockers (must address before audio ≥ 6)

1. **Ship the SFX library OR remove the `sfx:generate` script.** Either run the planned Tier 2.7-2.10 work (manifest pipeline + 30+ samples + sample player + procedural fallback for unrecoverable assets) and clear the Library Absence Gate, or honestly document the project as procedural-only by removing `sfx:generate` from `package.json` and updating `docs/PLAN.md` §C.
2. **Add a mute toggle with localStorage persistence.** Reachable from main UI; mid-fart toggle must drop master gain to 0 within 200ms (e.g. `master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2)`). Persist boolean to localStorage; read on init before any audio scheduling.
3. **Add a `visibilitychange` listener.** Calls `audioCtx.suspend()` when `document.hidden`; `resume()` when visible. No audio scheduling allowed while suspended.
4. **(After samples ship)** add LUFS normalization evidence — either a build-time `ffmpeg -af loudnorm=I=-16:TP=-1.5:LRA=11` step in the SFX pipeline, or per-entry `gainOffsetDb` in the manifest applied at decode time.

Items 2 and 3 close the existing-flagged "scope-deferred" issues per FINAL_REPORT.md §"What did NOT ship" rows 2 and the audio side of row 1. Item 1 forces an honest scope decision.

---

## 5. Migration into PLAN.md

In `docs/PLAN.md` §F, replace the five-line "Audio critic" block (current text starting `### Audio critic` and ending with `mute mid-fart not stopping, no visibilitychange handler.`) with:

```markdown
### Audio critic

Full rubric: [docs/AUDIO_CRITIC.md](AUDIO_CRITIC.md). v2 evolves v1 with five mechanism-level axes, seven hard gates (incl. NEW Library Absence, Visibility Bleed, Loudness Chaos, Autoplay Silence), and a required measurement step.

- **Axes (5, each 1-10):** Lifecycle Robustness, Variety & Game Feel, Mastering Quality, Resilience & Production Reality, Accessibility & Persistence.
- **Hard gates (7, any failure caps score at 4):** Audio Crash, Decode Failure, Mute Failure, Visibility Bleed, Autoplay Silence, Library Absence (when `sfx:generate` declared but manifest absent), Loudness Chaos.
- **Required measurements:** AudioContext construction-site audit (grep), `visibilitychange` listener inspection, decode-failure handling grep, scheduling-clock check, mute toggle behavior test, manifest presence + schema, LUFS measurement on shipped samples.
- **Output schema:** `{score, rationale, blockers, axisScores, diagnostics, hardGatesFailed}` — see AUDIO_CRITIC.md §3.5.
- **Tools:** Read, Grep, Glob, Bash (read-only — `ffprobe`, `ffmpeg`), Playwright (for mute / visibilitychange / simulation scenarios).
```

The orchestrator's parsing logic at PLAN.md §F lines 376-385 needs **no change**.

---

## 6. Verification

| Scenario | v1 verdict | v2 expected verdict |
|---|---|---|
| Current Fart Factory @ `11f58ec` (autonomous-session HEAD) | audio=7, no blockers | **audio=4, 3 hard gates failed (mute, visibilitychange, library-absence)** |
| Same game with mute + visibilitychange added | (would still score similarly) | audio=5-6, library-absence gate still failing — score caps at 4 until SFX ships or script declaration removed |
| Same game with mute + visibilitychange + SFX library shipped (LUFS-normalized) | (would score similarly) | audio=8-9, all gates clear |
| Pure cosmetic iteration with no audio change (parallel to fun-critic row 4) | could score ≥7 in v1 | audio holds at 4 because gates the game already failed still fail |

§4 above is the executed verification of row 1: applying v2 to commit `11f58ec` produces score 4 with three gate failures explicitly named. v1 produced score 7. Delta: -3.

---

## 7. What v2 deliberately does not change

- The orchestrator loop / critic-spawning / JSON-parse retry at PLAN.md §E and §F lines 376-385.
- The Quality and Visual critics — those have their own v2 redesigns: see `docs/QUALITY_CRITIC.md` and `docs/VISUAL_CRITIC.md`.
- The 4-critic averaging math. v2's hard gates feed into the existing min<6 fixup trigger by emitting `blockers` on gate failure.

---

## 8. Open follow-ups

- A test fixture harness for the audio measurement step — ideally a Playwright helper that exposes `window.__audioStats = { lastSampleRMS, oscCount, suspended }` for assertion. PLAN.md §B already gestures at this for the mute test; v2 generalizes the need.
- Consider a Loudness Chaos *axis sub-test* (within-bank LUFS spread) once samples ship, in addition to the gate.
- The Library Absence Gate currently keys off `package.json` script names. Long-term, a more declarative `audio:plan` block in PLAN.md §C with target sample counts would let the gate compute "shipped vs planned" deltas precisely.
