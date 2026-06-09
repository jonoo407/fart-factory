/**
 * V8 T7.d — Legendary Codex UI.
 *
 * Renders the codex panel inside the notebook. Each legendary recipe
 * either shows its quest gate (when locked) or a slot grid (when the
 * quest has cleared). Players click a slot to open a pantry picker;
 * picking a food calls `testCodexSlot` and re-renders.
 */

import { RECIPES, type Recipe } from '../state/recipes';
import {
  loadCodex,
  loadCodexSlot,
  testCodexSlot,
  isFullyDecoded,
  TEST_GOLD_COST,
  TEST_NOTES_COST,
  type CodexTestResult,
} from '../state/codex';
import { loadPantry, loadGold, loadResearchNotes } from '../state/persistence';
import { getFood } from '../state/food';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function questGateCleared(r: Recipe): boolean {
  // The legendaryUnlock.steps are human-readable strings — the actual
  // gating logic lives in src/state/quests.ts. For the codex, we treat
  // a recipe as "unlocked" if all required ingredients are at least
  // present in the catalog AND the player has unlocked at least one of
  // them. This is a permissive heuristic — actual quest progress is
  // tracked by the existing LEGENDARY_QUESTS system, and the player
  // unlocks the legendary food (the ingredient) through quest claims.
  //
  // For now: unlock the codex slot grid as soon as at least one
  // ingredient of the recipe is in the player's pantry. This gives
  // early teasing access while keeping the recipe itself a puzzle.
  const pantry = new Set(loadPantry());
  return r.ingredients.some((id) => pantry.has(id));
}

export function renderCodexEntryHtml(r: Recipe): string {
  const locked = !questGateCleared(r);
  const codex = loadCodex()[r.id];
  const decoded = isFullyDecoded(r.id);
  const header = (
    `<div class="codex-entry-head">` +
      `<span class="codex-entry-emoji">${r.emoji}</span>` +
      `<span class="codex-entry-name">${escapeHtml(r.name)}</span>` +
      (decoded
        ? `<span class="codex-entry-badge codex-entry-decoded">✓ DECODED</span>`
        : locked
          ? `<span class="codex-entry-badge codex-entry-locked">🔒 LOCKED</span>`
          : `<span class="codex-entry-badge codex-entry-probing">📜 PROBING</span>`) +
    `</div>` +
    (r.description ? `<div class="codex-entry-desc">${escapeHtml(r.description)}</div>` : '')
  );

  if (locked) {
    const steps = r.legendaryUnlock?.steps ?? [];
    return (
      `<div class="codex-entry codex-entry-locked-wrap rarity-legendary" data-codex-recipe="${r.id}">` +
        header +
        `<ul class="codex-entry-quest">` +
          steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('') +
        `</ul>` +
      `</div>`
    );
  }

  const slots = r.ingredients.map((_expectedFoodId, idx) => {
    const slot = loadCodexSlot(r.id, idx);
    if (slot.revealed) {
      const food = getFood(slot.revealed);
      const emoji = food?.emoji ?? '❓';
      const name = food?.name ?? slot.revealed;
      return (
        `<button type="button" class="codex-slot codex-slot-revealed" data-codex-slot="${idx}" data-codex-recipe="${r.id}" data-food="${slot.revealed}" disabled>` +
          `<span class="codex-slot-emoji">${emoji}</span>` +
          `<span class="codex-slot-name">${escapeHtml(name)}</span>` +
        `</button>`
      );
    }
    return (
      `<button type="button" class="codex-slot codex-slot-hidden" data-codex-slot="${idx}" data-codex-recipe="${r.id}">` +
        `<span class="codex-slot-emoji">❓</span>` +
        `<span class="codex-slot-name">slot ${idx + 1}</span>` +
      `</button>`
    );
  }).join('');

  const decodedFooter = decoded && r.legendaryBuff
    ? `<div class="codex-entry-buff">🎁 <strong>Unlocked passive:</strong> ${escapeHtml(r.legendaryBuff.label)}</div>`
    : `<div class="codex-entry-cost">Test cost: <strong>${TEST_GOLD_COST} gold + ${TEST_NOTES_COST} note + 1 ingredient</strong></div>`;

  const buffPreview = r.legendaryBuff && !decoded
    ? `<div class="codex-entry-buff-preview">🎁 Decode all slots to unlock: <em>${escapeHtml(r.legendaryBuff.label)}</em></div>`
    : '';

  return (
    `<div class="codex-entry rarity-legendary" data-codex-recipe="${r.id}" data-codex-state="${decoded ? 'decoded' : 'probing'}">` +
      header +
      `<div class="codex-entry-slots">${slots}</div>` +
      decodedFooter +
      buffPreview +
      (codex ? `<div class="codex-entry-progress">${Object.keys(codex.revealed).length} of ${r.ingredients.length} slots revealed</div>` : '') +
    `</div>`
  );
}

// ----- Render + wire -----

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function renderLegendaryCodex(): void {
  const grid = $('legendaryCodex');
  if (!grid) return;
  const legendaries = RECIPES.filter((r) => r.rarity === 'legendary');
  grid.innerHTML = legendaries.map((r) => renderCodexEntryHtml(r)).join('');
  wireSlotButtons(grid);
}

function wireSlotButtons(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('.codex-slot.codex-slot-hidden').forEach((btn) => {
    btn.addEventListener('click', () => {
      const recipeId = btn.getAttribute('data-codex-recipe') ?? '';
      const slotIdx = parseInt(btn.getAttribute('data-codex-slot') ?? '-1', 10);
      if (!recipeId || Number.isNaN(slotIdx) || slotIdx < 0) return;
      openPantryPicker(recipeId, slotIdx);
    });
  });
}

function openPantryPicker(recipeId: string, slotIdx: number): void {
  const picker = $('codexPicker');
  const pickerList = $('codexPickerList');
  const pickerTitle = $('codexPickerTitle');
  const pickerCost = $('codexPickerCost');
  const pickerResult = $('codexPickerResult');
  if (!picker || !pickerList) return;
  const pantry = loadPantry();
  const gold = loadGold();
  const notes = loadResearchNotes();
  if (pickerTitle) pickerTitle.textContent = `Probe slot ${slotIdx + 1}`;
  if (pickerCost) pickerCost.textContent = `Cost: ${TEST_GOLD_COST} gold + ${TEST_NOTES_COST} note (you have ${gold}g, ${notes} notes)`;
  if (pickerResult) pickerResult.textContent = '';
  const tested = loadCodexSlot(recipeId, slotIdx).tested;
  const testedSet = new Set(tested);
  pickerList.innerHTML = pantry.map((id) => {
    const food = getFood(id);
    if (!food) return '';
    const grayed = testedSet.has(id) ? ' codex-picker-tried' : '';
    return `<button type="button" class="codex-picker-card${grayed}" data-codex-pick="${id}">
      <span>${food.emoji}</span>
      <span>${escapeHtml(food.name)}</span>
      ${testedSet.has(id) ? '<span class="codex-picker-tried-label">already tried</span>' : ''}
    </button>`;
  }).join('');
  pickerList.querySelectorAll<HTMLButtonElement>('.codex-picker-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const foodId = btn.getAttribute('data-codex-pick') ?? '';
      if (!foodId) return;
      const result = testCodexSlot(recipeId, slotIdx, foodId);
      showResult(result, pickerResult);
      // Re-render the codex grid + leave the picker open for follow-up probes
      // unless the slot just landed a hit.
      renderLegendaryCodex();
      if (result.hit) {
        // Auto-close after a brief delay so the player sees the confirmation.
        setTimeout(closePantryPicker, 900);
      }
    });
  });
  picker.removeAttribute('hidden');
}

function closePantryPicker(): void {
  $('codexPicker')?.setAttribute('hidden', '');
}

function showResult(r: CodexTestResult, el: HTMLElement | null): void {
  if (!el) return;
  if (r.refused) {
    const msg: Record<NonNullable<CodexTestResult['refused']>, string> = {
      'insufficient-gold': '❌ Not enough gold.',
      'insufficient-notes': '❌ Not enough research notes.',
      'not-in-pantry': '❌ You don\'t own that ingredient yet.',
      'not-legendary': '❌ That recipe is not part of the codex.',
      'slot-out-of-range': '❌ Invalid slot.',
    };
    el.textContent = msg[r.refused];
    return;
  }
  if (r.hit) {
    el.innerHTML = r.unlockedBuff
      ? '✨ <strong>DECODED!</strong> Permanent passive unlocked!'
      : '✓ Correct! Slot revealed.';
  } else {
    el.innerHTML = r.hint ?? 'Wrong guess.';
  }
}

export function wireCodexPicker(): void {
  $('codexPickerCloseBtn')?.addEventListener('click', closePantryPicker);
  const picker = $('codexPicker');
  picker?.addEventListener('click', (ev) => {
    if (ev.target === picker) closePantryPicker();
  });
}
