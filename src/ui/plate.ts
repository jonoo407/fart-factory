/**
 * Story Mode pantry + plate + belly meter UI logic. Per PLAN.md §D Phase C
 * items 34-37. Wires localStorage state (pantry / belly) to the DOM
 * defined in index.html (#pantryGrid, #plate, #bellyFill, #plateSlotN).
 */

import { FOODS, type Food, getFood } from '../state/food';
import {
  loadPantry,
  loadBelly,
  spendBelly,
  BELLY_CAPACITY,
} from '../state/persistence';
import { computeFartFromPlate, type RecipeResult } from '../scoring/fart-recipe';
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
export function addFoodToPlate(foodId: string): { ok: boolean; reason?: string } {
  if (!loadPantry().includes(foodId)) return { ok: false, reason: 'not-unlocked' };
  const food = getFood(foodId);
  if (!food) return { ok: false, reason: 'unknown-food' };
  const emptyIdx = plate.findIndex((s) => s === null);
  if (emptyIdx === -1) return { ok: false, reason: 'plate-full' };
  if (food.bellyCost > remainingBelly()) return { ok: false, reason: 'insufficient-belly' };
  plate[emptyIdx] = foodId;
  bellySpentThisSession += food.bellyCost;
  return { ok: true };
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

function buildFoodCard(food: Food, opts: { locked?: boolean; clickable?: boolean }): string {
  const lockedClass = opts.locked ? 'food-card-locked' : '';
  const clickableClass = opts.clickable ? 'food-card-clickable' : '';
  const aria = opts.locked
    ? `aria-label="Locked: ${food.name} (${food.rarity})" disabled`
    : `aria-label="Add ${food.name} (costs ${food.bellyCost} belly)"`;
  const emoji = opts.locked ? '❓' : food.emoji;
  const name = opts.locked ? '???' : food.name;
  const cost = opts.locked ? '?' : String(food.bellyCost);
  const tag = opts.clickable ? 'button' : 'div';
  const type = tag === 'button' ? 'type="button"' : '';
  return `<${tag} ${type} class="food-card ${rarityClassFor(food)} ${lockedClass} ${clickableClass}" data-food="${food.id}" ${aria}>
    <span class="food-emoji">${emoji}</span>
    <span class="food-name">${name}</span>
    <span class="food-cost">🍽️ ${cost}</span>
  </${tag}>`;
}

export function renderPantryGrid(): void {
  const grid = $('pantryGrid');
  if (!grid) return;
  const unlocked = new Set(loadPantry());
  // Sort by rarity (common first), then alphabetical. Locked teasers at the end.
  const sorted = [...FOODS].sort((a, b) => {
    const rarityOrder: Record<string, number> = {
      common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
    };
    const ru = unlocked.has(a.id) ? 0 : 1;
    const rb = unlocked.has(b.id) ? 0 : 1;
    if (ru !== rb) return ru - rb;
    const ar = rarityOrder[a.rarity] ?? 99;
    const br = rarityOrder[b.rarity] ?? 99;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
  grid.innerHTML = sorted
    .map((f) => buildFoodCard(f, { locked: !unlocked.has(f.id), clickable: unlocked.has(f.id) }))
    .join('');
  // Wire clicks.
  grid.querySelectorAll<HTMLElement>('.food-card-clickable').forEach((el) => {
    const id = el.getAttribute('data-food');
    if (!id) return;
    el.addEventListener('click', () => {
      const result = addFoodToPlate(id);
      if (result.ok) {
        renderPlate();
        renderBellyMeter();
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
function recipeToSliderInputs(r: RecipeResult): [number, number, number, number, number, number] {
  // Original playFart signature: (length, wetness, volume, stinkiness, temp, musical)
  const p = r.props;
  return [
    clampUiAxis(p.length),
    clampUiAxis(p.wet - p.dry / 2 + 5), // wet-vs-dry composite mapped near middle
    clampUiAxis(p.loud + 3),
    clampUiAxis(p.stink),
    clampUiAxis(p.temp + 3),
    clampUiAxis(p.musical + 2),
  ];
}

function renderStoryResult(r: RecipeResult): void {
  const wrap = $('storyResult');
  const title = $('storyResultTitle');
  const effects = $('storyResultEffects');
  if (!wrap || !title || !effects) return;
  wrap.removeAttribute('hidden');
  const plateLen = plateIngredientIds().length;
  title.textContent = plateLen === 0
    ? '🌬️ A whisper. (Empty plate.)'
    : `🎉 Launched ${plateLen}-ingredient recipe`;
  const lines: string[] = [];
  for (const s of r.triggeredSynergies) lines.push(`✨ Synergy: ${s}`);
  for (const c of r.triggeredConflicts) lines.push(`⚡ Conflict: ${c}`);
  effects.innerHTML = lines.length
    ? lines.map((l) => `<div class="story-result-effect">${l}</div>`).join('')
    : '<div class="story-result-effect" style="opacity:0.6">(no synergies or conflicts)</div>';
}

function onStoryLaunch(): void {
  const ids = plateIngredientIds();
  const r = computeFartFromPlate(ids);
  const [length, wetness, volume, stink, temp, musical] = recipeToSliderInputs(r);

  triggerHaptic(HAPTICS.launch);
  playFart(length, wetness, volume, stink, temp, musical);
  spawnGas(stink, volume);

  // Persist the belly cost actually incurred this session.
  commitBellySpend();

  // After launch, clear plate so player can build the next recipe.
  clearPlate();
  renderPlate();
  renderBellyMeter();
  renderStoryResult(r);
}

function wireStoryLaunchButton(): void {
  $('storyLaunchBtn')?.addEventListener('click', onStoryLaunch);
}

export function initStoryPantry(): void {
  wirePlateSlots();
  wireStoryLaunchButton();
  renderPantryGrid();
  renderPlate();
  renderBellyMeter();
}

// Test-only reset hook.
export function _resetPlateAndBelly(): void {
  plate = [null, null, null, null];
  bellySpentThisSession = 0;
}
