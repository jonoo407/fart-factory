/**
 * Shop modal UI. Per PLAN.md §D Tier 7 Phase G items 49-51.
 *
 * - Open/close: clicking #shopBtn toggles #shopModal visibility.
 * - Render: shows daily-rolled offerings from `getShopOffers()` with
 *   per-rarity glow, price, and a Buy button.
 * - Buy flow: calls `attemptPurchase`; on success removes the offering
 *   card and refreshes the gold counter + pantry grid; on failure flashes
 *   the offer card.
 */

import { registerSurface } from './dock';
import { getShopOffers, attemptPurchase } from '../state/shop';
import { getFood } from '../state/food';
import { renderPantryGrid, renderProgression } from './plate';
import { loadGold } from '../state/persistence';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderBalance(): void {
  const b = $('shopBalance');
  if (b) b.textContent = String(loadGold());
}

function renderOffers(): void {
  const grid = $('shopOffers');
  if (!grid) return;
  const offers = getShopOffers();
  if (offers.length === 0) {
    grid.innerHTML = '<div class="shop-offers-empty">Everything in stock is already in your pantry. Come back tomorrow.</div>';
    return;
  }
  grid.innerHTML = offers
    .map((o) => {
      const food = getFood(o.foodId);
      if (!food) return '';
      const rarity = `rarity-${food.rarity}`;
      const affordable = loadGold() >= o.price;
      const ariaDisabled = affordable ? 'false' : 'true';
      const dataAffordable = affordable ? 'true' : 'false';
      return `<div class="shop-offer ${rarity}" data-food="${food.id}">
        <span class="food-emoji">${food.emoji}</span>
        <span class="food-name">${food.name}</span>
        <span class="shop-offer-rarity">${food.rarity}</span>
        <span class="shop-offer-price">💰 ${o.price}</span>
        <button type="button" class="shop-offer-buy" data-food="${food.id}" data-price="${o.price}" data-affordable="${dataAffordable}" aria-disabled="${ariaDisabled}" aria-label="Buy ${food.name} for ${o.price} gold">Buy</button>
      </div>`;
    })
    .join('');

  grid.querySelectorAll<HTMLButtonElement>('.shop-offer-buy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-food');
      const price = parseInt(btn.getAttribute('data-price') ?? '0', 10);
      if (!id) return;
      const r = attemptPurchase(id, price);
      if (r.ok) {
        // Remove this offer card; refresh balance + pantry + progression strip.
        const card = btn.closest<HTMLElement>('.shop-offer');
        if (card) card.remove();
        renderBalance();
        renderProgression();
        renderPantryGrid();
      } else {
        const card = btn.closest<HTMLElement>('.shop-offer');
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

export function wireShop(): void {
  // The dock owns open/close/highlight (see dock.ts); we just register what to
  // render when the Shop surface opens.
  registerSurface('shop', { render: () => { renderBalance(); renderOffers(); } });
}
