/**
 * Story Mode pantry + plate + belly meter UI logic. Per PLAN.md §D Phase C
 * items 34-37. Wires localStorage state (pantry / belly) to the DOM
 * defined in index.html (#pantryGrid, #plate, #bellyFill, #plateSlotN).
 */

import { FOODS, type Food, getFood, type FoodProperties } from '../state/food';
import { buildPantryGridHtml } from './pantry-grid';
import {
  loadPantry,
  loadPantryShowLocked,
  setPantryShowLocked,
  loadBelly,
  spendBelly,
  BELLY_CAPACITY,
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
import { resolveLaunchProps } from '../scoring/launch-resolver';
import { evaluateMatch, computeMatchBreakdown } from '../scoring/match';
import { classifyCriticalTier, criticalGoldBonus, criticalNotesBonus } from '../scoring/critical-tier';
import { awardGoldForLaunch } from '../scoring/reward';
import { rollLootDrop, dropChanceForLaunch } from '../scoring/loot-drops';
import { loadStreak, recordLaunchForStreak, streakGoldMultiplier } from '../scoring/streak';
import { recordFoodUse, applyMasteryBonuses, loadFoodMastery, masteryLevel } from '../scoring/food-mastery';
import { unlockFood } from '../state/persistence';
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
  playAudienceVoice,
} from '../audio/event-sfx';
import { shouldShowHint, recommendFoodsForAudience, incrementLaunchCount } from '../scoring/food-hint';
import { recordGoodLaunch, shouldAutoUnlockKitchen } from '../scoring/kitchen-unlock';
import { setKitchenMode } from './kitchen';
import { applyActiveBuffs, consumeBuffs, goldMultiplierFromBuffs, cancelOneRestrictionFromBuffs } from '../scoring/buffs';
import { applyLegendaryProps } from '../scoring/legendary-buffs';
import { pulseFartProfile } from './fart-profile';
import { renderPlatePreviewHtml } from './plate-preview';
import { discoverAxesFromFart, loadDiscoveredAxes } from '../state/axis-discovery';
import { playPerfectCinematic } from './perfect-cinematic';
import { showFeatureIntro } from './feature-intro';
import {
  showKitchenUnlockToast,
  showHiddenComboSplash,
  showUltimateOverlay,
  showLootDropSplash,
  showCriticalSplash,
  showAxisDiscoverySplash,
  showDiscoverySplash,
  flashLegendaryFanfare,
} from './splashes';
import { renderAudienceReaction, renderStoryResult } from './result-panel';
import {
  diminishingMultiplier,
  recordLaunch as recordEncounterLaunch,
  upcomingLaunchIdx,
  isWowed,
  clearEncounterProgress,
  WOW_BONUS_GOLD,
  ENCORE_BONUS_GOLD,
} from '../state/encounter-progress';
import { recordConquest } from '../state/conquests';
import type { Audience } from '../state/audience';
import { recordLaunchEvent } from '../state/daily-quest';
import { renderDailyQuest } from './daily-quest';
import { isArenaActive, submitArenaLaunch, maybeShowBossUnlockToast } from './boss-arena';
import { isKitchenOpen, tryAddToPrep, loadPlateTreatments, clearPlateTreatments } from './kitchen';
import { AREAS, getArea, type Area } from '../state/containment';
import { getDailyAudience } from '../state/audience';
import { audiencePoolForLocation } from '../state/location-progress';
import { playFart } from '../audio/procedural';
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
  if (food.bellyCost > remainingBelly()) return { ok: false, reason: 'insufficient-belly' };
  plate[emptyIdx] = foodId;
  bellySpentThisSession += food.bellyCost;
  return { ok: true, slotIdx: emptyIdx };
}

/** Removes the food at the given slot. Refunds belly cost for this session. */
export function removeFoodFromPlate(slotIdx: number): boolean {
  const id = plate[slotIdx];
  if (!id) return false;
  const food = getFood(id);
  if (food) bellySpentThisSession = Math.max(0, bellySpentThisSession - food.bellyCost);
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
  const { html, lockedCount } = buildPantryGridHtml(FOODS, unlocked, showLocked, loadFoodMastery);
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
      // Phase U item 95 — if Kitchen is open, route to the prep table.
      if (isKitchenOpen()) {
        tryAddToPrep(id);
        return;
      }
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
      slot.innerHTML = `<span class="food-emoji">${food.emoji}</span><span class="food-name">${food.name}</span>`;
      slot.setAttribute('aria-label', `Plate slot ${i + 1}: ${food.name} (tap to remove)`);
    } else {
      slot.className = 'plate-slot';
      slot.innerHTML = '＋';
      slot.setAttribute('aria-label', `Plate slot ${i + 1} (empty)`);
    }
  }
  renderPlatePreview();
}

/**
 * V8 T2 — render the 🔮 PREDICTION card above the plate. Naive property
 * sum (no synergies/treatments — those reveal at launch). Marks
 * UNCERTAIN whenever any plate food is below Apprentice mastery.
 */
function renderPlatePreview(): void {
  const el = $('platePreview');
  if (!el) return;
  const ids = plateIngredientIds();
  if (ids.length === 0) {
    el.setAttribute('hidden', '');
    el.innerHTML = '';
    return;
  }
  const sum: FoodProperties = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, length: 0, temp: 0 };
  let anyUnmastered = false;
  for (const id of ids) {
    const food = getFood(id);
    if (!food) continue;
    if (masteryLevel(loadFoodMastery(id)) === 'novice') anyUnmastered = true;
    for (const a of Object.keys(sum) as Array<keyof FoodProperties>) {
      sum[a] = Math.min(5, sum[a] + food.properties[a]);
    }
  }
  el.innerHTML = renderPlatePreviewHtml(sum, loadDiscoveredAxes(), anyUnmastered);
  el.removeAttribute('hidden');
}

export function renderBellyMeter(): void {
  const fill = $('bellyFill');
  const value = $('bellyValue');
  const cap = $('bellyCap');
  const r = remainingBelly();
  if (fill) fill.style.width = `${(r / BELLY_CAPACITY) * 100}%`;
  if (value) value.textContent = String(r);
  if (cap) cap.textContent = String(BELLY_CAPACITY);
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
    btn.setAttribute('aria-label', 'Move On to the next audience (refills belly)');
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
  setTimeout(() => {
    splash.setAttribute('hidden', '');
    splash.classList.remove('discovery-splash-show');
  }, 3500);
}

/** Wire the Move On button: opens intermission, then advances the encounter. */
function wireMoveOnButton(): void {
  const btn = $('moveOnBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
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
        clearPlateTreatments();
        renderAudiencePortrait();
        renderAreaDisplay();
        renderActiveBuffStrip();
        renderPlate();
        renderBellyMeter();
        renderProgression();
        renderPantryGrid();
        renderFirstLaunchHint();
        // Hide any leftover result/reaction strip.
        $('storyResult')?.setAttribute('hidden', '');
        $('audienceReaction')?.setAttribute('hidden', '');
        $('discoverySplash')?.setAttribute('hidden', '');
        // PR10 — the next audience announces itself with its signature cue.
        const nextAud = currentAudience();
        void playAudienceSignature(nextAud.id);
      });
    });
  });
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
  if (flavorEl) flavorEl.textContent = aud.description;
  // Hide legacy cravings/restrictions DOM (T6 — exposition is gone).
  if (cravingsEl) cravingsEl.textContent = '';
  if (restrictionsEl) restrictionsEl.textContent = '';
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
  el.textContent = `${cur.emoji} ${cur.name}`;
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


async function onStoryLaunch(): Promise<void> {
  const ids = plateIngredientIds();
  const ingredientCount = ids.length;
  // P1: resolve launch through prep-aware path. If treatments are
  // persisted from a Kitchen send, they apply here; otherwise raw.
  const treatments = loadPlateTreatments();
  const resolved = resolveLaunchProps(ids, treatments);
  const recipe = resolved.rawRecipe; // synergies/conflicts still come from raw path
  const areaId = loadLastArea();
  const area = getArea(areaId) ?? AREAS[0]!;
  // PLAN_v5 Phase 6: apply active buffs BEFORE area modifiers, so the
  // buff deltas are propagated through the area multipliers naturally.
  const propsWithBuffs = applyActiveBuffs(resolved.props);
  // T2.3: apply per-food mastery bonuses (Master+ foods get +1 on their highest axis).
  const propsWithMastery = applyMasteryBonuses(propsWithBuffs, ids);
  // V8 T7.d: apply permanent legendary-codex passives (e.g. Cosmic Symphony → +1 musical).
  const propsWithLegendary = applyLegendaryProps(propsWithMastery);
  const propsAfterArea = applyAreaModifiers(propsWithLegendary, area);

  // Boss arena fork: if an arena is active, route the launch there.
  // Audio + visual still fire (we want full feedback). The arena handles
  // the scoring + win/lose state.
  if (isArenaActive()) {
    const [aL, aW, aV, aS, aT, aM] = recipeToSliderInputs(propsAfterArea);
    triggerHaptic(HAPTICS.launch);
    playFart(aL, aW, aV, aS, aT, aM);
    spawnGas(aS, aV);
    commitBellySpend();
    // Read declared target (Boss 5 only) from the arena's select.
    const targetSelect = document.getElementById('arenaTargetSelect') as HTMLSelectElement | null;
    const targetIdx = targetSelect ? parseInt(targetSelect.value, 10) : null;
    submitArenaLaunch({
      ingredientIds: ids,
      propsAfterArea,
      targetAudienceIdx: targetIdx !== null && !Number.isNaN(targetIdx) ? targetIdx : null,
    });
    clearPlate();
    clearPlateTreatments(); // P1: treatments consumed by the arena launch too
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
  const baseMatch = evaluateMatch(propsAfterArea, ids, aud.cravings, restrictions);
  const match = hiddenCombo?.guaranteedPerfect
    ? { pct: 100, violations: [] }
    : baseMatch;
  const breakdown = computeMatchBreakdown(propsAfterArea, aud.cravings);
  const discovery = ingredientCount > 0 ? discoverFromPlate(ids) : null;

  const [length, wetness, volume, stink, temp, musical] = recipeToSliderInputs(propsAfterArea);

  triggerHaptic(HAPTICS.launch);
  playFart(length, wetness, volume, stink, temp, musical);
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
    // Ultimate bonus: +10 gold + +5 notes.
    addGold(10);
    addResearchNotes(5);
  }

  commitBellySpend();

  // T1.2: classify critical tier (PERFECT/GREAT/OK/BAD/DISASTER)
  const tier = classifyCriticalTier(match);

  if (ingredientCount > 0) {
    // PR9: diminishing-returns multiplier for repeat launches at the
    // same audience. Read upcoming launch idx BEFORE recording so the
    // first launch lands at 1.0×.
    const launchN = upcomingLaunchIdx(aud.id, currentEncounterIdx());
    const diminMult = diminishingMultiplier(launchN);
    // T2.2: streak multiplier + buff multiplier combine for total gold mult.
    const newStreak = recordLaunchForStreak(match.pct);
    const streakMult = streakGoldMultiplier(newStreak);
    const buffMult = goldMultiplierFromBuffs();
    awardGoldForLaunch(match.pct, areaId, streakMult * buffMult * diminMult);
    awardResearchForLaunch(match.pct);
    // PR9: record this launch against the encounter. justWowed iff we
    // crossed the threshold for the first time this encounter.
    const { justWowed, progress: encounterProg } = recordEncounterLaunch(
      aud.id,
      currentEncounterIdx(),
      match.pct,
    );
    if (justWowed) {
      addGold(WOW_BONUS_GOLD);
      recordConquest(aud.id, match.pct);
      showWowSplash(aud, match.pct);
    }
    paintMoveOnButton(encounterProg.wowed);
    // T1.2: critical bonus — PERFECT/GREAT add gold; DISASTER adds consolation notes.
    const goldBonus = criticalGoldBonus(tier);
    const notesBonus = criticalNotesBonus(tier);
    if (goldBonus > 0) addGold(goldBonus);
    if (notesBonus > 0) addResearchNotes(notesBonus);
    // T2.3: record food uses for mastery
    recordFoodUse(ids);
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
    // T4.1: apply hidden-combo bonus rewards + splash. Persist discovery.
    if (hiddenCombo) {
      if (hiddenCombo.bonusGold > 0) addGold(hiddenCombo.bonusGold);
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
      hadTreatment: treatments.length > 0,
      recipeDiscovered: Boolean(discovery?.freshlyDiscovered),
    });
    renderDailyQuest();
    incrementLaunchCount(); // P7: count for first-launch hint visibility
    recordGoodLaunch(match.pct); // P9: track good launches for Kitchen auto-unlock
    if (shouldAutoUnlockKitchen()) {
      setKitchenMode(true);
      showKitchenUnlockToast();
      // PR3: first time the kitchen unlocks, queue an explainer modal.
      showFeatureIntro({
        id: 'kitchen',
        emoji: '🍳',
        title: 'Kitchen Mode unlocked!',
        body: 'Tap 🍳 Kitchen Mode to switch into prep view. There you can apply treatments (roast / chill / blend / ferment) to your plate before launching — each treatment shifts properties (e.g. roast adds dry + temp, ferment adds wet + stink). Send the prepped plate to perform.',
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
  clearPlateTreatments(); // P1: one-shot consumption — next launch is raw unless re-prepped
  renderPlate();
  renderBellyMeter();
  renderProgression();
  renderActiveBuffStrip();
  renderNotebookCounter();
  // P6: discovery splash — only on FIRST discovery of a recipe.
  if (discovery && discovery.freshlyDiscovered) {
    showDiscoverySplash(discovery.recipeId);
  }
  renderStoryResult(recipe, match, area, ingredientCount, discovery, aud, breakdown, propsAfterArea);
  // V8 T3 — pulse the Fart Profile bars in step with the audio playback.
  if (ingredientCount > 0) {
    pulseFartProfile($('fartProfile'));
  }
  renderFirstLaunchHint(); // P7: re-render in case it should now hide
  // Phase P item 79 — once-per-boss toast when a boss becomes newly unlocked.
  maybeShowBossUnlockToast();
  if (ingredientCount > 0) {
    renderAudienceReaction(match.pct, aud);
    setLastMatch(match.pct);
  }
}

function wireStoryLaunchButton(): void {
  $('storyLaunchBtn')?.addEventListener('click', () => {
    void onStoryLaunch();
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
  // The 'change' link next to the current-area display opens the map.
  // We dispatch a click on #travelBtn to reuse the map UI.
  $('areaChangeBtn')?.addEventListener('click', () => {
    $('travelBtn')?.click();
  });
  // Listen for map's location-changed event to refresh the display.
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
function wireBellyMeterTap(): void {
  const track = document.querySelector<HTMLElement>('.belly-track');
  if (!track) return;
  // Don't override role="meter" / aria-label — those describe the value
  // display, which remains the primary semantic. The tap is an easter egg
  // layered on top; cursor change is enough hint for sighted players.
  track.style.cursor = 'pointer';
  track.addEventListener('click', () => {
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
        setTimeout(() => {
          splash.setAttribute('hidden', '');
          splash.classList.remove('discovery-splash-show');
        }, 2200);
      }
    }
  });
}

export function initStoryPantry(): void {
  renderAudiencePortrait();
  renderAreaDisplay();
  wirePlateSlots();
  wireStoryLaunchButton();
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
}

// Test-only reset hook.
export function _resetPlateAndBelly(): void {
  plate = [null, null, null, null];
  bellySpentThisSession = 0;
}
