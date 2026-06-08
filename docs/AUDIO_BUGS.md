# Audio bug research — "no fart" + "sounds overlap"

Method: live reproduction in the running app (vite-dev, headless Chrome via Preview MCP) with the
WebAudio `start()` and `fetch` calls instrumented, **plus** a 6-angle code investigation. Findings below
are tagged **[LIVE]** (directly observed at runtime) or **[CODE]** (proven by reading the source).

## The decisive live trace

Instrumented one real BLAST (Beans plated, Granny Edna audience). One single launch scheduled **3** sounds:

| order | sound | `start(when)` | duration | gain (approx) | channel |
|-------|-------|---------------|----------|---------------|---------|
| 1 | anticipation cue (osc, 35 Hz) | 0.0s | 0.15s | 0.04–0.10 | — |
| 2 | **fart base** `rip-wet-med` | **0.2s** | 1.0s | **~0.18–0.3** | farts |
| 3 | **reaction** `haunted-mansion-moan` | **0.0s** | **2.0s** | **~0.58** | sfx |

`ctxState` was `running`; fetched `rip-wet-med.mp3` + `haunted-mansion-moan.mp3`. So the fart **is** wired and
**does** schedule. The problem is the mix: the crowd reaction starts *0.2s before* the fart, runs *twice as
long*, and is *~3× louder*. The quiet 35 Hz cue is inaudible on phone/laptop speakers. Net perceived result:
**you hear the crowd, not the fart** — which is exactly "no fart" + "sounds on top of each other" in one.

---

## Symptom A — "no fart that's played at all"

Ranked by how well each fits *"I hear other sounds but not the fart."*

### A1. Reaction stinger masks the fart on every launch  ⭐ most consistent — [LIVE]
`onStoryLaunch` runs `playFart` (plate.ts:671) and `renderAudienceReaction` (plate.ts:816) in the **same
synchronous tick** (no `await` between them on a non-perfect launch). `renderAudienceReaction` fires
`playEventSfx(reactionSfx, 5)` at `startAt=0` (result-panel.ts:98) — immediate. The code deliberately delays
the *voice* line 800ms "so it doesn't overlap the applause/moan" (result-panel.ts:104) but **never delays the
stinger relative to the fart**. With the stinger louder + longer + earlier, the fart is buried.
- Evidence: result-panel.ts:97-98, plate.ts:671 & 816, live gain/timing trace above.

### A2. Every sound before the first launch is silently dropped — [LIVE]
`playEventSfx` calls `getAudioContext()`, which **returns null until a context exists** ("Pre-launch — no
context yet; cue silently lost", event-sfx.ts:32-33). The context is only created inside `playFart`
(procedural.ts:39-52). So the audience **signature** that should greet you on load, and **food-eating sounds**
before your first blast, make no sound. Verified live: clicking a pantry food added it to the plate but
scheduled **0** audio (0 contexts, 0 fetches, 0 starts).

### A3. AudioContext is created `suspended` and never resumed on the launch gesture — [CODE], latent — [LIVE]
`ensureAudio()` does `new AudioContext()` with **no `resume()`**. The only `resumeAudio()` callers are the
tab `visibilitychange` handler (main.ts:25-31) and the mute-toggle (audio-popover.ts:149) — **not** the launch.
Per the autoplay policy a context is born `suspended`; desktop Chrome often auto-runs one created during a
gesture (which is why it played in my test), but **iOS Safari does not** → total silence until you background
and refocus the tab. Live-proven that the launch path does *not* resume: I forced the live context to
`suspended` and the code never called `resume()`. This causes *total* silence (incl. reactions), so it's
likely **not** the user's active cause if they hear other sounds — but it's a real latent bug.
- Evidence: procedural.ts:39-52, 62-64; main.ts:24-32; grep: no `resume` in the launch path.

### A4. (Conditional) Master/Farts channel persisted at 0, or manifest 404 → quiet procedural fallback — [CODE]
`playFart` early-returns if `!isChannelAudible('farts')` (procedural.ts:108); a legacy `fart_mute:true`
migrates to `master:0` (audio-settings.ts:37-48). If the manifest 404s (wrong base URL) or the first launch
races the manifest fetch, you fall to the **procedural-only** sawtooth, which is quieter and easy to miss.
Defaults are 100/100, so this only bites returning/muted users or a misconfigured URL.
- **Disambiguate on the user's device:** `window.__audioCtxState()`, `localStorage.getItem('fart_audio_channels')`,
  and Network tab `GET /fart-factory/sfx/manifest.json` (200 vs 404).

---

## Symptom B — "some sounds play on top of each other"

### B1. Reaction stinger overlaps the fart — every launch  ⭐ — [LIVE]
Same root as A1: stinger at `t=0` over fart at `t=0.2`, both ringing together (plus the +800ms voice on
loved/evacuated). This is the overlap you're hearing on a normal single launch.

### B2. No single-flight lock — a second press stacks a whole second fart — [CODE]
`onStoryLaunch` has no re-entrancy guard and the button isn't disabled during a launch; the charge meter's
`charging` flag only de-dupes one press. Blast again within ~1s and you get two cues + two stem stacks summing
at the destination (WebAudio has no polyphony cap).
- Evidence: plate.ts:908-916 (onRelease → onStoryLaunch, no guard), procedural.ts:99-255 (never stops prior sources).

### B3. Belly-meter tap easter egg has no debounce — [CODE]
`wireBellyMeterTap` calls `playFart(2,1,2,1,5,1)` on every click with no cooldown (plate.ts:1022-1023); rapid
taps stack into a buzzy chord.

### B4. Within-launch layering (cue + base + melody/sizzle/haze + legendary fanfare) — DESIGNED, not a bug
The multi-stem "readout" is intentional (PLAN v9 P6); per-stem gain caps at 0.95. Leave it alone.
*(Also investigated and ruled out: codex re-render listener stacking — `innerHTML` reset clears old listeners; no audio on that path.)*

---

## Recommended fixes (test-first, per red/green TDD)

1. **A1/B1 — stagger the reaction after the fart.** Delay the reaction stinger until the fart's main hit has
   landed/finished (e.g. fire `renderAudienceReaction`'s SFX after ~the fart duration, or schedule the stinger
   with a start offset), and/or duck the `farts` vs `sfx` mix. *Failing test:* the reaction SFX must be
   scheduled at `startAt >= fart main offset`, not 0.
2. **A3 — first-gesture unlock.** In `main.ts init()`, add one-time `pointerdown/keydown/touchstart` `{once:true}`
   listeners that call `ensureAudio()` + `resumeAudio()`. *Failing test:* fake suspended `AudioContext`, dispatch
   `pointerdown`, assert `resume()` called.
3. **A2 — create/resume the context up front** (folds into #2) so pre-launch signatures/food sounds aren't lost.
4. **B2 — single-flight launch lock.** Module-level `launchInFlight` flag in `onStoryLaunch`, cleared after the
   result renders / a fart-duration cooldown. *Failing test:* invoking the release handler twice in one tick
   calls `playFart` exactly once.
5. **B3 — debounce the belly-tap** (~250–350ms). *Failing test:* two clicks inside the window → one `playFart`.
6. **A4 hardening — `console.warn` in `loadManifest()`'s catch** so a 404 is diagnosable, not silent.
