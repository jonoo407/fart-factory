/**
 * Lab Notebook modal UI. Per PLAN.md §D Tier 7 Phase H items 53-54.
 *
 * Lists all recipes. Discovered ones show full info + Cook button (item
 * 54 — recipe-as-preset). Undiscovered hidden ones show a silhouette
 * with a count hint. Legendary recipes show their quest steps even when
 * undiscovered (the quest path IS the gameplay).
 */

import { RECIPES, getRecipe, type Recipe } from '../state/recipes';
import { loadDiscoveredRecipes, loadPantry, loadHiddenCombosFound } from '../state/persistence';
import { HIDDEN_COMBO_CATALOG } from '../scoring/hidden-combos';
import { FOODS, getFood } from '../state/food';
import { addFoodToPlate, renderPlate, renderBellyMeter, renderPantryGrid, renderProgression, _resetPlateAndBelly } from './plate';
import { recipeProgress } from '../scoring/discovery';
import { LEGENDARY_QUESTS, questProgress, attemptClaimLegendary } from '../state/quests';
import { renderBossList } from './boss-arena';
import { loadFoodMastery } from '../scoring/food-mastery';
import { loadDiscoveredAxes } from '../state/axis-discovery';
import { renderFieldGuideEntryHtml } from './field-guide';
import { renderLegendaryCodex, wireCodexPicker } from './codex';
import { loadTrophies } from '../state/trophies';
import { getBoss } from '../state/bosses';
import { loadGamePlusUnlocked } from '../state/boss-progress';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderNotebookCounter(): void {
  const { discovered, total } = recipeProgress();
  const counter = $('notebookCounter');
  if (counter) counter.textContent = `${discovered}/${total}`;
  const progress = $('notebookProgressText');
  if (progress) {
    // P12: GamePlus badge.
    const badge = loadGamePlusUnlocked() ? ' 🌌 New Game+' : '';
    progress.textContent = `${discovered} / ${total} discovered${badge}`;
  }
}

function rarityClass(rarity: Recipe['rarity']): string {
  return `rarity-${rarity}`;
}

function renderRecipeCard(r: Recipe, isDiscovered: boolean): string {
  const rarity = rarityClass(r.rarity);
  if (!isDiscovered) {
    // Undiscovered: silhouette card with a hint.
    const ingredientCountHint = `${r.ingredients.length} ingredients`;
    const isLegendary = r.rarity === 'legendary';
    const stepLines = isLegendary && r.legendaryUnlock
      ? `<ul class="notebook-quest-steps">${r.legendaryUnlock.steps.map((s) => `<li>${s}</li>`).join('')}</ul>`
      : '';
    return `<div class="notebook-recipe notebook-recipe-locked ${rarity}" data-recipe="${r.id}">
      <span class="notebook-recipe-emoji">❓</span>
      <span class="notebook-recipe-name">???</span>
      <span class="notebook-recipe-rarity">${r.rarity}</span>
      <span class="notebook-recipe-hint">${ingredientCountHint}</span>
      ${stepLines}
    </div>`;
  }
  // Discovered: full info + Cook button.
  const ingredientChips = r.ingredients.map((id) => {
    const f = getFood(id);
    if (!f) return '';
    return `<span class="notebook-ingredient-chip">${f.emoji} ${f.name}</span>`;
  }).join(' ');
  return `<div class="notebook-recipe ${rarity}" data-recipe="${r.id}">
    <span class="notebook-recipe-emoji">${r.emoji}</span>
    <span class="notebook-recipe-name">${r.name}</span>
    <span class="notebook-recipe-rarity">${r.rarity}</span>
    <span class="notebook-recipe-ingredients">${ingredientChips}</span>
    ${r.description ? `<span class="notebook-recipe-desc">${r.description}</span>` : ''}
    <button type="button" class="notebook-recipe-cook" data-recipe="${r.id}" aria-label="Cook ${r.name} — auto-fill plate">🍴 Cook</button>
  </div>`;
}

function renderRecipes(): void {
  const grid = $('notebookRecipes');
  if (!grid) return;
  const discovered = new Set(loadDiscoveredRecipes());
  // Sort: discovered first, then by rarity ascending.
  const rarityOrder: Record<string, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
  };
  const sorted = [...RECIPES].sort((a, b) => {
    const ad = discovered.has(a.id) ? 0 : 1;
    const bd = discovered.has(b.id) ? 0 : 1;
    if (ad !== bd) return ad - bd;
    const ar = rarityOrder[a.rarity] ?? 99;
    const br = rarityOrder[b.rarity] ?? 99;
    return ar - br;
  });
  grid.innerHTML = sorted.map((r) => renderRecipeCard(r, discovered.has(r.id))).join('');

  // Wire Cook buttons.
  grid.querySelectorAll<HTMLButtonElement>('.notebook-recipe-cook').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-recipe');
      if (!id) return;
      cookRecipe(id);
    });
  });
}

/**
 * Auto-fill the plate with a recipe's ingredients. Skips ingredients the
 * player hasn't unlocked or can't afford (belly cost). Closes the modal.
 */
function cookRecipe(recipeId: string): void {
  const r = getRecipe(recipeId);
  if (!r) return;
  // Clear plate state (both the array AND the belly-spend counter).
  _resetPlateAndBelly();
  // Try to add each ingredient.
  for (const id of r.ingredients) {
    addFoodToPlate(id);
  }
  renderPlate();
  renderBellyMeter();
  closeNotebook();
}

function renderLegendaryQuests(): void {
  const grid = $('legendaryQuests');
  if (!grid) return;
  const unlocked = new Set(loadPantry());
  grid.innerHTML = LEGENDARY_QUESTS.map((q) => {
    const food = FOODS.find((f) => f.id === q.foodId);
    if (!food) return '';
    const prog = questProgress(q);
    const allDone = prog.steps.every((s) => s.done);
    const isUnlocked = unlocked.has(q.foodId);
    const stepHtml = prog.steps.map((s) => {
      const isPct = s.kind === 'best-overall';
      const valueText = isPct ? `${s.current}/${s.target}%` : `${s.current}/${s.target}`;
      const pctClass = s.done ? ' quest-step-done' : '';
      return `<li class="quest-step${pctClass}"><span class="quest-step-label">${s.label}</span><span class="quest-step-value">${valueText}</span></li>`;
    }).join('');
    let actionHtml = '';
    if (isUnlocked) {
      actionHtml = `<button type="button" class="quest-claimed-badge" disabled>✓ Unlocked</button>`;
    } else if (allDone) {
      actionHtml = `<button type="button" class="quest-claim-btn" data-food="${q.foodId}" aria-label="Claim ${food.name}">🏆 CLAIM</button>`;
    } else {
      actionHtml = `<button type="button" class="quest-claim-btn" data-food="${q.foodId}" aria-disabled="true" aria-label="Quest incomplete">Locked</button>`;
    }
    return `<div class="legendary-quest rarity-legendary" data-food="${q.foodId}">
      <span class="legendary-quest-emoji">${food.emoji}</span>
      <span class="legendary-quest-name">${food.name}</span>
      ${actionHtml}
      <ul class="legendary-quest-steps">${stepHtml}</ul>
    </div>`;
  }).join('');

  grid.querySelectorAll<HTMLButtonElement>('.quest-claim-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-food');
      if (!id) return;
      const r = attemptClaimLegendary(id);
      if (r.ok) {
        // Re-render legendary quests (this card flips to "Unlocked"), pantry,
        // progression strip. The notebook modal stays open so the player sees
        // the fanfare. Phase L will add particles.
        renderLegendaryQuests();
        renderPantryGrid();
        renderProgression();
      } else {
        // Refusal flash on the card.
        const card = btn.closest<HTMLElement>('.legendary-quest');
        if (card) {
          card.classList.remove('shop-offer-refused');
          void card.offsetWidth;
          card.classList.add('shop-offer-refused');
          setTimeout(() => card.classList.remove('shop-offer-refused'), 600);
        }
      }
    });
  });
}

/**
 * V8 T4 — Field Guide section. Replaces the old Food Mastery list. Each
 * unlocked food becomes a research subject card whose property bars fill
 * in by use-count (Scheme 2 progressive reveal). Locked foods show as
 * mystery placeholders at the bottom — the "go find me" prompt.
 */
function renderFieldGuide(): void {
  const grid = $('fieldGuide');
  if (!grid) return;
  const unlocked = new Set(loadPantry());
  const discovered = loadDiscoveredAxes();
  const rarityOrder: Record<string, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
  };
  const unlockedEntries = FOODS
    .filter((f) => unlocked.has(f.id))
    .sort((a, b) => (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99))
    .map((f) => renderFieldGuideEntryHtml(f, loadFoodMastery(f.id), discovered))
    .join('');
  const lockedCount = FOODS.filter((f) => !unlocked.has(f.id)).length;
  const lockedFoot = lockedCount > 0
    ? `<div class="field-guide-locked">🔒 ${lockedCount} more food${lockedCount === 1 ? '' : 's'} await study — find them in the shop or as loot drops.</div>`
    : '';
  grid.innerHTML = unlockedEntries + lockedFoot;
}

function renderHiddenCombos(): void {
  const grid = $('hiddenCombosList');
  if (!grid) return;
  const found = new Set(loadHiddenCombosFound());
  grid.innerHTML = HIDDEN_COMBO_CATALOG.map((c) => {
    const isFound = found.has(c.id);
    if (isFound) {
      return `<div class="hidden-combo hidden-combo-found" data-combo="${c.id}">
        <span class="hidden-combo-emoji">${c.emoji}</span>
        <span class="hidden-combo-name">${c.name}</span>
        <span class="hidden-combo-hint">${c.hint}</span>
      </div>`;
    }
    return `<div class="hidden-combo hidden-combo-locked" data-combo="${c.id}">
      <span class="hidden-combo-emoji">❓</span>
      <span class="hidden-combo-name">???</span>
      <span class="hidden-combo-hint">${c.hint}</span>
    </div>`;
  }).join('');
}

function renderTrophyList(): void {
  const grid = $('trophyList');
  if (!grid) return;
  const trophies = loadTrophies();
  if (trophies.length === 0) {
    grid.innerHTML = '<div class="trophy-empty">No trophies yet. Defeat a boss to earn one.</div>';
    return;
  }
  grid.innerHTML = trophies.slice().reverse().map((t) => {
    const boss = getBoss(t.bossId);
    const dateStr = new Date(t.defeatedAt).toLocaleDateString();
    return `<div class="trophy-row">
      <span class="trophy-emoji">${boss?.emoji ?? '🏆'}</span>
      <span class="trophy-name">${boss?.name ?? t.bossId}</span>
      <span class="trophy-pct">${t.matchPct}%</span>
      <span class="trophy-date">${dateStr}</span>
    </div>`;
  }).join('');
}

export function openNotebook(): void {
  renderNotebookCounter();
  renderRecipes();
  renderLegendaryQuests();
  renderBossList();
  renderFieldGuide();
  renderHiddenCombos();
  renderLegendaryCodex();
  renderTrophyList();
  $('notebookModal')?.removeAttribute('hidden');
}

export function closeNotebook(): void {
  $('notebookModal')?.setAttribute('hidden', '');
}

export function wireNotebook(): void {
  renderNotebookCounter();
  $('notebookBtn')?.addEventListener('click', openNotebook);
  $('notebookCloseBtn')?.addEventListener('click', closeNotebook);
  $('notebookModal')?.addEventListener('click', (ev) => {
    if (ev.target === $('notebookModal')) closeNotebook();
  });
  wireCodexPicker();
}

// Re-export for callers that want to refresh the counter after a launch.
export { renderNotebookCounter };
