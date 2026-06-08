/**
 * Kitchen prep UI. Per PLAN_v4.md §C.U items 94-96 + Phase V items 97-98.
 *
 * When Kitchen Mode is on (Phase W item 99), clicking pantry foods adds
 * them to the prep table instead of directly to the plate. Each prep
 * slot has a treatment selector. Send to Performance flushes the
 * prepped plate to the launch plate.
 *
 * Fermentation rack lets the player queue items for tomorrow.
 */

import { getFood, type Food } from '../state/food';
import { TREATMENTS, type TreatmentId, type PreppedSlot } from '../scoring/treatments';
import { addFoodToPlate, renderPlate, renderBellyMeter } from './plate';
import {
  loadFermentRack,
  getReadyFerments,
  claimFerment,
  clearExpired,
  addToFermentRack,
  incrementFermentClaims,
  FERMENT_RACK_SIZE,
  type FermentSlot,
} from '../state/ferment-rack';
import { unlockFood } from '../state/persistence';

const PREP_SLOTS = 4;

let prepSlots: (PreppedSlot | null)[] = Array(PREP_SLOTS).fill(null);
/** When Kitchen is open, pantry clicks route to prep instead of plate. */
let kitchenOpen = false;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function isKitchenOpen(): boolean {
  return kitchenOpen;
}

// ----- Kitchen-mode preference -----

const KITCHEN_MODE_KEY = 'fart_kitchen_mode';

export function loadKitchenMode(): boolean {
  try {
    return localStorage.getItem(KITCHEN_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setKitchenMode(v: boolean): void {
  try {
    localStorage.setItem(KITCHEN_MODE_KEY, String(v));
  } catch {
    // ignore
  }
}

// ----- Prep table rendering -----

function renderPrepTable(): void {
  const table = $('prepTable');
  if (!table) return;
  table.innerHTML = '';
  for (let i = 0; i < PREP_SLOTS; i++) {
    const slot = prepSlots[i];
    const id = `prepSlot${i + 1}`;
    if (slot) {
      const food = getFood(slot.foodId);
      if (!food) continue;
      const div = document.createElement('div');
      div.id = id;
      div.className = `prep-slot prep-slot-filled rarity-${food.rarity}`;
      div.innerHTML = `
        <button type="button" class="prep-slot-remove" data-slot="${i}" aria-label="Remove ${food.name} from prep">✕</button>
        <span class="food-emoji">${food.emoji}</span>
        <span class="food-name">${food.name}</span>
        <select class="prep-treatment-select" data-slot="${i}" aria-label="Choose treatment for ${food.name}">
          ${TREATMENTS.map((t) => `<option value="${t.id}" ${t.id === slot.treatment ? 'selected' : ''}>${t.emoji} ${t.name}</option>`).join('')}
        </select>
        <button type="button" class="prep-send-to-rack-btn" data-slot="${i}" aria-label="Send ${food.name} to fermentation rack">🥒 → Rack</button>
      `;
      table.appendChild(div);
    } else {
      const div = document.createElement('div');
      div.id = id;
      div.className = 'prep-slot';
      div.innerHTML = '<span class="prep-empty">＋ tap a pantry food</span>';
      table.appendChild(div);
    }
  }
  // Wire interactions.
  table.querySelectorAll<HTMLButtonElement>('.prep-slot-remove').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-slot') ?? '-1', 10);
      if (idx >= 0 && idx < PREP_SLOTS) {
        prepSlots[idx] = null;
        renderPrepTable();
      }
    });
  });
  table.querySelectorAll<HTMLSelectElement>('.prep-treatment-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.getAttribute('data-slot') ?? '-1', 10);
      if (idx >= 0 && idx < PREP_SLOTS && prepSlots[idx]) {
        prepSlots[idx]!.treatment = sel.value as TreatmentId;
      }
    });
  });
  // Phase V item 97 — Send to Rack button per filled prep slot.
  table.querySelectorAll<HTMLButtonElement>('.prep-send-to-rack-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-slot') ?? '-1', 10);
      if (idx < 0 || idx >= PREP_SLOTS) return;
      const slot = prepSlots[idx];
      if (!slot) return;
      const result = addToFermentRack(slot.foodId);
      if (result.ok) {
        prepSlots[idx] = null;
        renderPrepTable();
        renderFermentRack();
      } else {
        // Rack full — flash refusal on the button.
        btn.classList.add('prep-send-refused');
        setTimeout(() => btn.classList.remove('prep-send-refused'), 600);
      }
    });
  });
}

// ----- Ferment rack rendering -----

function renderFermentRack(): void {
  const grid = $('fermentRack');
  if (!grid) return;
  clearExpired();
  const rack = loadFermentRack();
  const ready = new Set(getReadyFerments().map((s) => s.foodId));
  grid.innerHTML = '';
  for (let i = 0; i < FERMENT_RACK_SIZE; i++) {
    const slot = rack[i];
    const div = document.createElement('div');
    div.className = 'ferment-slot';
    if (slot) {
      const food = getFood(slot.foodId);
      const isReady = ready.has(slot.foodId);
      div.classList.add(isReady ? 'ferment-slot-ready' : 'ferment-slot-waiting');
      div.innerHTML = `
        <span class="food-emoji">${food?.emoji ?? '❓'}</span>
        <span class="food-name">${food?.name ?? 'Unknown'}</span>
        <span class="ferment-status">${isReady ? '✓ Ready' : '⏳ Tomorrow'}</span>
        ${isReady ? `<button type="button" class="ferment-claim-btn" data-slot="${i}" aria-label="Claim fermented ${food?.name}">Claim</button>` : ''}
      `;
    } else {
      div.classList.add('ferment-slot-empty');
      div.innerHTML = '<span class="ferment-empty">empty slot</span>';
    }
    grid.appendChild(div);
  }
  grid.querySelectorAll<HTMLButtonElement>('.ferment-claim-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-slot') ?? '-1', 10);
      const r = claimFerment(idx);
      if (r.ok) {
        // Unlock the fermented variant (idempotent for already-unlocked).
        unlockFood(r.originalFoodId);
        // Phase V item 98 — bump the cumulative claims counter.
        incrementFermentClaims();
        renderFermentRack();
      }
    });
  });
}

// ----- Public API -----

export function openKitchen(): void {
  kitchenOpen = true;
  renderPrepTable();
  renderFermentRack();
  $('kitchenOverlay')?.removeAttribute('hidden');
}

export function closeKitchen(): void {
  kitchenOpen = false;
  $('kitchenOverlay')?.setAttribute('hidden', '');
}

/**
 * Called by plate.ts when a pantry food is clicked AND kitchen is open.
 * Returns true if the food was added to a prep slot.
 */
export function tryAddToPrep(foodId: string): boolean {
  if (!kitchenOpen) return false;
  const emptyIdx = prepSlots.findIndex((s) => s === null);
  if (emptyIdx === -1) return false;
  const food: Food | undefined = getFood(foodId);
  if (!food) return false;
  prepSlots[emptyIdx] = { foodId, treatment: 'raw' };
  renderPrepTable();
  return true;
}

/**
 * Send the prepped plate to the launch plate. Each prep slot's
 * treatment is encoded in the plate-side state by adding the food via
 * `addFoodToPlate` with a treatment glyph; treatments apply at launch
 * time.
 */
function sendToPerformance(): void {
  // Clear the plate before sending.
  // (plate.ts exports _resetPlateAndBelly; we use addFoodToPlate.)
  for (const slot of prepSlots) {
    if (!slot) continue;
    addFoodToPlate(slot.foodId);
    // Stash the treatment on the plate-slot dataset for the launch handler.
    // Done after addFoodToPlate so the DOM is in sync.
  }
  renderPlate();
  renderBellyMeter();
  // Persist prep-slot treatments alongside the plate (for launch).
  // We use a parallel localStorage key fart_plate_treatments.
  persistPrepTreatments();
  // Clear the prep table.
  prepSlots = Array(PREP_SLOTS).fill(null);
  closeKitchen();
}

const PLATE_TREATMENTS_KEY = 'fart_plate_treatments';

function persistPrepTreatments(): void {
  try {
    const treatments = prepSlots
      .filter((s): s is PreppedSlot => s !== null)
      .map((s) => s.treatment);
    localStorage.setItem(PLATE_TREATMENTS_KEY, JSON.stringify(treatments));
  } catch {
    // ignore
  }
}

export function loadPlateTreatments(): TreatmentId[] {
  try {
    const raw = localStorage.getItem(PLATE_TREATMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TreatmentId[];
    return [];
  } catch {
    return [];
  }
}

export function clearPlateTreatments(): void {
  try {
    localStorage.removeItem(PLATE_TREATMENTS_KEY);
  } catch {
    // ignore
  }
}

// ----- Wire-up -----

/**
 * PLAN v9 UI-overhaul Phase 1 — the dock Kitchen tab is the single entry point.
 * It is locked (greyed, progressive disclosure) until the kitchen unlocks, then
 * a tap opens the overlay. (Phase 6 rebuilds the overlay's contents.)
 */
function applyKitchenModeUI(): void {
  const unlocked = loadKitchenMode();
  const tab = $('kitchenModeToggle');
  if (tab) {
    tab.classList.toggle('locked', !unlocked);
    tab.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
  }
}

export function wireKitchen(): void {
  applyKitchenModeUI();
  $('kitchenModeToggle')?.addEventListener('click', () => {
    if (!loadKitchenMode()) return; // locked until unlocked
    openKitchen();
  });
  $('kitchenCloseBtn')?.addEventListener('click', closeKitchen);
  $('kitchenSendBtn')?.addEventListener('click', sendToPerformance);
  $('kitchenOverlay')?.addEventListener('click', (ev) => {
    if (ev.target === $('kitchenOverlay')) closeKitchen();
  });
}

// Test/debug
export function _getPrepSlots(): readonly (PreppedSlot | null)[] {
  return prepSlots;
}

// Re-export FermentSlot for callers
export type { FermentSlot };
