/**
 * Research panel UI. Per PLAN.md §D Tier 7 Phase I item 57.
 *
 * Lists all foods that can be unlocked with research notes (uncommon /
 * rare / epic — NEVER legendary). Clicking the Unlock button calls
 * `attemptResearchUnlock` and refreshes the pantry + balance.
 */

import { attemptResearchUnlock, researchEligibleFoods } from '../scoring/research';
import { getFood } from '../state/food';
import { renderPantryGrid, renderProgression } from './plate';
import { loadResearchNotes } from '../state/persistence';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderBalance(): void {
  const b = $('researchBalance');
  if (b) b.textContent = String(loadResearchNotes());
}

function renderOffers(): void {
  const grid = $('researchOffers');
  if (!grid) return;
  const items = researchEligibleFoods();
  if (items.length === 0) {
    grid.innerHTML = '<div class="research-offers-empty">You\'ve unlocked every research-eligible food. Legendary foods unlock via quests.</div>';
    return;
  }
  // Sort by rarity ascending so cheaper unlocks appear first.
  const rarityOrder: Record<string, number> = { uncommon: 0, rare: 1, epic: 2 };
  const sorted = items.slice().sort((a, b) => {
    const ar = rarityOrder[getFood(a.foodId)?.rarity ?? ''] ?? 99;
    const br = rarityOrder[getFood(b.foodId)?.rarity ?? ''] ?? 99;
    if (ar !== br) return ar - br;
    return a.cost - b.cost;
  });
  const balance = loadResearchNotes();
  grid.innerHTML = sorted
    .map((item) => {
      const food = getFood(item.foodId);
      if (!food) return '';
      const rarity = `rarity-${food.rarity}`;
      const affordable = balance >= item.cost;
      const ariaDisabled = affordable ? 'false' : 'true';
      return `<div class="research-offer ${rarity}" data-food="${food.id}">
        <span class="food-emoji">${food.emoji}</span>
        <span class="food-name">${food.name}</span>
        <span class="research-offer-rarity">${food.rarity}</span>
        <span class="research-offer-cost">📝 ${item.cost}</span>
        <button type="button" class="research-offer-unlock" data-food="${food.id}" aria-disabled="${ariaDisabled}" aria-label="Unlock ${food.name} for ${item.cost} research notes">Unlock</button>
      </div>`;
    })
    .join('');

  grid.querySelectorAll<HTMLButtonElement>('.research-offer-unlock').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-food');
      if (!id) return;
      const r = attemptResearchUnlock(id);
      if (r.ok) {
        const card = btn.closest<HTMLElement>('.research-offer');
        if (card) card.remove();
        renderBalance();
        renderProgression();
        renderPantryGrid();
      } else {
        const card = btn.closest<HTMLElement>('.research-offer');
        if (card) {
          card.classList.remove('research-offer-refused');
          void card.offsetWidth;
          card.classList.add('research-offer-refused');
          setTimeout(() => card.classList.remove('research-offer-refused'), 600);
        }
      }
    });
  });
}

export function openResearch(): void {
  renderBalance();
  renderOffers();
  $('researchModal')?.removeAttribute('hidden');
}

export function closeResearch(): void {
  $('researchModal')?.setAttribute('hidden', '');
}

export function wireResearch(): void {
  $('researchBtn')?.addEventListener('click', openResearch);
  // PLAN v9 UI-overhaul — research is reachable from the Lab Book (Book dock tab)
  // now that it's off the top bar.
  $('notebookResearchBtn')?.addEventListener('click', () => {
    $('notebookModal')?.setAttribute('hidden', '');
    openResearch();
  });
  $('researchCloseBtn')?.addEventListener('click', closeResearch);
  $('researchModal')?.addEventListener('click', (ev) => {
    if (ev.target === $('researchModal')) closeResearch();
  });
}
