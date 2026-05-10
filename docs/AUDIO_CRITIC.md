# Audio Critic v3 — Rubric & Operationalization

> Applies to multi-agent overhaul iterations on `overhaul-v2`. Replaces the
> five-line block at `docs/PLAN.md` §F (the "Audio critic" subsection).
> Same v1→v2→v3 redesign approach as `docs/FUN_CRITIC.md`. v3 adds a
> Sound Design Craft axis covering audio-as-art (Murch / Sonnenschein /
> Collins / Farnell / Stalling / Foley / G.A.N.G. criteria / comic
> timing / leitmotif / distinctiveness / diegetic-non-diegetic) — the
> aesthetic dimension v2 didn't measure.

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

### 1.1 What v3 adds to v2

v2 caught technical-integrity failures (no manifest, no mute, no visibilitychange, autoplay silence, loudness chaos). User stress-test exposed a further class v2 doesn't reach: **artistic craft.** A procedural fart synth could pass every v2 gate (clean lifecycle, normalized loudness, paired captions) and still sound like generic Web Audio synth output with no comic timing, no recognizable iconic effects, no tonal alignment with the cartoon-silly theme. v3 adds a sixth axis — **Sound Design Craft** — backed by 12 cited principles spanning film sound design (Walter Murch, David Sonnenschein), game audio aesthetics (Karen Collins, Andy Farnell), procedural sound design as authored behavior, the Stalling/Hanna-Barbera Mickey-Mousing tradition, Foley as performance, comic-timing structure (set-up + payoff), Wagner-derived leitmotif, distinctive-character-per-asset, and the diegetic vs non-diegetic layering distinction. The axis maps award-jury criteria (G.A.N.G., BAFTA Audio Achievement) into operationalizable lens-questions. v2 axes/gates remain unchanged; v3 is purely additive.

---

## 2. Design principles backing v3

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
| A16 | **Murch quadrant — encoded vs embodied; voiceless music vs musical voice** — every sound occupies a position in this 2D space; strong design intentionally places different events in different quadrants. | Walter Murch, *In the Blink of an Eye* (Silman-James 1995); Murch in Vincent LoBrutto, *Sound-On-Film* (Praeger 1994). |
| A17 | **Timbre as character** — spectral fingerprint (attack shape, harmonic content, spectral centroid) carries character information independent of pitch and loudness; each significant sound needs a "timbral identity card" — a spectral *shape*, not a translation of the same shape. | David Sonnenschein, *Sound Design* (Michael Wiese 2001) chs. 4-6. |
| A18 | **Frequency as space and size** — spectral content maps perceptually to physical attributes: sub-bass = mass/weight; mid = human-scale presence; sparkle highs = smallness/magic/comedy. Crafted sounds use frequency to communicate the object's implied physics. | Sonnenschein 2001 ch. 5. |
| A19 | **Aesthetic coherence with game tone/genre** — audio aesthetic must align with fiction; functionally-correct but aesthetically-wrong audio breaks the world. Five-second blind audition test: can a stranger describe the genre/tone from audio alone? | Karen Collins, *Game Sound* (MIT 2008) ch. 5. |
| A20 | **Procedural sound as authored behavior** — procedural synthesis IS design when modeled as physical narrative (gut pressure × sphincter aperture × gas composition × tissue resonance), not as a knob bank mapped 1:1 to UI labels. | Andy Farnell, *Designing Sound* (MIT 2010) Pt. III. |
| A21 | **Stalling / Mickey-Mousing — iconic single-purpose effects library** — sound tightly synced to visual; library of named, instantly-recognizable effects ("boing," "honk," "splat," "slide-whistle"); each effect plays its action in under one second when heard cold, out of context. | Daniel Goldmark, *Tunes for 'Toons* (UC Press 2005); Scott Curtis in Altman ed., *Sound Theory, Sound Practice* (Routledge 1992). |
| A22 | **Foley as performance, not recording** — each trigger shows expressive *micro-variation* (different attack, weight, inflection); two consecutive playbacks are never identical, but the variation is hand-shaped, not uniform-random. | Vanessa Theme Ament, *The Foley Grail* (Focal 2009) chs. 3-5. |
| A23 | **G.A.N.G. / BAFTA award criteria** — four common evaluation dimensions: (a) integration with gameplay/narrative, (b) distinctiveness of palette, (c) consistency of aesthetic across the game, (d) emotional impact. Asset must score ≥4/5 on all four to be jury-tier. | Game Audio Network Guild Awards (gang.org); BAFTA Games Audio Achievement (bafta.org/games); Karen Collins, *Playing with Sound* (MIT 2013) ch. 6. |
| A24 | **Comic timing — set-up + payoff structure** — a comedic sound has anticipation cue (50-200ms low-amplitude or silent wind-up) before the main hit. Without anticipation, the punch lands flat; without punch, anticipation has no resolution. | Mel Brooks practitioner consensus (*All About Me!*, Ballantine 2021); Steve Neale & Frank Krutnik, *Popular Film and Television Comedy* (Routledge 1990) ch. 3; BAFTA Comedy criteria. |
| A25 | **Leitmotif / tonal alignment** — recurring sonic motifs bind a world; the audio palette has *constraints* (which intervals, timbres, rhythms are "in" or "out"). Without constraints, you don't have a theme — you have synthesizer defaults. | Wagner, *Oper und Drama* (1851; Ellis trans 1893); Tim Summers, *Understanding Video Game Music* (Cambridge UP 2016) ch. 4 on Koji Kondo. |
| A26 | **Distinctive character per asset** — no two events are sonically interchangeable; played blind, listeners distinguish them ≥90% of the time. | Karen Collins (2008) ch. 5; Joonas Turner GDC 2015 "The Sound of Nuclear Throne." |
| A27 | **Diegetic vs non-diegetic layering** — sound from inside the world vs commentary on it; strong design uses both layers and exploits their interplay (a diegetic event triggers a non-diegetic sting). | Karen Collins & Mark Grimshaw eds., *The Oxford Handbook of Sound and Image in Digital Media* (Oxford UP 2013); Claudia Gorbman, *Unheard Melodies* (Indiana UP 1987). |

---

## 3. The v3 rubric

### 3.1 Six mechanism-level axes

Each scored 1-10, average is the raw score, then capped by hard gates (§3.2).

| Axis | What it measures | Backing principles |
|---|---|---|
| **Lifecycle Robustness** | AudioContext lifecycle (autoplay-gated creation, single-context invariant), decode-failure recovery, scheduling precision (currentTime not setTimeout), buffer caching, oscillator cleanup. | A1, A3, A7, A11, A14, A15 |
| **Variety & Game Feel** | Variant pools per logical event (≥3 variants), no-immediate-repeat / shuffle-bag selection, pitch/gain jitter, input-to-audio latency under 50ms, audio coverage of player-input events ≥70%. | A5, A6 |
| **Mastering Quality** | Integrated LUFS within ±3 LU across the sample bank, true-peak ≤ -1 dBTP, format/bitrate sane (≤128 kbps SFX, ≤192 kbps music, mono content as mono), total payload within budget. | A4, A8, A12 |
| **Resilience & Production Reality** | Procedural fallback exists for every sample-driven event; if `package.json`'s `sfx:generate` (or equivalent) is declared, the manifest is present and matches the planned seed count; samples can 404 without silence. | A9 |
| **Accessibility & Persistence** | Every audio-conveyed event has a simultaneous visible indicator (WCAG SC 1.2.1); mute toggle exists, persists across reload, and stops in-progress audio; visibilitychange suspends/resumes context. | A2, A10, A13 |
| **Sound Design Craft** *(new in v3)* | Audio-as-art: spectral *shape* changes per asset (not just translation); aesthetic alignment with game tone (5-second blind-audition test); procedural model is physical-narrative not knob-bank; iconic single-purpose effects library (Stalling test); micro-variation reads as performance not random-jitter; comic-timing structure (anticipation cue + payoff hit); leitmotif / tonal palette constraints documented; distinctive character per asset (≤10% blind-confusion rate); diegetic + non-diegetic layers both used. | A16-A27 |

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
| **9-10** | All 5 technical axes ≥7 AND **Sound Design Craft ≥7**: sample library shipped (≥20 unique entries), LUFS-normalized, dual-stack fallback, visibilitychange + mute persisting + all-event captions, sample-accurate scheduling, buffer cache, ≤4 MB payload — *plus* Stalling-test passes (named iconic effects), comic-timing anticipation cues present, blind-confusion <10%, palette constraints documented, ≥2 quadrants of the Murch grid populated. The audio carries the game's identity, not just its mechanics. |
| **7-8** | Technical axes mostly clean (samples or procedural-only intentionally); craft axis ≥5 (some named-asset library, basic comic timing, recognizable tonal palette). One of these is missing: full LUFS mastering, all-quadrant Murch coverage, full Stalling library. |
| **5-6** | Technical works but craft axis ≤4: parameter-space synthesis with no named effects, no comic structure, generic timbral palette. Audio plays but doesn't say anything about the game. |
| **3-4** | Default for any iteration that fails ≥1 hard gate. The audio system has a structural defect. |
| **1-2** | Audio crashes, no audio at all, or critical accessibility absent (no visible indicators alongside sound). |

A 9-10 cannot be reached on technical conformance alone. The Sound Design Craft axis is the gating bar between "engineered correctly" and "designed."

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
    "accessibilityPersistence": 0,
    "soundDesignCraft": 0
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
    "craft": {
      "murchQuadrantsPopulated": 0,
      "spectralShapeChangesAcrossParams": false,
      "tonalPaletteAlignment": "<5-second blind audition: stranger names genre = ?>",
      "physicalNarrativeModel": false,
      "namedIconicEffects": [],
      "stallingTestPasses": "<count of effects whose action is named cold in <1s>",
      "comicTimingAnticipationMs": 0,
      "performanceVsRandomJitter": "<performance | random | none>",
      "blindConfusionRatePct": 0,
      "leitmotifConstraintsDocumented": false,
      "diegeticLayers": [],
      "nonDiegeticLayers": []
    },
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
- **craft (new in v3)**:
  - **Murch quadrants populated**: 1 of 4. Every output sits in "embodied non-musical" — somatic noise. No encoded/symbolic events (no win-jingle, no narrator interjection); no pure-musical-voice events. **Fail A16.**
  - **Spectral shape changes across params**: false. The synth at [src/audio/procedural.ts:34-44](src/audio/procedural.ts:34) is `sawtooth + lowpass`. Parameters scale `baseFreq` and `lp.frequency` — they translate the spectrum, not change its shape. No format resonances toggle, no harmonic ratios swap. **Fail A17.**
  - **Tonal palette alignment** (5-second blind audition): listener cold would describe as "buzzy synth noise" or "Web Audio synth demo"; would not name "fart factory." **Fail A19.**
  - **Physical narrative model**: false. Slider names (`length`, `wetness`, `volume`, `stinkiness`, `temp`, `musical`) are UI labels, not physical variables (gut pressure, sphincter aperture, gas composition, tissue resonance). The synth is a knob bank. **Fail A20.**
  - **Named iconic effects**: zero. There is no "the squeaker," "the trumpet," "the wet flapper," "the silent-but-deadly" library. Only continuous parameter-space points. **Fail A21 (Stalling test).**
  - **Stalling-test passes**: 0 (no preset effects exist).
  - **Comic timing anticipation**: 0ms. `osc.start(now)` fires immediately at full amplitude per [src/audio/procedural.ts:52](src/audio/procedural.ts:52). The end-of-fart sputter at [src/audio/procedural.ts:89-101](src/audio/procedural.ts:89) is a coda, not a set-up. No silence-before-hit. **Fail A24.**
  - **Performance vs random-jitter**: random. Variation comes from `Math.random() * 60 - 30` on pitch bends ([src/audio/procedural.ts:41](src/audio/procedural.ts:41)). Uniform stochastic, not hand-shaped performance. **Fail A22 (Foley test).**
  - **Blind-confusion rate** (estimated): high. "Weak fart" (low-volume + short) and "strong fart" (high-volume + long) sound like the same fart at different scale. Not qualitatively distinct. **Fail A26.**
  - **Leitmotif constraints documented**: no. There's no audio-palette doc stating which intervals/timbres/rhythms are "in." The constraints are whatever the synth defaults emit. **Fail A25.**
  - **Diegetic / non-diegetic layers**: only diegetic (the fart itself). No non-diegetic celebration sting on S+, no commentator voice, no audio "narrator." **Fail A27.**

### 4.2 Per-axis scores

- **Lifecycle Robustness: 7.** AudioContext lifecycle is solid (try/catch, lazy creation, user-gesture-gated, single context). Scheduling uses `currentTime`. No decode pipeline to fail. The deduction is for missing `visibilitychange` (A2 — but the gate already catches this; the axis still drops).
- **Variety & Game Feel: 5.** Procedural synthesis varies durations and oscillator counts based on slider input. Pitch bends are randomized via `Math.random()` at [src/audio/procedural.ts:41](src/audio/procedural.ts:41). However, no variant *pool* per logical event — same parameters always produce the *same waveform skeleton*; A5's no-immediate-repeat / shuffle-bag pattern is absent. Input-to-audio latency under 100ms (single function call inside click handler). Coverage of input events: only Launch produces audio; the Random button does (it just clicks Launch); slider-drag produces no audio (could be a small juice opportunity). Coverage ~50%.
- **Mastering Quality: 3.** No samples to normalize. Procedural amplitude is set at [src/audio/procedural.ts:31](src/audio/procedural.ts:31) by `master.gain.value = 0.15 + volume * 0.07`, range ~[0.22, 0.85]. Reasonable headroom but no LUFS measurement, no documented target, no compressor/limiter on the master bus. A12 not enforced — at volume=10 with high stinkiness adding noise + 4 overtones + 3 sputters, the sum-of-amplitudes can briefly approach unity gain.
- **Resilience & Production Reality: 4.** Procedural-only game survives all network failures. *But:* the project's `package.json` commits to an SFX pipeline that hasn't shipped, and `docs/PLAN.md` §C describes 30+ ElevenLabs samples with checksum-cached generation. The gap between intent and reality is the entire score.
- **Accessibility & Persistence: 4.** Visual indicators per-event: ✓. Mute toggle: ✗. Volume control: ✗. Visibilitychange: ✗. Mute persistence: n/a (no mute). The captions story is good; the controls story is empty.
- **Sound Design Craft: 2** *(new in v3)*. Eight of nine craft sub-tests fail (Murch quadrants 1/4, no spectral shape change, no tonal alignment, knob-bank parameters, no named effects library, no comic anticipation, random-jitter not performance, no leitmotif constraints, no diegetic/non-diegetic layering). The synth is parametrically varied but artistically uniform — the Hanna-Barbera library would not have shipped any of these as a sound effect.

Average: (7+5+3+4+4+2)/6 = 25/6 = **4.17**.

### 4.3 Verdict

- **Hard gates failed**: Mute Failure (no mute exists at all → 3a), Visibility Bleed (no visibilitychange handler), Library Absence (`sfx:generate` declared in package.json but no manifest). **3 of 7.**
- **v3 score: 4** (raw average 4.17 capped at 4 by gate failure; the new Craft axis pulls raw average down from v2's 4.6 to 4.17, but score is gate-capped either way).
- **v2 score on the same artifact: 4.** Delta v2→v3: 0 final score, but Craft axis exposes 8 specific sub-test failures the technical axes didn't surface.
- **v1 score on the same artifact: 7** (iter 8). Delta v1→v3: **−3**.

The v3 delta is more about **specific diagnosis** than score. v2 said "fix mute, visibilitychange, library." v3 adds: "AND the procedural synth is parameter-space, not designed — no Murch quadrants, no Stalling library, no comic timing, no Foley performance, no leitmotif, no diegetic layering." When the v2 blockers ship (mute + visibilitychange + sample library), score uncaps to 4.17 raw — capped at 5-6 max because Craft is still 2/10. To clear 7-8, the sample library must also have *designed character* (named iconic effects with comic timing and tonal palette constraints), not just *exist*.

### 4.4 Blockers (must address before audio ≥ 6)

**v2 technical blockers (still required):**
1. **Ship the SFX library OR remove the `sfx:generate` script.** Either run the planned Tier 2.7-2.10 work (manifest pipeline + 30+ samples + sample player + procedural fallback for unrecoverable assets) and clear the Library Absence Gate, or honestly document the project as procedural-only by removing `sfx:generate` from `package.json` and updating `docs/PLAN.md` §C.
2. **Add a mute toggle with localStorage persistence.** Reachable from main UI; mid-fart toggle must drop master gain to 0 within 200ms (e.g. `master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2)`). Persist boolean to localStorage; read on init before any audio scheduling.
3. **Add a `visibilitychange` listener.** Calls `audioCtx.suspend()` when `document.hidden`; `resume()` when visible. No audio scheduling allowed while suspended.
4. **(After samples ship)** add LUFS normalization evidence — either a build-time `ffmpeg -af loudnorm=I=-16:TP=-1.5:LRA=11` step in the SFX pipeline, or per-entry `gainOffsetDb` in the manifest applied at decode time.

**v3 craft blockers (additional, must clear for audio ≥ 7-8):**
5. **Replace the parameter-space synth with a named-preset library** (Stalling A21, Collins A26). Define ≥8 named effects ("the squeaker," "the trumpet," "the wet flapper," "the silent-but-deadly," "the duck," "the rumble," "the sputter," "the staccato"). Each preset is a distinct *spectral shape* (different waveform, different filter chain, different envelope), not a different point in the same parameter space. Pass criterion: blind-listening test on 20 random triggers gets ≥8 distinct labels from a stranger.
6. **Add comic anticipation cues** (A24). Before the main fart, schedule a 100-200ms pre-roll: a soft "ahem" inhale, a creak of strain, or an audible silence. Use `audioCtx.currentTime + 0.15` to schedule the punch *after* the cue. The set-up + punch structure is the difference between a noise and a joke.
7. **Document the audio palette as constraints** (A25). Drop `docs/AUDIO_PALETTE.md` listing: which intervals are "in" (e.g. tritone for biohazard, perfect fifth for victory, minor second for "uh oh"); which timbres ("squelch" via short envelopes; "honk" via square wave; "rumble" via low sawtooth). Without constraints, you have no theme.
8. **Add a non-diegetic celebratory sting on S+** (A27). A 1-2 second musical phrase that comments on the achievement from outside the fictional world. Could be a triumphant trumpet, an angelic chorus, or a "Hallelujah" sample. Establishes the diegetic/non-diegetic dual layer.
9. **Replace `Math.random()` jitter with hand-shaped variation** (A22). Each preset gets 3-5 micro-variants with distinct attack inflections (e.g., the trumpet has variants for "confident," "hesitant," "exhausted"). Selection via shuffle-bag, not stochastic.

Items 5-9 are the gap between "audio works" and "audio is *designed*." Without them, even a fully shipped SFX library scores 5-6 on the Craft axis and caps the overall score at 6.

---

## 5. Migration into PLAN.md

In `docs/PLAN.md` §F, replace the five-line "Audio critic" block (current text starting `### Audio critic` and ending with `mute mid-fart not stopping, no visibilitychange handler.`) with:

```markdown
### Audio critic

Full rubric: [docs/AUDIO_CRITIC.md](AUDIO_CRITIC.md). v3 evolves v2 with a Sound Design Craft axis (audio-as-art): Murch quadrants, Sonnenschein timbre/frequency-as-character, Karen Collins aesthetic coherence, Farnell physical-narrative procedural model, Stalling iconic effects library, Foley performance-not-jitter, comic timing (set-up + punch), Wagner-derived leitmotif constraints, distinctive character per asset, diegetic vs non-diegetic layering. v2's five technical axes + seven gates remain unchanged.

- **Axes (6, each 1-10):** Lifecycle Robustness, Variety & Game Feel, Mastering Quality, Resilience & Production Reality, Accessibility & Persistence, Sound Design Craft *(new in v3)*.
- **Hard gates (7, any failure caps score at 4):** Audio Crash, Decode Failure, Mute Failure, Visibility Bleed, Autoplay Silence, Library Absence (when `sfx:generate` declared but manifest absent), Loudness Chaos.
- **Required measurements:** v2 technical battery + v3 craft diagnostic (Murch quadrant inventory, spectral-shape audit via FFT, Stalling-test blind label exercise, comic-timing envelope inspection, Foley vs random-jitter audit, leitmotif palette constraints check, diegetic layer audit).
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
