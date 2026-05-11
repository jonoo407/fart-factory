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
  loadLastMatch,
  setLastMatch,
  loadGold,
  loadResearchNotes,
  bumpBestMatch,
  bumpBestMatchOverall,
  bumpBestHard,
  addGold,
  addResearchNotes,
} from '../state/persistence';
import type { RecipeResult } from '../scoring/fart-recipe';
import { resolveLaunchProps } from '../scoring/launch-resolver';
import { evaluateMatch, computeMatchBreakdown, type MatchResult, type AxisBreakdown } from '../scoring/match';
import { classifyCriticalTier, criticalGoldBonus, criticalNotesBonus, tierLabel as criticalLabel, type CriticalTier } from '../scoring/critical-tier';
import { awardGoldForLaunch } from '../scoring/reward';
import { rollLootDrop, dropChanceForLaunch } from '../scoring/loot-drops';
import { loadStreak, recordLaunchForStreak, streakGoldMultiplier } from '../scoring/streak';
import { recordFoodUse, applyMasteryBonuses, loadFoodMastery, masteryLevel } from '../scoring/food-mastery';
import { unlockFood } from '../state/persistence';
import { encounterSeed, currentEncounterIdx } from '../state/run-state';
import { detectHiddenCombo } from '../scoring/hidden-combos';
import { rollUnicornEncounter, UNICORN_AUDIENCE } from '../state/unicorn-encounter';
import { awardResearchForLaunch } from '../scoring/research';
import { discoverFromPlate, type DiscoveryResult } from '../scoring/discovery';
import { getRecipe } from '../state/recipes';
import { renderNotebookCounter } from './notebook';
import { playEventSfx, playEventSfxOneOf, FOOD_EATING_SFX, AUDIENCE_REACTION_SFX, LEGENDARY_FANFARE_SFX } from '../audio/event-sfx';
import { shouldShowHint, recommendFoodsForAudience, incrementLaunchCount } from '../scoring/food-hint';
import { reactionTextForAudience } from '../scoring/audience-reactions';
import { recordGoodLaunch, shouldAutoUnlockKitchen } from '../scoring/kitchen-unlock';
import { setKitchenMode } from './kitchen';
import { applyActiveBuffs, consumeBuffs, goldMultiplierFromBuffs, isEasyModeForceFromBuffs, cancelOneRestrictionFromBuffs } from '../scoring/buffs';
import { renderFartProfileHtml, pulseFartProfile } from './fart-profile';
import { renderPlatePreviewHtml } from './plate-preview';
import { discoverAxesFromFart, loadDiscoveredAxes, type AxisName } from '../state/axis-discovery';
import { isArenaActive, submitArenaLaunch, maybeShowBossUnlockToast } from './boss-arena';
import { isKitchenOpen, tryAddToPrep, loadPlateTreatments, clearPlateTreatments } from './kitchen';
import { AREAS, getArea, type Area } from '../state/containment';
import { getDailyAudience } from '../state/audience';
import { audiencePoolForLocation } from '../state/location-progress';
import { loadHardMode, setHardMode, audienceReaction } from '../state/challenge';
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
  const { html, lockedCount } = buildPantryGridHtml(FOODS, unlocked, showLocked);
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

/** Wire the Move On button: opens intermission, then advances the encounter. */
function wireMoveOnButton(): void {
  const btn = $('moveOnBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
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

function showKitchenUnlockToast(): void {
  const toast = document.getElementById('bossUnlockToast');
  if (!toast) return;
  toast.textContent = '🍳 Kitchen Mode unlocked! Roast, chill, and ferment your foods for advanced launches.';
  toast.removeAttribute('hidden');
  toast.classList.remove('boss-unlock-toast-enter');
  void toast.offsetWidth;
  toast.classList.add('boss-unlock-toast-enter');
  setTimeout(() => toast.setAttribute('hidden', ''), 5000);
  // Also reveal the Kitchen Mode toggle visual state.
  const t = document.getElementById('kitchenModeToggle');
  if (t) {
    t.setAttribute('aria-pressed', 'true');
    t.classList.add('kitchen-mode-toggle-on');
  }
  const kb = document.getElementById('kitchenBtn');
  if (kb) kb.removeAttribute('hidden');
}

function showHiddenComboSplash(combo: { name: string; emoji: string; flavor: string; bonusGold: number; bonusNotes: number }): void {
  const splash = document.getElementById('discoverySplash');
  if (!splash) return;
  splash.innerHTML = `<div class="discovery-splash-card rarity-legendary">
    <div class="discovery-splash-banner">🎁 HIDDEN COMBO! 🎁</div>
    <div class="discovery-splash-emoji">${combo.emoji}</div>
    <div class="discovery-splash-name">${combo.name}</div>
    <div class="discovery-splash-desc">${combo.flavor}</div>
    <div class="discovery-splash-hint">${combo.bonusGold > 0 ? `+${combo.bonusGold}💰 ` : ''}${combo.bonusNotes > 0 ? `+${combo.bonusNotes}📝` : ''}</div>
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

function showUltimateOverlay(count: number): void {
  const overlay = document.getElementById('ultimateOverlay');
  if (!overlay) return;
  overlay.innerHTML = `<div class="ultimate-card">
    <div class="ultimate-banner">⚡ ULTIMATE LAUNCH ⚡</div>
    <div class="ultimate-emoji">💨</div>
    <div class="ultimate-count">×${count} LEGENDARY FOODS ON THE PLATE</div>
    <div class="ultimate-bonus">+10 💰  +5 📝</div>
  </div>`;
  overlay.removeAttribute('hidden');
  overlay.classList.remove('ultimate-overlay-show');
  void overlay.offsetWidth;
  overlay.classList.add('ultimate-overlay-show');
  setTimeout(() => {
    overlay.setAttribute('hidden', '');
    overlay.classList.remove('ultimate-overlay-show');
  }, 2500);
}

function showLootDropSplash(food: { id: string; name: string; emoji: string; rarity: string }): void {
  const splash = document.getElementById('discoverySplash');
  if (!splash) return;
  splash.innerHTML = `<div class="discovery-splash-card rarity-${food.rarity}">
    <div class="discovery-splash-banner">✨ LOOT DROP ✨</div>
    <div class="discovery-splash-emoji">${food.emoji}</div>
    <div class="discovery-splash-name">${food.name}</div>
    <div class="discovery-splash-desc">The audience handed you a snack!</div>
    <div class="discovery-splash-hint">📦 Added to your pantry</div>
  </div>`;
  splash.removeAttribute('hidden');
  splash.classList.remove('discovery-splash-show');
  void splash.offsetWidth;
  splash.classList.add('discovery-splash-show');
  setTimeout(() => {
    splash.setAttribute('hidden', '');
    splash.classList.remove('discovery-splash-show');
  }, 3200);
}

function showCriticalSplash(tier: CriticalTier): void {
  const splash = document.getElementById('criticalSplash');
  if (!splash) return;
  splash.innerHTML = `<div class="critical-splash-card critical-${tier}">
    <div class="critical-splash-label">${criticalLabel(tier)}</div>
  </div>`;
  splash.removeAttribute('hidden');
  splash.classList.remove('critical-splash-show');
  void splash.offsetWidth;
  splash.classList.add('critical-splash-show');
  setTimeout(() => {
    splash.setAttribute('hidden', '');
    splash.classList.remove('critical-splash-show');
  }, 1800);
}

function showAxisDiscoverySplash(axes: readonly AxisName[]): void {
  if (axes.length === 0) return;
  const splash = document.getElementById('axisDiscoverySplash');
  if (!splash) return;
  const chips = axes.map((a) => (
    `<span class="axis-discovery-chip">${axisEmoji(a)} <strong>${a.toUpperCase()}</strong></span>`
  )).join('');
  const heading = axes.length === 1
    ? '✨ NEW DIMENSION DISCOVERED ✨'
    : '✨ NEW DIMENSIONS DISCOVERED ✨';
  splash.innerHTML = `<div class="axis-discovery-card">
    <div class="axis-discovery-label">${heading}</div>
    <div class="axis-discovery-list">${chips}</div>
    <div class="axis-discovery-hint">You'll see these on every fart from now on.</div>
  </div>`;
  splash.removeAttribute('hidden');
  splash.classList.remove('axis-discovery-show');
  void splash.offsetWidth;
  splash.classList.add('axis-discovery-show');
  setTimeout(() => {
    splash.setAttribute('hidden', '');
    splash.classList.remove('axis-discovery-show');
  }, 3000);
}

function showDiscoverySplash(recipeId: string): void {
  const splash = document.getElementById('discoverySplash');
  if (!splash) return;
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  splash.innerHTML = `<div class="discovery-splash-card rarity-${recipe.rarity}">
    <div class="discovery-splash-banner">✨ NEW RECIPE DISCOVERED ✨</div>
    <div class="discovery-splash-emoji">${recipe.emoji}</div>
    <div class="discovery-splash-name">${recipe.name}</div>
    ${recipe.description ? `<div class="discovery-splash-desc">${recipe.description}</div>` : ''}
    <div class="discovery-splash-hint">📖 Saved to your Lab Notebook</div>
  </div>`;
  splash.removeAttribute('hidden');
  splash.classList.remove('discovery-splash-show');
  void splash.offsetWidth;
  splash.classList.add('discovery-splash-show');
  setTimeout(() => {
    splash.setAttribute('hidden', '');
    splash.classList.remove('discovery-splash-show');
  }, 3200);
}

function flashLegendaryFanfare(): void {
  const wrap = document.querySelector<HTMLElement>('.audience-wrap');
  if (!wrap) return;
  wrap.classList.remove('audience-wrap-legendary');
  void wrap.offsetWidth;
  wrap.classList.add('audience-wrap-legendary');
  setTimeout(() => wrap.classList.remove('audience-wrap-legendary'), 1600);
}

export function renderAudiencePortrait(): void {
  const aud = currentAudience();
  const hardMode = loadHardMode();
  const emojiEl = $('audiencePortraitEmoji');
  const nameEl = $('audienceName');
  const flavorEl = $('audienceFlavor');
  const cravingsEl = $('audienceCravings');
  const restrictionsEl = $('audienceRestrictions');
  if (emojiEl) {
    emojiEl.textContent = hardMode ? '❓' : aud.emoji;
    // Phase L #65 — always-on idle wobble. Reaction-face classes
    // (audience-portrait-loved/liked/meh/disliked/evacuated) are added
    // by `applyReactionFace` and reset by this function. Re-rendering
    // strips any previous reaction class so each portrait refresh
    // returns the portrait to neutral idle.
    emojiEl.className = 'audience-portrait audience-portrait-idle';
  }
  if (nameEl) nameEl.textContent = aud.name; // Name visible in both modes
  if (flavorEl) flavorEl.textContent = hardMode ? 'Their tastes are a mystery. Read the room.' : aud.flavor;
  if (cravingsEl) {
    if (hardMode) {
      cravingsEl.textContent = '';
    } else {
      const c = aud.cravings;
      const parts: string[] = [];
      if (c.stink >= 3) parts.push(`stinky ${c.stink}/5`);
      if (c.wet >= 3) parts.push(`wet ${c.wet}/5`);
      if (c.dry >= 3) parts.push(`dry ${c.dry}/5`);
      if (c.loud >= 3) parts.push(`loud ${c.loud}/5`);
      if (c.musical >= 3) parts.push(`musical ${c.musical}/5`);
      if (c.length >= 3) parts.push(`long ${c.length}/5`);
      if (c.temp >= 4) parts.push(`hot ${c.temp}/5`);
      cravingsEl.textContent = parts.length ? `Wants: ${parts.join(' · ')}` : 'No strong preferences.';
    }
  }
  if (restrictionsEl) {
    if (hardMode) {
      restrictionsEl.textContent = '';
    } else if (aud.restrictions && aud.restrictions.length) {
      restrictionsEl.textContent = `🚫 ${aud.restrictions.join(' · ')}`;
    } else {
      restrictionsEl.textContent = '';
    }
  }
  // Paint Hard Mode button.
  const btn = $('storyHardModeBtn') as HTMLButtonElement | null;
  if (btn) {
    btn.setAttribute('aria-pressed', hardMode ? 'true' : 'false');
    btn.textContent = hardMode ? '🧠 Hard ON' : '🧠 Hard';
  }
}

function tierEmoji(tier: ReturnType<typeof audienceReaction>['tier']): string {
  switch (tier) {
    case 'loved':     return '😍';
    case 'liked':     return '🙂';
    case 'meh':       return '😐';
    case 'disliked':  return '🤢';
    case 'evacuated': return '💀';
  }
}

function tierLabel(tier: ReturnType<typeof audienceReaction>['tier']): string {
  // Per-audience flavor text + tier emoji (P10).
  const aud = currentAudience();
  return `${tierEmoji(tier)} ${reactionTextForAudience(aud, tier)}`;
}

function trendLabel(trend: ReturnType<typeof audienceReaction>['trend']): string {
  switch (trend) {
    case 'first':  return '';
    case 'warmer': return ' 🔥 warmer';
    case 'colder': return ' ❄️ colder';
    case 'same':   return ' ➡️ same';
  }
}

function applyReactionFace(tier: ReturnType<typeof audienceReaction>['tier']): void {
  const emojiEl = $('audiencePortraitEmoji');
  if (!emojiEl) return;
  // Strip any prior reaction class.
  emojiEl.classList.remove(
    'audience-portrait-loved',
    'audience-portrait-liked',
    'audience-portrait-meh',
    'audience-portrait-disliked',
    'audience-portrait-evacuated',
  );
  emojiEl.classList.add(`audience-portrait-${tier}`);
  // Also swap the emoji for an emotion glyph so the reaction is legible.
  const emojiMap: Record<typeof tier, string> = {
    loved:    '😍',
    liked:    '🙂',
    meh:      '😐',
    disliked: '🤢',
    evacuated:'💀',
  };
  emojiEl.textContent = emojiMap[tier];
}

function renderAudienceReaction(pct: number): void {
  const wrap = $('audienceReaction');
  const tierEl = $('audienceReactionTier');
  const trendEl = $('audienceReactionTrend');
  const r = audienceReaction(pct, loadLastMatch());
  if (wrap) wrap.removeAttribute('hidden');
  if (tierEl) tierEl.textContent = tierLabel(r.tier);
  if (trendEl) trendEl.textContent = trendLabel(r.trend);
  applyReactionFace(r.tier);
  // T2.2: streak counter visible in the reaction strip.
  const streakEl = $('audienceReactionStreak');
  if (streakEl) {
    const s = loadStreak();
    if (s >= 2) {
      streakEl.removeAttribute('hidden');
      streakEl.textContent = s >= 10 ? `🌟 LEGENDARY STREAK ×${s}` : s >= 5 ? `🔥🔥 Streak ×${s}` : `🔥 Streak ×${s}`;
    } else {
      streakEl.setAttribute('hidden', '');
    }
  }
  // P3: tier-specific audience SFX (silent until operator runs sfx:generate).
  const reactionSfx = AUDIENCE_REACTION_SFX[r.tier];
  if (reactionSfx) void playEventSfx(reactionSfx, 5);
  // T1.3: emoji particles per tier
  void import('../visuals/reaction-particles').then(({ spawnReactionParticles }) => {
    spawnReactionParticles(r.tier);
  });
}

function wireStoryHardModeButton(): void {
  const btn = $('storyHardModeBtn') as HTMLButtonElement | null;
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = !loadHardMode();
    setHardMode(next);
    renderAudiencePortrait();
    // Also re-render result panel hidden so the user has to launch again.
    const result = $('storyResult');
    if (result) result.setAttribute('hidden', '');
    setLastMatch(null);
    const reactionWrap = $('audienceReaction');
    if (reactionWrap) reactionWrap.setAttribute('hidden', '');
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

function matchEmoji(pct: number): string {
  if (pct >= 90) return '🎯💥';
  if (pct >= 70) return '🔥';
  if (pct >= 50) return '👍';
  if (pct >= 30) return '🤏';
  if (pct >= 10) return '😬';
  return '💀';
}

function axisEmoji(axis: AxisBreakdown['axis']): string {
  switch (axis) {
    case 'wet': return '💧';
    case 'dry': return '🌵';
    case 'stink': return '🦨';
    case 'loud': return '🔊';
    case 'musical': return '🎵';
    case 'length': return '⏱';
    case 'temp': return '🌡';
  }
}

function renderBreakdown(breakdown: AxisBreakdown[]): string {
  // Sort: mismatched axes (cost > 0) first, descending cost, then matched ones.
  const sorted = [...breakdown].sort((a, b) => b.cost - a.cost);
  return sorted.map((row) => {
    if (row.matched) {
      return `<div class="breakdown-row breakdown-matched">${axisEmoji(row.axis)} ${row.axis}: <strong>${row.actual}</strong> / wanted ${row.target} ✓</div>`;
    }
    return `<div class="breakdown-row breakdown-miss">${axisEmoji(row.axis)} ${row.axis}: <strong>${row.actual}</strong> / wanted ${row.target} <span class="breakdown-cost">-${row.cost}</span></div>`;
  }).join('');
}

function renderStoryResult(r: RecipeResult, m: MatchResult, area: Area, plateLen: number, discovery: DiscoveryResult | null, breakdown?: AxisBreakdown[], fartProps?: FoodProperties): void {
  const wrap = $('storyResult');
  const title = $('storyResultTitle');
  const effects = $('storyResultEffects');
  const profile = $('fartProfile');
  if (!wrap || !title || !effects) return;
  const hardMode = loadHardMode();
  const aud = currentAudience();
  if (plateLen === 0) {
    wrap.removeAttribute('hidden');
    title.innerHTML = '🌬️ A whisper. (Empty plate — the audience waits.)';
    effects.innerHTML = '';
    if (profile) {
      profile.innerHTML = '';
      profile.setAttribute('hidden', '');
    }
    return;
  }
  // V8 T1.c: the Fart Profile is THE primary "you made this" surface. Render
  // it before any match copy so the player sees their own fart first, even
  // in Hard Mode (the audience target stays hidden — the player's own fart
  // belongs to the player).
  if (profile && fartProps) {
    profile.innerHTML = renderFartProfileHtml(fartProps, loadDiscoveredAxes());
    profile.removeAttribute('hidden');
  }
  const discoveryLine = (() => {
    if (!discovery) return '';
    const recipe = getRecipe(discovery.recipeId);
    if (!recipe) return '';
    if (discovery.freshlyDiscovered) {
      return `<div class="story-result-discovery story-result-discovery-new">✨ NEW RECIPE: ${recipe.emoji} <strong>${recipe.name}</strong> — added to your lab notebook!</div>`;
    }
    return `<div class="story-result-discovery">📖 Recipe: ${recipe.emoji} ${recipe.name}</div>`;
  })();
  if (hardMode) {
    // In Hard Mode, hide the match-% and per-rule violation list. Only
    // synergies/conflicts are revealed (they're informative without
    // disclosing the target). Audience-reaction strip carries the verdict.
    // Discovery toasts ARE shown in Hard Mode — they reveal what the
    // player made, not what the audience wanted.
    if (discoveryLine) {
      wrap.removeAttribute('hidden');
      title.innerHTML = discoveryLine;
      effects.innerHTML = '';
    } else {
      wrap.setAttribute('hidden', '');
    }
  } else {
    wrap.removeAttribute('hidden');
    title.innerHTML = `${matchEmoji(m.pct)} <strong>${m.pct}%</strong> match for ${aud.emoji} ${aud.name} <span style="opacity:0.7">@ ${area.emoji} ${area.name}</span>`;
    const lines: string[] = [];
    if (discoveryLine) lines.push(discoveryLine);
    for (const v of m.violations) lines.push(`🚫 Restriction violated: ${v} (-25%)`);
    for (const s of r.triggeredSynergies) lines.push(`✨ Synergy: ${s}`);
    for (const c of r.triggeredConflicts) lines.push(`⚡ Conflict: ${c}`);
    const linesHtml = lines.length
      ? lines.map((l) => `<div class="story-result-effect">${l}</div>`).join('')
      : '<div class="story-result-effect" style="opacity:0.6">(no synergies or conflicts)</div>';
    // T1.1: per-axis breakdown (cause-effect)
    const breakdownHtml = breakdown
      ? `<details class="breakdown-details" open><summary>📊 Match breakdown — why ${m.pct}%?</summary><div class="breakdown-grid">${renderBreakdown(breakdown)}</div></details>`
      : '';
    effects.innerHTML = linesHtml + breakdownHtml;
  }
}

function onStoryLaunch(): void {
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
  const propsAfterArea = applyAreaModifiers(propsWithMastery, area);

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
  const hiddenCombo = ingredientCount > 0 ? detectHiddenCombo(ids) : null;
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
    // T2.2: streak multiplier + buff multiplier combine for total gold mult.
    const newStreak = recordLaunchForStreak(match.pct);
    const streakMult = streakGoldMultiplier(newStreak);
    const buffMult = goldMultiplierFromBuffs();
    awardGoldForLaunch(match.pct, areaId, streakMult * buffMult);
    awardResearchForLaunch(match.pct);
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
    // T4.1: apply hidden-combo bonus rewards + splash.
    if (hiddenCombo) {
      if (hiddenCombo.bonusGold > 0) addGold(hiddenCombo.bonusGold);
      if (hiddenCombo.bonusNotes > 0) addResearchNotes(hiddenCombo.bonusNotes);
      showHiddenComboSplash(hiddenCombo);
    }
    bumpBestMatch(aud.id, match.pct);
    bumpBestMatchOverall(match.pct);
    // Hard Mode tracking — but Meditation buff forces Easy Mode for this launch.
    if (loadHardMode() && !isEasyModeForceFromBuffs()) bumpBestHard(match.pct);
    incrementLaunchCount(); // P7: count for first-launch hint visibility
    recordGoodLaunch(match.pct); // P9: track good launches for Kitchen auto-unlock
    if (shouldAutoUnlockKitchen()) {
      setKitchenMode(true);
      showKitchenUnlockToast();
    }
    // T1.2: critical-tier visual splash.
    if (tier === 'perfect' || tier === 'great' || tier === 'disaster') {
      showCriticalSplash(tier);
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
  renderStoryResult(recipe, match, area, ingredientCount, discovery, breakdown, propsAfterArea);
  // V8 T3 — pulse the Fart Profile bars in step with the audio playback.
  if (ingredientCount > 0) {
    pulseFartProfile($('fartProfile'));
  }
  renderFirstLaunchHint(); // P7: re-render in case it should now hide
  // Phase P item 79 — once-per-boss toast when a boss becomes newly unlocked.
  maybeShowBossUnlockToast();
  if (ingredientCount > 0) {
    renderAudienceReaction(match.pct);
    setLastMatch(match.pct);
  }
}

function wireStoryLaunchButton(): void {
  $('storyLaunchBtn')?.addEventListener('click', onStoryLaunch);
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

export function initStoryPantry(): void {
  renderAudiencePortrait();
  renderAreaDisplay();
  wirePlateSlots();
  wireStoryLaunchButton();
  wireStoryHardModeButton();
  wireAreaChangeButton();
  wireMoveOnButton();
  wirePantryShowLockedToggle();
  renderPantryGrid();
  renderPlate();
  renderBellyMeter();
  renderProgression();
  renderActiveBuffStrip();
  renderFirstLaunchHint(); // P7: show hint on initial load for new players
}

// Test-only reset hook.
export function _resetPlateAndBelly(): void {
  plate = [null, null, null, null];
  bellySpentThisSession = 0;
}
