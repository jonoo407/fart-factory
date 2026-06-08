/**
 * PLAN v9 P4/§2 — the fixed Order Ticket dock: Stage · Shop · Kitchen · Book ·
 * Venue. The dock CONTAINS the real nav buttons (their ids + handlers are wired
 * by wireShop / wireKitchen / wireNotebook / wireVenueLadder), so there is a
 * single set of nav buttons — no duplicate copies in the top strip. This module
 * only manages the dock's reactive styling: the Kitchen tab turns orange while
 * a treatment is equipped (04 §2).
 */
import { loadEquippedTreatment } from '../state/persistence';

export function renderDock(): void {
  const kitchen = document.getElementById('kitchenModeToggle');
  if (kitchen) kitchen.classList.toggle('hot', loadEquippedTreatment() !== null);
}

export function wireDock(): void {
  renderDock();
  window.addEventListener('fart:treatment-changed', renderDock);
}
