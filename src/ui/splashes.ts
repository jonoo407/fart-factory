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

// Per-node pending hide timers. Splash nodes (esp. the SHARED #discoverySplash,
// written by combos / loot / recipe / wow / stuffed) used to each schedule an
// un-cancelled hide, so an older timer could dismiss a newer splash early.
const hideTimers = new Map<Element, ReturnType<typeof setTimeout>>();

/** Hide `el` after `ms`, cancelling any prior pending hide for the same node. */
export function scheduleHide(el: HTMLElement, showClass: string, ms: number): void {
  const prev = hideTimers.get(el);
  if (prev !== undefined) clearTimeout(prev);
  const id = setTimeout(() => {
    el.setAttribute('hidden', '');
    el.classList.remove(showClass);
    hideTimers.delete(el);
  }, ms);
  hideTimers.set(el, id);
}

export function showKitchenUnlockToast(): void {
  const toast = document.getElementById('bossUnlockToast');
  if (!toast) return;
  toast.textContent = '🍳 Kitchen Mode unlocked! Roast, chill, and ferment your foods for advanced launches.';
  toast.removeAttribute('hidden');
  toast.classList.remove('boss-unlock-toast-enter');
  void toast.offsetWidth;
  toast.classList.add('boss-unlock-toast-enter');
  setTimeout(() => toast.setAttribute('hidden', ''), 5000);
  // PLAN v9 UI-overhaul Phase 1 — unlock the dock Kitchen tab (it opens the
  // overlay directly now; there is no separate strip button anymore).
  const t = document.getElementById('kitchenModeToggle');
  if (t) {
    t.classList.remove('locked');
    t.setAttribute('aria-disabled', 'false');
  }
}

/**
 * Tapping the still-locked Kitchen tab surfaces this hint (instead of a silent
 * no-op) so players know the tab is a gated reward, not a broken button.
 */
export function showKitchenLockedHint(goodLaunches: number, threshold: number): void {
  const toast = document.getElementById('bossUnlockToast');
  if (!toast) return;
  const left = Math.max(0, threshold - goodLaunches);
  toast.textContent =
    `🔒 Kitchen locked — land ${left} more ${left === 1 ? 'show' : 'shows'} at ≥50% match to unlock treatments (${goodLaunches}/${threshold}).`;
  toast.removeAttribute('hidden');
  toast.classList.remove('boss-unlock-toast-enter');
  void toast.offsetWidth;
  toast.classList.add('boss-unlock-toast-enter');
  setTimeout(() => toast.setAttribute('hidden', ''), 3500);
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
  scheduleHide(splash, 'discovery-splash-show', 3500);
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
  scheduleHide(overlay, 'ultimate-overlay-show', 2500);
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
  scheduleHide(splash, 'discovery-splash-show', 3200);
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
  scheduleHide(splash, 'critical-splash-show', 1800);
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
  scheduleHide(splash, 'axis-discovery-show', 3000);
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
  scheduleHide(splash, 'discovery-splash-show', 3200);
}

/**
 * T4.2 — the Mystery Unicorn's comedy beat. With a gift it celebrates the
 * guaranteed-legendary reward; without one (a flop, or you own every legendary)
 * it gives the absurdist consolation. Always fires on a unicorn launch.
 */
export function showUnicornSplash(gift: { name: string; emoji: string } | null): void {
  const splash = document.getElementById('discoverySplash');
  if (!splash) return;
  const inner = gift
    ? `<div class="discovery-splash-banner">🦄 THE UNICORN IS PLEASED 🦄</div>
       <div class="discovery-splash-emoji">${gift.emoji}</div>
       <div class="discovery-splash-name">${gift.name}</div>
       <div class="discovery-splash-desc">It nudges a LEGENDARY ingredient toward you, then resumes chewing its daisy.</div>
       <div class="discovery-splash-hint">📦 Added to your pantry</div>`
    : `<div class="discovery-splash-banner">🦄 THE UNICORN DEPARTS 🦄</div>
       <div class="discovery-splash-emoji">🦄</div>
       <div class="discovery-splash-name">It was unmoved. Or deeply moved. Hard to say.</div>
       <div class="discovery-splash-desc">It wanders back out, still chewing the daisy.</div>`;
  splash.innerHTML = `<div class="discovery-splash-card rarity-legendary">${inner}</div>`;
  splash.removeAttribute('hidden');
  splash.classList.remove('discovery-splash-show');
  void splash.offsetWidth;
  splash.classList.add('discovery-splash-show');
  scheduleHide(splash, 'discovery-splash-show', 3500);
}

export function flashLegendaryFanfare(): void {
  const wrap = document.querySelector<HTMLElement>('.audience-wrap');
  if (!wrap) return;
  wrap.classList.remove('audience-wrap-legendary');
  void wrap.offsetWidth;
  wrap.classList.add('audience-wrap-legendary');
  setTimeout(() => wrap.classList.remove('audience-wrap-legendary'), 1600);
}
