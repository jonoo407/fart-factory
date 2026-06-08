/**
 * Kitchen overlay (PLAN v9 Phase 6 — single-equip model).
 *
 * The Kitchen is the single place to EQUIP one treatment. The equipped
 * treatment tweaks every brew the player launches until they swap it
 * (resolveEquippedLaunch in scoring/launch-resolver applies it to every plated
 * food). Equipping dispatches `fart:treatment-changed` so the dock Kitchen tab
 * lights `.hot`.
 *
 * The fermentation rack (stash a food overnight → unlock a variant) lives here
 * for now as a secondary, claim-only section; it is slated to move behind the
 * future "More" surface (PLAN v9 decision #3).
 */

import { getFood } from '../state/food';
import { TREATMENTS, type TreatmentId } from '../scoring/treatments';
import {
  loadFermentRack,
  getReadyFerments,
  claimFerment,
  clearExpired,
  incrementFermentClaims,
  FERMENT_RACK_SIZE,
  type FermentSlot,
} from '../state/ferment-rack';
import { unlockFood, loadEquippedTreatment, setEquippedTreatment } from '../state/persistence';

/** Whether the Kitchen overlay is open. */
let kitchenOpen = false;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function isKitchenOpen(): boolean {
  return kitchenOpen;
}

// ----- Kitchen-unlock flag (doubles as the dock-tab unlock gate) -----

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

// ----- Treatment list (single-equip) -----

/**
 * Treatments offered as a single equip: the additive modifiers that make sense
 * applied to every food. `raw` (identity — covered by the None row) and `blend`
 * (merges two foods, needs a partner) are excluded.
 */
const EQUIP_OPTIONS = TREATMENTS.filter((t) => t.id !== 'raw' && !t.merges);

function treatmentRow(
  key: string,
  emoji: string,
  name: string,
  effect: string,
  active: boolean,
  onPick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kit-treat' + (active ? ' on' : '');
  btn.dataset.treatment = key;
  btn.setAttribute('aria-pressed', String(active));
  btn.innerHTML = `
    <span class="kem">${emoji}</span>
    <div class="ktx"><div class="knm">${name}</div><div class="kef">${effect}</div></div>
    <span class="kchk">${active ? '✓' : ''}</span>
  `;
  btn.addEventListener('click', onPick);
  return btn;
}

function equip(id: TreatmentId | null): void {
  setEquippedTreatment(id);
  // Notify the dock (and anything else listening) that the equip changed.
  window.dispatchEvent(new CustomEvent('fart:treatment-changed'));
  renderTreatmentList();
}

export function renderTreatmentList(): void {
  const list = $('treatmentList');
  if (!list) return;
  const equipped = loadEquippedTreatment();
  list.innerHTML = '';
  list.appendChild(
    treatmentRow('none', '🚫', 'None', 'Launch the brew as-is.', equipped === null, () =>
      equip(null),
    ),
  );
  for (const t of EQUIP_OPTIONS) {
    list.appendChild(
      treatmentRow(t.id, t.emoji, t.name, t.flavor, equipped === t.id, () => equip(t.id)),
    );
  }
}

// ----- Ferment rack rendering (display + claim; add-to-rack moves to "More") -----

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
  renderTreatmentList();
  renderFermentRack();
  $('kitchenOverlay')?.removeAttribute('hidden');
}

export function closeKitchen(): void {
  kitchenOpen = false;
  $('kitchenOverlay')?.setAttribute('hidden', '');
}

// ----- Wire-up -----

/**
 * PLAN v9 UI-overhaul Phase 1 — the dock Kitchen tab is the single entry point.
 * It is locked (greyed, progressive disclosure) until the kitchen unlocks, then
 * a tap opens the overlay.
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
  $('kitchenOverlay')?.addEventListener('click', (ev) => {
    if (ev.target === $('kitchenOverlay')) closeKitchen();
  });
}

// Re-export FermentSlot for callers
export type { FermentSlot };
