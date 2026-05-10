/**
 * Lab Notebook modal UI. Per PLAN.md §D Tier 7 Phase H items 53-54.
 *
 * Lists all recipes. Discovered ones show full info + Cook button (item
 * 54 — recipe-as-preset). Undiscovered hidden ones show a silhouette
 * with a count hint. Legendary recipes show their quest steps even when
 * undiscovered (the quest path IS the gameplay).
 */

import { RECIPES, getRecipe, type Recipe } from '../state/recipes';
import { loadDiscoveredRecipes } from '../state/persistence';
import { getFood } from '../state/food';
import { addFoodToPlate, renderPlate, renderBellyMeter, _resetPlateAndBelly } from './plate';
import { recipeProgress } from '../scoring/discovery';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderNotebookCounter(): void {
  const { discovered, total } = recipeProgress();
  const counter = $('notebookCounter');
  if (counter) counter.textContent = `${discovered}/${total}`;
  const progress = $('notebookProgressText');
  if (progress) progress.textContent = `${discovered} / ${total} discovered`;
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

export function openNotebook(): void {
  renderNotebookCounter();
  renderRecipes();
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
}

// Re-export for callers that want to refresh the counter after a launch.
export { renderNotebookCounter };
