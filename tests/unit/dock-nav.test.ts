import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  openSurface,
  closeSurface,
  activateSurface,
  currentSurface,
  syncActiveTab,
  registerSurface,
  _resetNav,
} from '../../src/ui/dock';

/**
 * The dock is bottom-tab navigation: Stage is home; Shop/Kitchen/Book/Venue are
 * overlays that open OVER the Stage and close back to it. One consistent law for
 * all four: tap → open (one at a time); tap-again / Stage / ✕ / backdrop → close;
 * the lit tab always reflects what's open.
 */

function buildDom(): void {
  document.body.innerHTML = `
    <nav id="dock">
      <button id="stageBtn" class="dock-item on" aria-current="page"></button>
      <button id="shopBtn" class="dock-item"></button>
      <button id="kitchenModeToggle" class="dock-item"></button>
      <button id="notebookBtn" class="dock-item"></button>
      <button id="venueBtn" class="dock-item"></button>
    </nav>
    <div id="shopModal" hidden></div>
    <div id="kitchenOverlay" hidden></div>
    <div id="notebookModal" hidden></div>
    <div id="venueLadder" hidden></div>
  `;
}
const hidden = (id: string): boolean => document.getElementById(id)!.hasAttribute('hidden');
const lit = (id: string): boolean => document.getElementById(id)!.classList.contains('on');

beforeEach(() => {
  _resetNav();
  buildDom();
  // Re-register the four surfaces with no-op renderers (gate kitchen below per-test).
  registerSurface('shop', { render: () => {} });
  registerSurface('kitchen', { render: () => {} });
  registerSurface('book', { render: () => {} });
  registerSurface('venue', { render: () => {} });
});

describe('dock nav — consistent overlay model', () => {
  it('starts on Stage: Stage lit, every overlay hidden', () => {
    syncActiveTab();
    expect(currentSurface()).toBe('stage');
    expect(lit('stageBtn')).toBe(true);
    for (const id of ['shopModal', 'kitchenOverlay', 'notebookModal', 'venueLadder']) {
      expect(hidden(id)).toBe(true);
    }
  });

  it('opening a surface shows ONLY it, lights its tab, and runs its render hook', () => {
    const render = vi.fn();
    registerSurface('shop', { render });
    openSurface('shop');
    expect(render).toHaveBeenCalledOnce();
    expect(hidden('shopModal')).toBe(false);
    expect(hidden('kitchenOverlay')).toBe(true);
    expect(currentSurface()).toBe('shop');
    expect(lit('shopBtn')).toBe(true);
    expect(lit('stageBtn')).toBe(false);
    expect(document.getElementById('shopBtn')!.getAttribute('aria-current')).toBe('page');
    expect(document.getElementById('stageBtn')!.hasAttribute('aria-current')).toBe(false);
  });

  it('opening a second surface closes the first (one open at a time)', () => {
    openSurface('shop');
    openSurface('book');
    expect(hidden('shopModal')).toBe(true);
    expect(hidden('notebookModal')).toBe(false);
    expect(lit('shopBtn')).toBe(false);
    expect(lit('notebookBtn')).toBe(true);
    expect(currentSurface()).toBe('book');
  });

  it('Stage / closeSurface dismisses any open overlay and re-lights Stage', () => {
    openSurface('venue');
    closeSurface();
    expect(currentSurface()).toBe('stage');
    expect(hidden('venueLadder')).toBe(true);
    expect(lit('stageBtn')).toBe(true);
    expect(lit('venueBtn')).toBe(false);
  });

  it('activate toggles: tapping the open tab again closes it', () => {
    activateSurface('shop');
    expect(currentSurface()).toBe('shop');
    activateSurface('shop');
    expect(currentSurface()).toBe('stage');
    expect(hidden('shopModal')).toBe(true);
    expect(lit('stageBtn')).toBe(true);
  });

  it('a gated (locked) surface refuses to open', () => {
    registerSurface('kitchen', { render: () => {}, gate: () => false });
    openSurface('kitchen');
    expect(currentSurface()).toBe('stage');
    expect(hidden('kitchenOverlay')).toBe(true);
    // unlocks once the gate passes
    registerSurface('kitchen', { render: () => {}, gate: () => true });
    openSurface('kitchen');
    expect(currentSurface()).toBe('kitchen');
    expect(hidden('kitchenOverlay')).toBe(false);
  });
});
