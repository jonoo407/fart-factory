/**
 * PLAN v9 — the dock IS the navigation. Bottom-tab model: Stage is home; Shop /
 * Kitchen / Book / Venue are overlays that open OVER the Stage and close back to
 * it. One consistent law for all four:
 *   - tap a tab  → open it (closing any other; one open at a time)
 *   - tap it again / tap Stage / tap ✕ / tap the backdrop → close → back to Stage
 *   - the lit tab (.on + aria-current) always reflects what is open
 *
 * Each surface module registers a render hook (+ optional unlock gate) via
 * registerSurface(); this module owns show/hide + the active-tab highlight, so
 * there is a single source of truth for "what's open". The kitchen `.hot` tint
 * (a treatment is equipped) is independent of `.on` (this surface is open).
 */
import { loadEquippedTreatment } from '../state/persistence';

export type Surface = 'stage' | 'shop' | 'kitchen' | 'book' | 'venue';
type Overlayed = Exclude<Surface, 'stage'>;

const OVERLAY: Record<Overlayed, string> = {
  shop: 'shopModal',
  kitchen: 'kitchenOverlay',
  book: 'notebookModal',
  venue: 'venueLadder',
};
// No Stage tab: the play screen is the persistent base. `current === 'stage'`
// is the "nothing open" sentinel — no tab is lit in that state.
const TAB: Record<Overlayed, string> = {
  shop: 'shopBtn',
  kitchen: 'kitchenModeToggle',
  book: 'notebookBtn',
  venue: 'venueBtn',
};
/** Static (markup) close buttons per overlay. Venue's is re-rendered, handled by delegation. */
const CLOSE_BTN: Partial<Record<Overlayed, string>> = {
  shop: 'shopCloseBtn',
  kitchen: 'kitchenCloseBtn',
  book: 'notebookCloseBtn',
};

interface SurfaceHooks {
  /** Render the overlay's content; run just before it is shown. */
  render?: () => void;
  /** When present and false, the tab is locked and won't open. */
  gate?: () => boolean;
  /** Called when a tap is refused by the gate (e.g. show an unlock hint). */
  onBlocked?: () => void;
}

const hooks: Partial<Record<Overlayed, SurfaceHooks>> = {};
export function registerSurface(s: Overlayed, h: SurfaceHooks): void {
  hooks[s] = h;
}

let current: Surface = 'stage';
export function currentSurface(): Surface {
  return current;
}

function setHidden(id: string, isHidden: boolean): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (isHidden) el.setAttribute('hidden', '');
  else el.removeAttribute('hidden');
}

function hideAllOverlays(): void {
  for (const id of Object.values(OVERLAY)) setHidden(id, true);
}

export function openSurface(s: Surface): void {
  if (s === 'stage') {
    closeSurface();
    return;
  }
  if (hooks[s]?.gate && !hooks[s]!.gate!()) {
    hooks[s]?.onBlocked?.(); // locked — surface its unlock hint instead of a silent no-op
    return;
  }
  hideAllOverlays();
  hooks[s]?.render?.();
  setHidden(OVERLAY[s], false);
  current = s;
  syncActiveTab();
}

export function closeSurface(): void {
  hideAllOverlays();
  current = 'stage';
  syncActiveTab();
}

/** Tab tap: open the surface, or close it if it's already the open one (toggle). */
export function activateSurface(s: Surface): void {
  if (s !== 'stage' && current === s) {
    closeSurface();
    return;
  }
  openSurface(s);
}

/** Reflect `current` onto the dock: exactly one tab lit (.on + aria-current). */
export function syncActiveTab(): void {
  for (const s of Object.keys(TAB) as Overlayed[]) {
    const btn = document.getElementById(TAB[s]);
    if (!btn) continue;
    const active = s === current;
    btn.classList.toggle('on', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
}

/** The kitchen tab's orange `.hot` tint while a treatment is equipped (04 §2). */
export function renderDock(): void {
  const kitchen = document.getElementById(TAB.kitchen);
  if (kitchen) kitchen.classList.toggle('hot', loadEquippedTreatment() !== null);
}

export function wireDock(): void {
  renderDock();
  window.addEventListener('fart:treatment-changed', renderDock);

  for (const s of Object.keys(OVERLAY) as Overlayed[]) {
    document.getElementById(TAB[s])?.addEventListener('click', () => activateSurface(s));
    // Backdrop (click on the overlay container itself) closes.
    const ov = document.getElementById(OVERLAY[s]);
    ov?.addEventListener('click', (ev) => {
      if (ev.target === ov) closeSurface();
    });
    // Static close button.
    const closeId = CLOSE_BTN[s];
    if (closeId) document.getElementById(closeId)?.addEventListener('click', () => closeSurface());
  }

  // Venue's ✕ and "Play ▶" CTA are re-rendered on every open → delegate on the
  // static container so a single listener survives re-renders.
  const venue = document.getElementById(OVERLAY.venue);
  venue?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('#venueLadderCloseBtn, #venuePlayBtn')) closeSurface();
  });

  syncActiveTab();
}

// Test/debug — reset the module nav state + registry.
export function _resetNav(): void {
  current = 'stage';
  for (const k of Object.keys(hooks) as Overlayed[]) delete hooks[k];
}
