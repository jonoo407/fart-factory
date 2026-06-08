/**
 * PLAN v9 P4/§7 — the fixed Order Ticket dock: Stage · Shop · Kitchen · Book ·
 * Venue (04 §2). A bottom bar that proxies to the existing nav buttons so the
 * five destinations read as one tab bar. The Kitchen tab turns orange while a
 * treatment is equipped (04 §2). Progressive disclosure greys a tab until its
 * feature is unlocked (the Kitchen tab until Kitchen Mode is available).
 */
import { loadEquippedTreatment } from '../state/persistence';
import { shouldAutoUnlockKitchen } from '../scoring/kitchen-unlock';

interface DockItem {
  id: string;
  emoji: string;
  label: string;
  /** id of the existing button to proxy a click to (null = current screen). */
  target: string | null;
}

const ITEMS: DockItem[] = [
  { id: 'stage', emoji: '🎭', label: 'Stage', target: null },
  { id: 'shop', emoji: '🛒', label: 'Shop', target: 'shopBtn' },
  { id: 'kitchen', emoji: '🍳', label: 'Kitchen', target: 'kitchenModeToggle' },
  { id: 'book', emoji: '📖', label: 'Book', target: 'notebookBtn' },
  { id: 'venue', emoji: '🏟️', label: 'Venue', target: 'venueBtn' },
];

function isUnlocked(item: DockItem): boolean {
  // Kitchen is gated behind its auto-unlock; the rest are always available.
  if (item.id === 'kitchen') return shouldAutoUnlockKitchen();
  return true;
}

export function renderDock(): void {
  const dock = document.getElementById('dock');
  if (!dock) return;
  const equipped = loadEquippedTreatment() !== null;
  dock.innerHTML = ITEMS.map((it) => {
    const locked = !isUnlocked(it);
    const cls = [
      'dock-item',
      it.id === 'stage' ? 'on' : '',
      it.id === 'kitchen' && equipped ? 'hot' : '',
      locked ? 'locked' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<button type="button" class="${cls}" data-target="${it.target ?? ''}" ${locked ? 'aria-disabled="true"' : ''} aria-label="${it.label}"><span class="dock-e">${it.emoji}</span>${it.label}</button>`;
  }).join('');
  dock.querySelectorAll<HTMLButtonElement>('.dock-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked')) return;
      const target = btn.getAttribute('data-target');
      if (target) document.getElementById(target)?.click();
    });
  });
}

export function wireDock(): void {
  renderDock();
  // Re-render when a treatment is equipped/unequipped or the kitchen unlocks.
  window.addEventListener('fart:treatment-changed', renderDock);
  window.addEventListener('fart:kitchen-unlocked', renderDock);
}
