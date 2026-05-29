/**
 * Splash / toast helpers — each owns one DOM region defined in
 * index.html (#discoverySplash, #criticalSplash, #axisDiscoverySplash,
 * #ultimateOverlay, #bossUnlockToast). Extracted from plate.ts so the
 * launch flow doesn't carry ~120 lines of presentational DOM glue.
 */

import { axisEmoji } from './axis-emoji';
import { tierLabel as criticalLabel, type CriticalTier } from '../scoring/critical-tier';
import { getRecipe } from '../state/recipes';
import type { AxisName } from '../state/axis-discovery';

export function showKitchenUnlockToast(): void {
  const toast = document.getElementById('bossUnlockToast');
  if (!toast) return;
  toast.textContent = '🍳 Kitchen Mode unlocked! Roast, chill, and ferment your foods for advanced launches.';
  toast.removeAttribute('hidden');
  toast.classList.remove('boss-unlock-toast-enter');
  void toast.offsetWidth;
  toast.classList.add('boss-unlock-toast-enter');
  setTimeout(() => toast.setAttribute('hidden', ''), 5000);
  const t = document.getElementById('kitchenModeToggle');
  if (t) {
    t.setAttribute('aria-pressed', 'true');
    t.classList.add('kitchen-mode-toggle-on');
  }
  const kb = document.getElementById('kitchenBtn');
  if (kb) kb.removeAttribute('hidden');
}

export function showHiddenComboSplash(
  combo: { name: string; emoji: string; flavor: string; bonusGold: number; bonusNotes: number },
): void {
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

export function showUltimateOverlay(count: number): void {
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

export function showLootDropSplash(
  food: { id: string; name: string; emoji: string; rarity: string },
): void {
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

export function showCriticalSplash(tier: CriticalTier): void {
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

export function showAxisDiscoverySplash(axes: readonly AxisName[]): void {
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

export function showDiscoverySplash(recipeId: string): void {
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

export function flashLegendaryFanfare(): void {
  const wrap = document.querySelector<HTMLElement>('.audience-wrap');
  if (!wrap) return;
  wrap.classList.remove('audience-wrap-legendary');
  void wrap.offsetWidth;
  wrap.classList.add('audience-wrap-legendary');
  setTimeout(() => wrap.classList.remove('audience-wrap-legendary'), 1600);
}
