/**
 * Story Mode pantry + plate + belly meter UI logic. Per PLAN.md §D Phase C
 * items 34-37. Wires localStorage state (pantry / belly) to the DOM
 * defined in index.html (#pantryGrid, #plate, #bellyFill, #plateSlotN).
 */

import { FOODS, type Food, getFood, foodBellySize, type FoodProperties } from '../state/food';
import { buildPantryGridHtml } from './pantry-grid';
import {
  loadPantry,
  loadPantryShowLocked,
  setPantryShowLocked,
  loadBelly,
  spendBelly,
  bellyCapacity,
  loadLastArea,
  setLastMatch,
  loadGold,
  loadResearchNotes,
  bumpBestMatch,
  bumpBestMatchOverall,
  addGold,
  addResearchNotes,
  markHiddenComboFound,
} from '../state/persistence';
import { resolveEquippedLaunch } from '../scoring/launch-resolver';
import { evaluateMatch, computeAxisFeedback, gradeForPct, starsForPct } from '../scoring/match';
import { classifyCriticalTier, criticalGoldBonus, criticalNotesBonus } from '../scoring/critical-tier';
import { awardGoldForEncounter, launchBaseGold, legendaryGold } from '../scoring/reward';
import { PASS_PCT, CHARGE } from '../scoring/tuning';
import { rollLootDrop, dropChanceForLaunch, rollLegendaryDrop } from '../scoring/loot-drops';
import { loadStreak, recordLaunchForStreak } from '../scoring/streak';
import { recordFoodUse, applyMasteryBonuses, loadFoodMastery } from '../scoring/food-mastery';
import { unlockFood, loadEquippedTreatment } from '../state/persistence';
import { encounterSeed, currentEncounterIdx } from '../state/run-state';
import { detectHiddenCombo } from '../scoring/hidden-combos';
import { rollUnicornEncounter, UNICORN_AUDIENCE } from '../state/unicorn-encounter';
import { awardResearchForLaunch } from '../scoring/research';
import { discoverFromPlate } from '../scoring/discovery';
import { renderNotebookCounter } from './notebook';
import {
  playEventSfxOneOf,
  FOOD_EATING_SFX,
  LEGENDARY_FANFARE_SFX,
  playEventSfx,
  playAudienceSignature,
  playAudienceArrival,
  playAudienceVoice,
} from '../audio/event-sfx';
import { shouldShowHint, recommendFoodsForAudience, incrementLaunchCount } from '../scoring/food-hint';
import { recordGoodLaunch, shouldAutoUnlockKitchen } from '../scoring/kitchen-unlock';
import { setKitchenMode } from './kitchen';
import { applyActiveBuffs, consumeBuffs, cancelOneRestrictionFromBuffs, goldMultiplierFromBuffs } from '../scoring/buffs';
import { applyLegendaryProps } from '../scoring/legendary-buffs';
import { pulseFartProfile } from './fart-profile';
import { renderPlatePreviewHtml } from './plate-preview';
import { discoverAxesFromFart, loadDiscoveredAxes } from '../state/axis-discovery';
import { playPerfectCinematic } from './perfect-cinematic';
import { showFeatureIntro } from './feature-intro';
import { shouldShowOnboarding } from './onboarding';
import {
  showKitchenUnlockToast,
  showHiddenComboSplash,
  showUltimateOverlay,
  showLootDropSplash,
  showCriticalSplash,
  showAxisDiscoverySplash,
  showDiscoverySplash,
  flashLegendaryFanfare,
  scheduleHide,
  showUnicornSplash,
} from './splashes';
import { renderAudienceReaction, renderStoryResult, scheduleGoldChime } from './result-panel';
import {
  recordLaunch as recordEncounterLaunch,
  getOrCreate as getEncounterProgress,
  isWowed,
  clearEncounterProgress,
  WOW_BONUS_GOLD,
  ENCORE_BONUS_GOLD,
} from '../state/encounter-progress';
import { mountChargeMeter } from './charge-meter';
import { createCooldownGate } from './cooldown-gate';
import { isHotSpotActive } from '../scoring/gameplus';
import { showReactionOverlay, type FooterAction } from './reaction-overlay';
import { loadFoodReveals, revealNextAxis, isFoodFullyRevealed } from '../state/food-reveals';
import { markComboSeen } from '../state/persistence';
import { axisEmoji } from './axis-emoji';
import { matchRecipe } from '../state/recipes';
import { renderCravingChipsHtml, diffPips } from './crowd-ticket';
import { renderTopBar } from './top-bar';
import { audienceReaction, reactionTextForAudience } from '../scoring/audience-reactions';
import { getRecipe } from '../state/recipes';
import { bumpStars, loadLastMatch, loadIntroShown, markIntroShown, loadDiscoveredRecipes } from '../state/persistence';
import { recordConquest } from '../state/conquests';
import type { Audience } from '../state/audience';
import { recordLaunchEvent } from '../state/daily-quest';
import { renderDailyQuest } from './daily-quest';
import { isArenaActive, submitArenaLaunch, maybeShowBossUnlockToast } from './boss-arena';
import { AREAS, getArea, type Area } from '../state/containment';
import { getDailyAudience } from '../state/audience';
import { audiencePoolForLocation } from '../state/location-progress';
import { playFart, onAudioUnlocked } from '../audio/procedural';
import { startMusic, duckMusic } from '../audio/music';
import { triggerHaptic, HAPTICS } from './haptics';
import { spawnGas } from '../visuals/gas';

const SLOTS = 4;

let plate: (string | null)[] = [null, null, null, null];
let bellySpentThisSession = 0; // remaining is loadBelly() - bellySpentThisSession; actual deduction happens on Launch

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function getPlate(): readonly (string | null)[] {
  return plate;
}

export function plateIngredientIds(): string[] {
  return plate.filter((id): id is string => id !== null);
}

export function clearPlate(): void {
  plate = [null, null, null, null];
}

export function remainingBelly(): number {
  return loadBelly() - bellySpentThisSession;
}

/**
 * Belly needed to make a real attempt at a crowd. Below this you're too stuffed
 * to keep eating — if you still haven't pleased them, the crowd gives up and
 * leaves. Tunable pressure knob (capacity is BELLY_CAPACITY).
 */
export const MIN_ATTEMPT_BELLY = 8;

export type CrowdOutcome = 'passed' | 'retry' | 'stuffed-fail';

/**
 * Post-launch branch: pleased them (passed), can still try (retry), or stuffed
 * with no win so the crowd walks off (stuffed-fail → soft fail, new crowd).
 */
export function crowdOutcome(passed: boolean, remaining: number, min = MIN_ATTEMPT_BELLY): CrowdOutcome {
  if (passed) return 'passed';
  return remaining < min ? 'stuffed-fail' : 'retry';
}

/**
 * Adds a food to the first empty plate slot. Refuses if plate full,
 * belly insufficient, or food not unlocked.
 * Returns true on success.
 */
export function addFoodToPlate(foodId: string): { ok: boolean; reason?: string; slotIdx?: number } {
  if (!loadPantry().includes(foodId)) return { ok: false, reason: 'not-unlocked' };
  const food = getFood(foodId);
  if (!food) return { ok: false, reason: 'unknown-food' };
  const emptyIdx = plate.findIndex((s) => s === null);
  if (emptyIdx === -1) return { ok: false, reason: 'plate-full' };
  if (foodBellySize(food) > remainingBelly()) return { ok: false, reason: 'insufficient-belly' };
  plate[emptyIdx] = foodId;
  bellySpentThisSession += foodBellySize(food);
  return { ok: true, slotIdx: emptyIdx };
}

/** Removes the food at the given slot. Refunds belly room for this session. */
export function removeFoodFromPlate(slotIdx: number): boolean {
  const id = plate[slotIdx];
  if (!id) return false;
  const food = getFood(id);
  if (food) bellySpentThisSession = Math.max(0, bellySpentThisSession - foodBellySize(food));
  plate[slotIdx] = null;
  return true;
}

/** Persist the spent belly to localStorage. Called at Launch time. */
export function commitBellySpend(): { ok: boolean; remaining: number } {
  if (bellySpentThisSession === 0) return { ok: true, remaining: loadBelly() };
  const result = spendBelly(bellySpentThisSession);
  if (result.ok) bellySpentThisSession = 0;
  return result;
}

// ----- Rendering -----

function rarityClassFor(food: Food): string {
  return `rarity-${food.rarity}`;
}

export function renderPantryGrid(): void {
  const grid = $('pantryGrid');
  if (!grid) return;
  const unlocked = new Set(loadPantry());
  const showLocked = loadPantryShowLocked();
  const { html, lockedCount } = buildPantryGridHtml(FOODS, unlocked, showLocked, loadFoodMastery, loadFoodReveals);
  grid.innerHTML = html;
  // V8 T5 — toggle button reflects the current state and the locked count.
  const toggle = $('pantryShowLockedBtn') as HTMLButtonElement | null;
  if (toggle) {
    if (lockedCount === 0) {
      toggle.setAttribute('hidden', '');
    } else {
      toggle.removeAttribute('hidden');
      toggle.textContent = showLocked
        ? '🔓 Hide locked teasers'
        : `🔒 Show locked teasers (+${lockedCount})`;
      toggle.setAttribute('aria-pressed', String(showLocked));
    }
  }
  // Wire clicks.
  grid.querySelectorAll<HTMLElement>('.food-card-clickable').forEach((el) => {
    const id = el.getAttribute('data-food');
    if (!id) return;
    el.addEventListener('click', () => {
      const result = addFoodToPlate(id);
      if (result.ok) {
        // P3: random food-eating cue (silent until operator runs sfx:generate).
        void playEventSfxOneOf(FOOD_EATING_SFX, 4);
        renderPlate();
        renderBellyMeter();
        // Phase L #67 — Disney wind-up/pop/settle on the plate slot.
        if (result.slotIdx !== undefined) {
          const slot = $(`plateSlot${result.slotIdx + 1}`);
          if (slot) {
            slot.classList.remove('plate-slot-popping');
            void slot.offsetWidth;
            slot.classList.add('plate-slot-popping');
            setTimeout(() => slot.classList.remove('plate-slot-popping'), 450);
          }
        }
        // Phase L #66 — belly meter brief shrink.
        const track = document.querySelector<HTMLElement>('.belly-track');
        if (track) {
          track.classList.remove('belly-deplete');
          void track.offsetWidth;
          track.classList.add('belly-deplete');
          setTimeout(() => track.classList.remove('belly-deplete'), 420);
        }
      } else {
        flashRefusal(el, result.reason ?? 'refused');
      }
    });
  });
}

function flashRefusal(el: HTMLElement, _reason: string): void {
  el.classList.remove('food-card-refused');
  void el.offsetWidth;
  el.classList.add('food-card-refused');
  setTimeout(() => el.classList.remove('food-card-refused'), 600);
}

export function renderPlate(): void {
  for (let i = 0; i < SLOTS; i++) {
    const slot = $(`plateSlot${i + 1}`);
    if (!slot) continue;
    const id = plate[i];
    if (id) {
      const food = getFood(id);
      if (!food) continue;
      slot.className = `plate-slot plate-slot-filled ${rarityClassFor(food)}`;
      // PLAN v9 UI-overhaul Phase 4 — emoji-only tile + a red remove badge.
      slot.innerHTML = `<span class="food-emoji">${food.emoji}</span><span class="rm" aria-hidden="true">×</span>`;
      slot.setAttribute('aria-label', `Plate slot ${i + 1}: ${food.name} (tap to remove)`);
    } else {
      slot.className = 'plate-slot';
      slot.innerHTML = '＋';
      slot.setAttribute('aria-label', `Plate slot ${i + 1} (empty)`);
    }
  }
  const countEl = $('plateCount');
  if (countEl) countEl.textContent = `${plate.filter(Boolean).length} / ${SLOTS} · tap to remove`;
  renderPlatePreview();
  renderRecipeRibbon();
}

/**
 * PLAN v9 P3 / 04 §2 — the live recipe ribbon. As soon as the plate forms a
 * named combo (exact-set match), a ribbon slides in below the slots so the
 * synergy is felt BEFORE blasting. Uses the real exact-set matchRecipe (D3:
 * extra foods suppress the recipe).
 */
export function renderRecipeRibbon(): void {
  const el = $('recipeRibbon');
  if (!el) return;
  const id = matchRecipe(plateIngredientIds());
  const recipe = id ? getRecipe(id) : null;
  // Discovery gate: the ribbon names a combo only once the player has actually
  // discovered it (same rule the notebook uses — undiscovered recipes show as
  // '???'). Without this, plating an undiscovered hidden recipe spoiled its
  // name in the ribbon before the player ever launched it.
  if (!recipe || !id || !new Set(loadDiscoveredRecipes()).has(id)) {
    el.setAttribute('hidden', '');
    el.innerHTML = '';
    return;
  }
  const bonusAxes = (Object.keys(recipe.bonus) as Array<keyof FoodProperties>)
    .filter((k) => (recipe.bonus[k] ?? 0) > 0)
    .map((k) => axisEmoji(k))
    .join('');
  el.innerHTML = `<span class="rb-spark">⚡</span><div class="rb-body"><div class="rb-nm">${recipe.emoji} ${recipe.name}</div><div class="rb-ef">${recipe.description ?? 'Named combo bonus'} ${bonusAxes}</div></div>`;
  el.removeAttribute('hidden');
}

/**
 * V8 T2 — render the 🔮 PREDICTION card above the plate. Naive property
 * sum (no synergies/treatments — those reveal at launch). Marks
 * UNCERTAIN whenever any plate food is below Apprentice mastery.
 */
export function renderPlatePreview(): void {
  const el = $('platePreview');
  if (!el) return;
  const ids = plateIngredientIds();
  if (ids.length === 0) {
    el.setAttribute('hidden', '');
    el.innerHTML = '';
    return;
  }
  // The prediction must NOT reveal the exact launched fart until you've fully
  // LEARNED every plated ingredient (all its axes revealed) — otherwise you
  // could read the answer off the card and trivialise the level. Until then it's
  // a rough RAW estimate flagged UNCERTAIN; once fully known it shows the precise
  // launched fart (same resolver as onStoryLaunch — the mastery payoff).
  const fullyKnown = ids.every((id) => {
    const food = getFood(id);
    return food ? isFoodFullyRevealed(id, food.properties) : false;
  });
  let shown: FoodProperties;
  if (fullyKnown) {
    shown = resolveLaunchProps(ids).props;
  } else {
    shown = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
    for (const id of ids) {
      const food = getFood(id);
      if (!food) continue;
      for (const a of Object.keys(shown) as Array<keyof FoodProperties>) {
        // True summed magnitude (no 5-cap) so the rough preview agrees in scale
        // with the fully-known branch above + the actual launched fart.
        shown[a] = shown[a] + food.properties[a];
      }
    }
  }
  el.innerHTML = renderPlatePreviewHtml(shown, loadDiscoveredAxes(), !fullyKnown);
  el.removeAttribute('hidden');
}

export function renderBellyMeter(): void {
  const fill = $('bellyFill');
  const value = $('bellyValue');
  const cap = $('bellyCap');
  const r = remainingBelly();
  // Capacity is per-encounter: an intermission belly activity can boost it for
  // this crowd (eat more), so the meter denominator tracks the live capacity.
  const capacity = bellyCapacity();
  const used = capacity - r; // how FULL the stomach is (fills as you eat)
  if (fill) fill.style.width = `${(used / capacity) * 100}%`;
  if (value) value.textContent = String(used);
  if (cap) cap.textContent = String(capacity);
  // Keep the role="meter" accessible value in sync — it shows fullness now.
  const track = document.querySelector<HTMLElement>('.belly-track');
  if (track) {
    track.setAttribute('aria-valuenow', String(used));
    track.setAttribute('aria-valuemax', String(capacity));
    // Danger zone: nearly stuffed — one (or no) attempt's worth of room left.
    track.classList.toggle('belly-low', r < MIN_ATTEMPT_BELLY + 4);
  }
}

/** PR9: repaint the Move On button to advertise the encore bonus once
 *  the current audience is wowed.
 */
export function paintMoveOnButton(wowed: boolean): void {
  const btn = $('moveOnBtn');
  if (!btn) return;
  if (wowed) {
    btn.textContent = `➡ Move On — Encore +${ENCORE_BONUS_GOLD}💰`;
    btn.classList.add('move-on-encore');
    btn.setAttribute('aria-label', `Move On to the next audience (claims ${ENCORE_BONUS_GOLD} gold encore bonus)`);
  } else {
    btn.textContent = '➡ Move On';
    btn.classList.remove('move-on-encore');
    btn.setAttribute('aria-label', 'Move On to the next audience (fresh crowd, empty stomach)');
  }
}

/** PR9: Wow splash — fires the first time the current encounter crosses 85%. */
function showWowSplash(aud: Audience, pct: number): void {
  const splash = document.getElementById('discoverySplash');
  if (!splash) return;
  splash.innerHTML = `<div class="discovery-splash-card rarity-legendary">
    <div class="discovery-splash-banner">🎉 YOU WOWED THEM! 🎉</div>
    <div class="discovery-splash-emoji">${aud.emoji}</div>
    <div class="discovery-splash-name">${aud.name} — ${pct}% match</div>
    <div class="discovery-splash-desc">+${WOW_BONUS_GOLD}💰 wow bonus. Move On to claim the encore.</div>
    <div class="discovery-splash-hint">🏆 Added to your Conquests</div>
  </div>`;
  splash.removeAttribute('hidden');
  splash.classList.remove('discovery-splash-show');
  void splash.offsetWidth;
  splash.classList.add('discovery-splash-show');
  scheduleHide(splash, 'discovery-splash-show', 3500);
}

/**
 * Advance past the current crowd: claim any encore, run the intermission, then
 * re-render the next encounter. Driven by both the reaction footer's "Next/
 * Finish" (PLAN v9 P2) and the standalone Move On button.
 */
function advanceToNextEncounter(): void {
  // PR10 — drumroll cue announces the transition.
  void playEventSfx('drumroll', 5);
  // PR9: claim encore bonus if currently wowed.
  const aud = currentAudience();
  if (isWowed(aud.id, currentEncounterIdx())) {
    addGold(ENCORE_BONUS_GOLD);
  }
  clearEncounterProgress();
  paintMoveOnButton(false);
  // Lazy-import to avoid static circular dep.
  import('./intermission').then(({ openIntermission }) => {
    openIntermission(() => {
      // After the intermission resolves: re-render everything that
      // depends on encounter idx (audience, hot-spot, belly meter, etc.).
      clearPlate();
      renderAudiencePortrait();
      renderAreaDisplay();
      renderActiveBuffStrip();
      renderPlate();
      renderBellyMeter();
      renderProgression();
      renderPantryGrid();
      renderFirstLaunchHint();
      renderMoveOnGate();
      // Hide any leftover result/reaction strip.
      $('storyResult')?.setAttribute('hidden', '');
      $('audienceReaction')?.setAttribute('hidden', '');
      $('discoverySplash')?.setAttribute('hidden', '');
      // PR10 — the next audience announces itself: signature cue, then its
      // spoken intro greeting a beat later (sound overhaul).
      const nextAud = currentAudience();
      void playAudienceArrival(nextAud.id);
    });
  });
}

/** Wire the Move On button to the shared advance routine. */
function wireMoveOnButton(): void {
  $('moveOnBtn')?.addEventListener('click', advanceToNextEncounter);
}

/**
 * PLAN v9 P2 / 01 §4 — the per-encounter pass gate. You may only advance once
 * the current crowd has been passed (best match this encounter ≥ 50%). Until
 * then the Move On button is disabled; the reaction footer offers only retry.
 */
export function renderMoveOnGate(): void {
  const btn = $('moveOnBtn') as HTMLButtonElement | null;
  if (!btn) return;
  const aud = currentAudience();
  const passed = getEncounterProgress(aud.id, currentEncounterIdx()).bestPct >= PASS_PCT;
  btn.disabled = !passed;
  btn.classList.toggle('move-on-locked', !passed);
  btn.setAttribute('aria-disabled', String(!passed));
}

/** Render a "current buff" strip showing the player which buff applies to next launch. */
function renderActiveBuffStrip(): void {
  const strip = $('activeBuffStrip');
  if (!strip) return;
  // Lazy-import buffs (also avoids circular)
  import('../scoring/buffs').then(({ loadActiveBuffs }) => {
    const buffs = loadActiveBuffs();
    if (buffs.length === 0) {
      strip.setAttribute('hidden', '');
      return;
    }
    strip.removeAttribute('hidden');
    strip.innerHTML = '✨ Next launch: ' + buffs.map((b) => `<span class="active-buff-chip">${b.emoji} ${b.name}</span>`).join(' ');
  });
}

export function renderProgression(): void {
  const goldEl = $('goldCount');
  const notesEl = $('notesCount');
  if (goldEl) goldEl.textContent = String(loadGold());
  if (notesEl) notesEl.textContent = String(loadResearchNotes());
  renderTopBar(); // PLAN v9 UI-overhaul Phase 1 — region + "Show N of M"
}

export function wirePlateSlots(): void {
  for (let i = 0; i < SLOTS; i++) {
    const slot = $(`plateSlot${i + 1}`);
    if (!slot) continue;
    slot.addEventListener('click', () => {
      if (removeFoodFromPlate(i)) {
        // PR10 — soft "pluck" SFX when a food is removed.
        void playEventSfx('plate-pluck', 3);
        renderPlate();
        renderBellyMeter();
      }
    });
  }
}

function clampUiAxis(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

/**
 * Maps recipe-result properties (each 0-15 typical range after sums + synergies)
 * to the slider 1-10 space that existing playFart consumes. Per PLAN.md §D
 * Phase D item 41 — Launch button reads plate, computes fart, calls existing
 * playFart. Phase E will introduce containment-area modifiers and audience-
 * match scoring; this step just wires the audio.
 */
function recipeToSliderInputs(p: FoodProperties): [number, number, number, number, number, number] {
  // Original playFart signature: (length, wetness, volume, stinkiness, temp, musical)
  return [
    clampUiAxis(p.length),
    clampUiAxis(p.wet - p.dry / 2 + 5),
    clampUiAxis(p.loud + 3),
    clampUiAxis(p.stink),
    clampUiAxis(p.temp + 3),
    clampUiAxis(p.musical + 2),
  ];
}

function applyAreaModifiers(props: FoodProperties, area: Area): FoodProperties {
  const m = area.modifiers;
  return {
    wet: props.wet * m.wet,
    dry: props.dry * m.dry,
    stink: props.stink * m.stink,
    loud: props.loud * m.loud,
    musical: props.musical * m.musical,
    length: props.length * m.length,
    temp: props.temp * m.temp,
  };
}

// ----- Audience portrait + area picker -----

export function renderAudiencePortrait(): void {
  const aud = currentAudience();
  const emojiEl = $('audiencePortraitEmoji');
  const nameEl = $('audienceName');
  const flavorEl = $('audienceFlavor');
  // V8 T6 — Hard/Easy mode toggle removed. Prose hint replaces the
  // literal cravings/restrictions exposition; the audience's `description`
  // field IS the hint, with clue density baked in via difficultyTier.
  const cravingsEl = $('audienceCravings');
  const restrictionsEl = $('audienceRestrictions');
  if (emojiEl) {
    emojiEl.textContent = aud.emoji;
    emojiEl.className = `audience-portrait audience-portrait-idle audience-portrait-tier-${aud.difficultyTier}`;
  }
  if (nameEl) {
    nameEl.textContent = aud.name;
    nameEl.setAttribute('data-audience-id', aud.id);
  }
  // PLAN v9 UI-overhaul Phase 4 — difficulty pips on the ticket head.
  const pipsEl = $('audienceDiffPips');
  if (pipsEl) pipsEl.textContent = diffPips(aud.difficultyTier);
  if (flavorEl) flavorEl.textContent = aud.description;
  // PLAN v9 P4 — the Order Ticket "They're craving" chips (labels only, no
  // integers). The prose `description` remains the speech-bubble hint.
  if (cravingsEl) {
    cravingsEl.innerHTML = renderCravingChipsHtml(aud);
    cravingsEl.removeAttribute('hidden');
  }
  if (restrictionsEl) restrictionsEl.textContent = '';
  maybeGrantOnEncounter(aud);
}

/**
 * PLAN v9 P3 / 01 §7.4 — "a new thing every show". The first time the player
 * meets an audience, grant its `grant` food (once) and announce it. Gated by
 * the per-audience intro-shown flag so it fires exactly once.
 */
function maybeGrantOnEncounter(aud: Audience): void {
  if (loadIntroShown(aud.id)) return;
  markIntroShown(aud.id);
  if (!aud.grant) return;
  const food = getFood(aud.grant);
  if (!food || loadPantry().includes(aud.grant)) return;
  unlockFood(aud.grant);
  renderPantryGrid();
  // Don't stack a reveal modal on top of the first-launch onboarding — the food
  // is still granted (and shown in the "Try these" hint); the reveal modal is
  // for later grants once onboarding is done.
  if (shouldShowOnboarding()) return;
  showFeatureIntro({
    id: `grant_${aud.id}`,
    emoji: food.emoji,
    // feature-intro escapes its body, so pass plain text (no HTML markup).
    title: 'A new food appeared!',
    body: `${food.name} joined your pantry — ${aud.name} will love what it brings.`,
    cta: 'Plate it up',
  });
}



/** P7: first-launch hint banner — render before #audienceReaction. */
export function renderFirstLaunchHint(): void {
  const banner = $('firstLaunchHint');
  if (!banner) return;
  if (!shouldShowHint()) {
    banner.setAttribute('hidden', '');
    return;
  }
  const aud = currentAudience();
  const recs = recommendFoodsForAudience(aud, new Set(loadPantry()));
  if (recs.length === 0) {
    banner.setAttribute('hidden', '');
    return;
  }
  const chips = recs.map((f) => `<span class="hint-chip">${f.emoji} ${f.name}</span>`).join('');
  banner.innerHTML = `
    <span class="hint-prefix">💡 Try these for ${aud.emoji} ${aud.name}:</span>
    ${chips}
  `;
  banner.removeAttribute('hidden');
}

function renderAreaDisplay(): void {
  const el = $('areaCurrentName');
  if (!el) return;
  const cur = getArea(loadLastArea()) ?? AREAS[0]!;
  // Surface the GamePlus Hot Spot so its 3x gold is actually visible.
  const badge = isHotSpotActive(cur.id)
    ? ' <span class="hot-spot-badge" title="Launch here for triple gold">🔥 Hot Spot · 3× gold</span>'
    : '';
  el.innerHTML = `${cur.emoji} ${cur.name}${badge}`;
  el.setAttribute('data-area', cur.id);
}

/**
 * Audience for today + current location. Replaces bare `getDailyAudience()`
 * calls so the audience pool respects region-locked locations (Phase Q
 * item 83 + Phase S item 88).
 */
function currentAudience(): ReturnType<typeof getDailyAudience> {
  // T4.2: 4% chance per encounter that the Mystery Unicorn appears
  // instead. Deterministic per encounter idx so reloads see the same.
  const idx = currentEncounterIdx();
  const unicornSeed = encounterSeed(idx) ^ 0xc0ffee;
  if (rollUnicornEncounter(unicornSeed)) return UNICORN_AUDIENCE;
  const area = getArea(loadLastArea()) ?? AREAS[0]!;
  const pool = audiencePoolForLocation(area);
  return getDailyAudience(new Date(), pool);
}


// PLAN v9 — single-flight launch. WebAudio has no polyphony cap, so a second
// Launch while the first fart is still ringing stacks a whole second fart chain
// that sums at the destination (the "sounds overlap" report). Gate re-launches
// to one per LAUNCH_COOLDOWN_MS; in normal play the plate must be re-filled
// between launches so this only blocks a pathological double-tap.
const LAUNCH_COOLDOWN_MS = 1200;
const launchGate = createCooldownGate(LAUNCH_COOLDOWN_MS);

/**
 * The deterministic launched-fart properties: equipped treatment + active buffs
 * + mastery + legendary passive + current-area modifiers, in the exact order the
 * launch applies them. SHARED by onStoryLaunch and the 🔮 PREDICTION preview so
 * the two can never drift (the preview used to show a raw sum and silently
 * disagreed with the actual fart on every launch — the area alone halves
 * wet/stink and boosts loud at Backyard).
 */
export function resolveLaunchProps(ids: string[]): {
  props: FoodProperties;
  resolved: ReturnType<typeof resolveEquippedLaunch>;
} {
  const resolved = resolveEquippedLaunch(ids, loadEquippedTreatment());
  const area = getArea(loadLastArea()) ?? AREAS[0]!;
  const props = applyAreaModifiers(
    applyLegendaryProps(applyMasteryBonuses(applyActiveBuffs(resolved.props), ids)),
    area,
  );
  return { props, resolved };
}

async function onStoryLaunch(quality = 1): Promise<void> {
  if (!launchGate.open()) return;
  const ids = plateIngredientIds();
  const ingredientCount = ids.length;
  // P6: launch resolution shared with the PREDICTION preview (resolveLaunchProps)
  // so what you previewed is exactly what you launch.
  const { props: propsAfterArea, resolved } = resolveLaunchProps(ids);
  const recipe = resolved.rawRecipe; // synergies/conflicts still come from raw path
  // The fart bank reads the RAW plate magnitude (unclamped sum), NOT
  // propsAfterArea — the scored vector folds in venue area modifiers (the
  // Backyard alone halves wet/stink), which would distort the readout. The
  // fart is a readout of what you actually plated, so it uses the true sums.
  const audioProps = recipe.props;
  const areaId = loadLastArea();
  const area = getArea(areaId) ?? AREAS[0]!;

  // Boss arena fork: if an arena is active, route the launch there.
  // Audio + visual still fire (we want full feedback). The arena handles
  // the scoring + win/lose state.
  if (isArenaActive()) {
    const [aL, aW, aV, aS, aT, aM] = recipeToSliderInputs(propsAfterArea);
    triggerHaptic(HAPTICS.launch);
    const arenaFartS = playFart(aL, aW, aV, aS, aT, aM, audioProps);
    duckMusic(arenaFartS + 1.0); // music never talks over the fart
    spawnGas(aS, aV);
    commitBellySpend();
    // Read declared target (Boss 5 only) from the arena's select.
    const targetSelect = document.getElementById('arenaTargetSelect') as HTMLSelectElement | null;
    const targetIdx = targetSelect ? parseInt(targetSelect.value, 10) : null;
    submitArenaLaunch({
      ingredientIds: ids,
      propsAfterArea,
      targetAudienceIdx: targetIdx !== null && !Number.isNaN(targetIdx) ? targetIdx : null,
      // The charge meter sweeps in the arena too — forward its multiplier so
      // the timing skill it advertises actually affects boss scoring.
      quality,
    });
    clearPlate();
    renderPlate();
    renderBellyMeter();
    return;
  }

  const aud = currentAudience();
  // PLAN_v5 Phase 6: Long Shower buff cancels one of the audience's
  // restrictions for this launch (the first one in the list).
  const restrictions = aud.restrictions && cancelOneRestrictionFromBuffs()
    ? aud.restrictions.slice(1)
    : aud.restrictions;
  // T4.1: hidden plate combos detect BEFORE scoring.
  const priorStreak = loadStreak();
  const hiddenCombo = ingredientCount > 0
    ? detectHiddenCombo(ids, {
        audienceId: aud.id,
        areaId,
        getMasteryUses: loadFoodMastery,
        streak: priorStreak,
      })
    : null;
  const baseMatch = evaluateMatch(propsAfterArea, ids, aud.cravings, restrictions, quality);
  const match = hiddenCombo?.guaranteedPerfect
    ? { pct: 100, violations: [] as string[] }
    : baseMatch;
  // PLAN v9 P2 — the pre-charge pct so the breakdown can show the charge line.
  const preChargePct = hiddenCombo?.guaranteedPerfect
    ? 100
    : evaluateMatch(propsAfterArea, ids, aud.cravings, restrictions, 1).pct;
  const passedThisLaunch = match.pct >= PASS_PCT;
  let goldPaid = 0;
  const learnedToasts: string[] = [];
  // The "why N%?" breakdown is sourced from the same normalized feedback model
  // as the headline % (not the legacy raw-scale computeMatchBreakdown) so its
  // ✓/✗ can't contradict the score.
  const axisFeedback = computeAxisFeedback(propsAfterArea, aud);
  const discovery = ingredientCount > 0 ? discoverFromPlate(ids) : null;

  const [length, wetness, volume, stink, temp, musical] = recipeToSliderInputs(propsAfterArea);

  triggerHaptic(HAPTICS.launch);
  // The fart bank: pass the RAW plate props (audioProps) so playFart picks the
  // matching grid clip from the true plate magnitude. Its return value is the
  // real clip duration — the crowd reaction is staggered past it.
  const fartDurationMs = Math.round(playFart(length, wetness, volume, stink, temp, musical, audioProps) * 1000);
  // Duck the music through the fart + the crowd's comic beat after it.
  duckMusic(fartDurationMs / 1000 + 1.0);
  spawnGas(stink, volume);

  // Phase J item 60 — legendary fanfare on the audience portrait.
  const legendaryCount = ids.filter((id) => getFood(id)?.rarity === 'legendary').length;
  const hasLegendary = legendaryCount >= 1;
  if (hasLegendary) {
    flashLegendaryFanfare();
    void playEventSfx(LEGENDARY_FANFARE_SFX, 7);
  }
  // T3.1: ULTIMATE LAUNCH — ≥2 legendary foods triggers a full cinematic.
  if (legendaryCount >= 2 && ingredientCount > 0) {
    showUltimateOverlay(legendaryCount);
    // Ultimate bonus: +10 gold + +5 notes (legendary +10% applies to all match gold).
    addGold(legendaryGold(10));
    addResearchNotes(5);
  }

  commitBellySpend();

  // T1.2: classify critical tier (PERFECT/GREAT/OK/BAD/DISASTER)
  const tier = classifyCriticalTier(match);

  if (ingredientCount > 0) {
    // PLAN v9 P2 / 01 §4.3 — gold is the anti-grind improvement-only payout,
    // paid only on a pass; replaces the per-launch diminishing/streak/buff
    // stack (D5). Streak is still recorded for its own UI + SFX. Stars ratchet
    // per crowd to drive the venue ladder.
    recordLaunchForStreak(match.pct);
    if (passedThisLaunch) {
      // launchBaseGold folds in the GamePlus Hot Spot 3x; awardGoldForEncounter
      // folds in the legendary +10% — both reach the live payout now.
      // Fold in the Watch Comedy "+20% gold" intermission buff (was inert —
      // promised in the UI but never reached the payout).
      const base = Math.round(launchBaseGold(aud, areaId) * goldMultiplierFromBuffs());
      goldPaid = awardGoldForEncounter(aud.id, base, match.pct);
      // Receipt after reward: a soft coin chime once the crowd stinger lands.
      scheduleGoldChime(goldPaid, fartDurationMs);
      bumpStars(aud.id, starsForPct(match.pct));
    }
    awardResearchForLaunch(match.pct);
    // PR9: record this launch against the encounter. justWowed iff we
    // crossed the threshold for the first time this encounter.
    const { justWowed, progress: encounterProg } = recordEncounterLaunch(
      aud.id,
      currentEncounterIdx(),
      match.pct,
    );
    if (justWowed) {
      addGold(legendaryGold(WOW_BONUS_GOLD));
      recordConquest(aud.id, match.pct);
      showWowSplash(aud, match.pct);
    }
    paintMoveOnButton(encounterProg.wowed);
    renderMoveOnGate(); // the launch may have just passed the crowd — unlock Move On
    // T1.2: critical bonus — PERFECT/GREAT add gold; DISASTER adds consolation notes.
    const goldBonus = criticalGoldBonus(tier);
    const notesBonus = criticalNotesBonus(tier);
    if (goldBonus > 0) addGold(legendaryGold(goldBonus));
    if (notesBonus > 0) addResearchNotes(notesBonus);
    // T2.3: record food uses for mastery
    recordFoodUse(ids);
    // PLAN v9 P3 / 01 §6 — reveal one axis per unique food (strongest first).
    for (const id of new Set(ids)) {
      const f = getFood(id);
      if (!f) continue;
      const rev = revealNextAxis(id, f.properties);
      if (rev) learnedToasts.push(`${f.name} is ${adjForValue(rev.value)} ${axisEmoji(rev.axis)}`);
    }
    // PLAN v9 P3 / 01 §6.5 — novelty: a never-launched combo pays +1 note (even on a flop).
    if (markComboSeen([...ids].sort().join('+'))) addResearchNotes(1);
    // T2.1: roll loot drop on PERFECT (chance scales with legendary on plate).
    // T4.1: hidden combos can FORCE a drop (chance=1) and/or boost bonuses.
    const forceDrop = hiddenCombo?.guaranteedDrop ?? false;
    if (tier === 'perfect' || forceDrop) {
      const seed = encounterSeed(currentEncounterIdx()) ^ Date.now();
      const chance = forceDrop ? 1 : dropChanceForLaunch(tier, hasLegendary);
      const drop = rollLootDrop(chance, seed);
      if (drop) {
        unlockFood(drop.id);
        showLootDropSplash(drop);
      }
    }
    // T4.2 — the Mystery Unicorn always gets its comedy beat, and pleasing it
    // (a pass) gifts a guaranteed legendary — its spec'd payoff, previously unbuilt.
    if (aud.id === UNICORN_AUDIENCE.id) {
      const gift = passedThisLaunch
        ? rollLegendaryDrop(encounterSeed(currentEncounterIdx()) ^ 0x1c044)
        : null;
      if (gift) unlockFood(gift.id);
      showUnicornSplash(gift);
    }
    // T4.1: apply hidden-combo bonus rewards + splash. Persist discovery.
    if (hiddenCombo) {
      if (hiddenCombo.bonusGold > 0) addGold(legendaryGold(hiddenCombo.bonusGold));
      if (hiddenCombo.bonusNotes > 0) addResearchNotes(hiddenCombo.bonusNotes);
      markHiddenComboFound(hiddenCombo.id);
      showHiddenComboSplash(hiddenCombo);
    }
    bumpBestMatch(aud.id, match.pct);
    bumpBestMatchOverall(match.pct);
    // PR2: feed today's daily quest with this launch.
    recordLaunchEvent({
      matchPct: match.pct,
      ids,
      hadTreatment: resolved.usedTreatments,
      recipeDiscovered: Boolean(discovery?.freshlyDiscovered),
    });
    renderDailyQuest();
    incrementLaunchCount(); // P7: count for first-launch hint visibility
    recordGoodLaunch(match.pct); // P9: track good launches for Kitchen auto-unlock
    if (shouldAutoUnlockKitchen()) {
      setKitchenMode(true);
      // Refresh the dock tab now — it was greyed/🔒 and stayed that way until
      // reload even though the tap already worked.
      window.dispatchEvent(new CustomEvent('fart:kitchen-unlocked'));
      showKitchenUnlockToast();
      // PR3: first time the kitchen unlocks, queue an explainer modal.
      showFeatureIntro({
        id: 'kitchen',
        emoji: '🍳',
        title: 'Kitchen unlocked!',
        body: 'Tap 🍳 Kitchen to equip a treatment (roast / chill / ferment). The one you equip tweaks every brew you launch — shifting its properties — until you swap it. Roast adds stink + heat; chill dries it out and sharpens the sound; ferment ramps stink + musical. The Kitchen tab glows while a treatment is equipped.',
        cta: 'Let me cook',
      });
    }
    // T1.2: critical-tier visual splash.
    if (tier === 'perfect' || tier === 'great' || tier === 'disaster') {
      showCriticalSplash(tier);
    }
    // PR6: PERFECT cinematic — pause input ~1.2s, fire confetti + sting
    // before the result panel renders. Reduced-motion users skip the hold.
    if (tier === 'perfect') {
      await playPerfectCinematic();
    }
    // V8 T1.b: axis-discovery splash (Scheme 1) — fires the FIRST time a
    // hidden axis registers ≥1 in the player's own fart. Idempotent: if
    // nothing new was discovered this launch, the splash is a no-op.
    const axisDisco = discoverAxesFromFart(propsAfterArea);
    if (axisDisco.added.length > 0) {
      showAxisDiscoverySplash(axisDisco.added);
    }
    // PLAN_v5 Phase 6: buffs consumed after the launch they applied to.
    consumeBuffs();
  }

  clearPlate();
  renderPlate();
  renderBellyMeter();
  renderProgression();
  renderActiveBuffStrip();
  renderNotebookCounter();
  // P6: discovery splash — only on FIRST discovery of a recipe.
  if (discovery && discovery.freshlyDiscovered) {
    showDiscoverySplash(discovery.recipeId);
  }
  renderStoryResult(recipe, match, area, ingredientCount, discovery, aud, axisFeedback, propsAfterArea);
  // V8 T3 — pulse the Fart Profile bars in step with the audio playback.
  if (ingredientCount > 0) {
    pulseFartProfile($('fartProfile'));
  }
  renderFirstLaunchHint(); // P7: re-render in case it should now hide
  // Phase P item 79 — once-per-boss toast when a boss becomes newly unlocked.
  maybeShowBossUnlockToast();
  if (ingredientCount > 0) {
    renderAudienceReaction(match.pct, aud, fartDurationMs);
    // Belly fail loop: if you still haven't pleased this crowd and you're too
    // stuffed for another real attempt, they give up and leave (soft fail →
    // fresh crowd). Otherwise show the normal reaction overlay (retry/next).
    const encounterPassed = getEncounterProgress(aud.id, currentEncounterIdx()).bestPct >= PASS_PCT;
    if (crowdOutcome(encounterPassed, remainingBelly()) === 'stuffed-fail') {
      failCurrentCrowd(aud);
    } else {
      presentReactionOverlay({
        aud,
        finalPct: match.pct,
        preChargePct,
        quality,
        violations: match.violations,
        goldPaid,
        passed: passedThisLaunch,
        propsAfterArea,
        learned: learnedToasts,
        newRecipeName:
          discovery && discovery.freshlyDiscovered ? (getRecipe(discovery.recipeId)?.name ?? null) : null,
      });
    }
    setLastMatch(match.pct);
  }
}

/** How long the "stuffed!" splash lingers before the crowd leaves. */
const STUFFED_LINGER_MS = 3500;

/**
 * Soft fail: the player is stuffed and never pleased this crowd, so the crowd
 * gives up and waddles off. We show a splash, then advance to a brand-new crowd
 * (no reward — they weren't wowed). Discoveries/notes already persist, so the
 * player keeps everything they learned.
 */
function failCurrentCrowd(aud: Audience): void {
  showStuffedSplash(aud);
  window.setTimeout(() => advanceToNextEncounter(), STUFFED_LINGER_MS);
}

function showStuffedSplash(aud: Audience): void {
  const splash = document.getElementById('discoverySplash');
  if (!splash) return;
  splash.innerHTML = `<div class="discovery-splash-card rarity-common stuffed-splash">
    <div class="discovery-splash-banner">🤢 TOO STUFFED!</div>
    <div class="discovery-splash-emoji">${aud.emoji}</div>
    <div class="discovery-splash-name">${aud.name} gives up and waddles off…</div>
    <div class="discovery-splash-desc">You ate too much without landing it. A fresh crowd is on the way — you keep everything you discovered.</div>
  </div>`;
  splash.removeAttribute('hidden');
  splash.classList.add('discovery-splash-show');
  scheduleHide(splash, 'discovery-splash-show', STUFFED_LINGER_MS);
}

const VERDICT_BY_GRADE: Record<string, string> = {
  S: 'They lost their minds! 🤯',
  A: 'Big hit! 😄',
  B: 'Pretty good! 🙂',
  C: 'Eh… they’ll take it. 😬',
  F: 'Total flop. 💀',
};

interface ReactionArgs {
  aud: Audience;
  finalPct: number;
  preChargePct: number;
  quality: number;
  violations: string[];
  goldPaid: number;
  passed: boolean;
  propsAfterArea: FoodProperties;
  learned: string[];
  newRecipeName: string | null;
}

function adjForValue(v: number): string {
  return v >= 5 ? 'SUPER' : v >= 4 ? 'really' : v >= 3 ? 'pretty' : v >= 2 ? 'a little' : 'barely';
}

/** PLAN v9 P2 — assemble + show the full-screen reaction takeover (04 §3). */
/**
 * The charge line for the reaction breakdown, labeled by ZONE. Previously any
 * quality > 1 read "Perfect charge", so a good (×1.10) was indistinguishable
 * from a true sweet-zone perfect (×1.25). Null for a neutral tap/ok (×1.0).
 */
export function chargeBreakdownLine(quality: number): { icon: string; label: string; val: string } | null {
  const val = `×${quality.toFixed(2)}`;
  if (quality >= CHARGE.perfect - 0.001) return { icon: '💥', label: 'Perfect charge', val };
  if (quality > 1.001) return { icon: '✨', label: 'Good charge', val };
  if (quality < 0.999) return { icon: '💨', label: 'Weak charge', val };
  return null;
}

function presentReactionOverlay(a: ReactionArgs): void {
  const grade = gradeForPct(a.finalPct);
  const tier = audienceReaction(a.finalPct, loadLastMatch()).tier;
  // Belly budget travels with the retry decision (the overlay hides the meter).
  const remaining = remainingBelly();
  const capacity = bellyCapacity();
  const breakdownLines: { icon: string; label: string; val: string }[] = [
    { icon: '🎯', label: 'Base match', val: `${a.preChargePct}%` },
  ];
  const chargeLine = chargeBreakdownLine(a.quality);
  if (chargeLine) breakdownLines.push(chargeLine);
  for (const v of a.violations) breakdownLines.push({ icon: '🚫', label: `Broke: ${v}`, val: '−25%' });

  showReactionOverlay({
    pct: a.finalPct,
    grade,
    stars: starsForPct(a.finalPct),
    passed: a.passed,
    isBoss: a.aud.difficultyTier === 'boss',
    audience: a.aud,
    verdict: VERDICT_BY_GRADE[grade] ?? '',
    caption: reactionTextForAudience(a.aud, tier),
    axisFeedback: computeAxisFeedback(a.propsAfterArea, a.aud),
    breakdownLines,
    goldPaid: a.goldPaid,
    learned: a.learned,
    newRecipe: a.newRecipeName,
    // PLAN v9 UI-overhaul Phase 5 — normalized stink drives the cloud (AXIS_CAP=8).
    stink: Math.min(1, a.propsAfterArea.stink / 8),
    belly: {
      used: capacity - remaining,
      cap: capacity,
      warn: remaining < MIN_ATTEMPT_BELLY + 4, // same danger threshold as the meter
    },
    canAttempt: remaining >= MIN_ATTEMPT_BELLY,
    onAction: handleReactionAction,
  });
}

/** Pass/retry gate routing from the reaction footer. Exported for tests. */
export function handleReactionAction(action: FooterAction): void {
  if (action === 'next' || action === 'finish') {
    advanceToNextEncounter();
    return;
  }
  // retry / improve — another attempt at the SAME crowd. The belly is NOT
  // refilled: fullness is the per-crowd attempt budget (fill-up model), so
  // what you ate on earlier attempts keeps counting until you Move On to a
  // fresh crowd. (The legacy drain-model refillBelly() here silently reset
  // the budget every retry and killed the stuffed-fail pressure loop.)
  bellySpentThisSession = 0;
  clearPlate();
  renderPlate();
  renderBellyMeter();
  renderPantryGrid();
  renderMoveOnGate();
  $('storyResult')?.setAttribute('hidden', '');
  $('audienceReaction')?.setAttribute('hidden', '');
}

function wireStoryLaunchButton(): void {
  const btn = $('storyLaunchBtn');
  if (!btn) return;
  // PLAN v9 P2 — hold-to-charge replaces the bare click. A quick tap resolves
  // to a safe 1.0× via the charge logic.
  mountChargeMeter(btn, $('chargeFill'), (result) => {
    void onStoryLaunch(result.quality);
  });
}

/** V8 T5 — wire the "Show locked teasers" toggle. */
function wirePantryShowLockedToggle(): void {
  $('pantryShowLockedBtn')?.addEventListener('click', () => {
    setPantryShowLocked(!loadPantryShowLocked());
    renderPantryGrid();
  });
}

function wireAreaChangeButton(): void {
  // PLAN v9 UI-overhaul Phase 2 — the standalone world map is gone; region
  // advance now folds into clearing the venue boss. The location is a read-only
  // chip. We keep listening for a location-changed event so a future boss-clear
  // region bump refreshes the display + portrait.
  window.addEventListener('fart:location-changed', () => {
    renderAreaDisplay();
    renderAudiencePortrait();
  });
}

/**
 * PR10 — Audience portrait tap (signature SFX + micro-reaction) and
 * long-press (voice preview). Wired once in initStoryPantry.
 */
const LONG_PRESS_MS = 600;
function wireAudiencePortraitInteraction(): void {
  const emojiEl = $('audiencePortraitEmoji');
  if (!emojiEl) return;
  emojiEl.setAttribute('role', 'button');
  emojiEl.setAttribute('aria-label', 'Tap to greet the audience; hold to hear them speak');
  emojiEl.setAttribute('tabindex', '0');
  emojiEl.style.cursor = 'pointer';

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;

  const onPress = (): void => {
    longPressFired = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressFired = true;
      const aud = currentAudience();
      void playAudienceVoice(aud.id, 'loved');
    }, LONG_PRESS_MS);
  };

  const onRelease = (): void => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (longPressFired) return; // long-press already played voice
    const aud = currentAudience();
    void playAudienceSignature(aud.id);
    // Brief wobble for visible feedback (reuse the loved-tier portrait keyframe).
    emojiEl.classList.remove('audience-portrait-loved');
    void (emojiEl as HTMLElement).offsetWidth;
    emojiEl.classList.add('audience-portrait-loved');
    setTimeout(() => emojiEl.classList.remove('audience-portrait-loved'), 1200);
    // Small particle burst — reuse the existing reaction-particles system.
    void import('../visuals/reaction-particles').then(({ spawnReactionParticles }) => {
      spawnReactionParticles('liked');
    });
    // First-tap discoverability hint for the long-press.
    void import('./feature-intro').then(({ showFeatureIntro }) => {
      showFeatureIntro({
        id: 'portrait_voice',
        emoji: '🎤',
        title: 'Tip: hold the audience',
        body: 'Press and hold the audience portrait to hear them speak a line in their own voice.',
        cta: 'Got it',
      });
    });
  };

  const onCancel = (): void => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  emojiEl.addEventListener('pointerdown', onPress);
  emojiEl.addEventListener('pointerup', onRelease);
  emojiEl.addEventListener('pointerleave', onCancel);
  emojiEl.addEventListener('pointercancel', onCancel);
  emojiEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      onRelease();
    }
  });
}

/**
 * PR10 — Belly meter tap = mini-fart easter egg. Plays a tiny low-volume
 * fart without spending belly. After every 10 taps, a one-line toast.
 */
// Debounce the belly-tap easter egg so mashing it can't stack overlapping
// mini-farts (WebAudio has no polyphony cap). Separate gate from the launch.
const BELLY_TAP_COOLDOWN_MS = 300;
const bellyTapGate = createCooldownGate(BELLY_TAP_COOLDOWN_MS);

export function wireBellyMeterTap(): void {
  const track = document.querySelector<HTMLElement>('.belly-track');
  if (!track) return;
  // Don't override role="meter" / aria-label — those describe the value
  // display, which remains the primary semantic. The tap is an easter egg
  // layered on top; cursor change is enough hint for sighted players.
  track.style.cursor = 'pointer';
  track.addEventListener('click', () => {
    if (!bellyTapGate.open()) return;
    playFart(2, 1, 2, 1, 5, 1);
    triggerHaptic(HAPTICS.launch);
    let taps = 0;
    try {
      const stored = localStorage.getItem('fart_belly_taps');
      if (stored) taps = parseInt(stored, 10) || 0;
    } catch { /* ignore */ }
    taps += 1;
    try { localStorage.setItem('fart_belly_taps', String(taps)); } catch { /* ignore */ }
    if (taps % 10 === 0) {
      const splash = document.getElementById('discoverySplash');
      if (splash) {
        splash.innerHTML = `<div class="discovery-splash-card rarity-common">
          <div class="discovery-splash-banner">🫃 ${taps} belly pokes</div>
          <div class="discovery-splash-desc">Stop poking my belly.</div>
        </div>`;
        splash.removeAttribute('hidden');
        splash.classList.add('discovery-splash-show');
        scheduleHide(splash, 'discovery-splash-show', 2200);
      }
    }
  });
}

export function initStoryPantry(): void {
  renderAudiencePortrait();
  renderAreaDisplay();
  wirePlateSlots();
  wireStoryLaunchButton();
  // Equipping/unequipping a Kitchen treatment changes the launched fart — keep
  // the PREDICTION preview in sync (it resolves through the same launch path).
  window.addEventListener('fart:treatment-changed', () => renderPlate());
  wireAreaChangeButton();
  wireMoveOnButton();
  wirePantryShowLockedToggle();
  wireAudiencePortraitInteraction();
  wireBellyMeterTap();
  renderPantryGrid();
  renderPlate();
  renderBellyMeter();
  renderProgression();
  renderActiveBuffStrip();
  renderFirstLaunchHint(); // P7: show hint on initial load for new players
  // PR9: restore the Move On button's wowed state on reload.
  const aud0 = currentAudience();
  paintMoveOnButton(isWowed(aud0.id, currentEncounterIdx()));
  renderMoveOnGate(); // PLAN v9 P2 — gate advance until the crowd is passed
  // Sound overhaul — today's audience greets the player on the first gesture
  // (the context is locked until then; before this, load-in was always silent),
  // and the lab loop fades in underneath (boss-arena swaps it when active).
  onAudioUnlocked(() => {
    void playAudienceArrival(currentAudience().id);
    if (!isArenaActive()) void startMusic('lab');
  });
}

// Test-only reset hook.
export function _resetPlateAndBelly(): void {
  plate = [null, null, null, null];
  bellySpentThisSession = 0;
}
