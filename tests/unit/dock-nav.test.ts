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
 * The dock is bottom-tab navigation with NO Stage tab: the play screen is the
 * persistent base, and Shop/Kitchen/Book/Venue are overlays over it. Home =
 * "no overlay open" = no tab lit. One law for all four: tap → open (one at a
 * time); tap-again / ✕ / backdrop → close → home; the lit tab reflects what's
 * open. A locked surface refuses to open and fires its onBlocked hook (the
 * Kitchen uses this to show its unlock hint).
 */

function buildDom(): void {
  document.body.innerHTML = `
    <nav id="dock">
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
const TABS = ['shopBtn', 'kitchenModeToggle', 'notebookBtn', 'venueBtn'];
const litCount = (): number => TABS.filter(lit).length;

beforeEach(() => {
  _resetNav();
  buildDom();
  registerSurface('shop', { render: () => {} });
  registerSurface('kitchen', { render: () => {} });
  registerSurface('book', { render: () => {} });
  registerSurface('venue', { render: () => {} });
});

describe('dock nav — 4-tab overlay model (no Stage tab)', () => {
  it('starts home: no overlay open and no tab lit', () => {
    syncActiveTab();
    expect(currentSurface()).toBe('stage');
    expect(litCount()).toBe(0);
    for (const id of ['shopModal', 'kitchenOverlay', 'notebookModal', 'venueLadder']) {
      expect(hidden(id)).toBe(true);
    }
  });

  it('opening a surface shows ONLY it, lights ONLY its tab, runs its render hook', () => {
    const render = vi.fn();
    registerSurface('shop', { render });
    openSurface('shop');
    expect(render).toHaveBeenCalledOnce();
    expect(hidden('shopModal')).toBe(false);
    expect(hidden('kitchenOverlay')).toBe(true);
    expect(currentSurface()).toBe('shop');
    expect(litCount()).toBe(1);
    expect(lit('shopBtn')).toBe(true);
    expect(document.getElementById('shopBtn')!.getAttribute('aria-current')).toBe('page');
  });

  it('opening a second surface closes the first (one open at a time)', () => {
    openSurface('shop');
    openSurface('book');
    expect(hidden('shopModal')).toBe(true);
    expect(hidden('notebookModal')).toBe(false);
    expect(litCount()).toBe(1);
    expect(lit('notebookBtn')).toBe(true);
    expect(currentSurface()).toBe('book');
  });

  it('closeSurface dismisses any open overlay → home (no tab lit)', () => {
    openSurface('venue');
    closeSurface();
    expect(currentSurface()).toBe('stage');
    expect(hidden('venueLadder')).toBe(true);
    expect(litCount()).toBe(0);
  });

  it('activate toggles: tapping the open tab again closes it → home', () => {
    activateSurface('shop');
    expect(currentSurface()).toBe('shop');
    activateSurface('shop');
    expect(currentSurface()).toBe('stage');
    expect(hidden('shopModal')).toBe(true);
    expect(litCount()).toBe(0);
  });

  it('a gated (locked) surface refuses to open AND fires onBlocked', () => {
    const onBlocked = vi.fn();
    registerSurface('kitchen', { render: () => {}, gate: () => false, onBlocked });
    openSurface('kitchen');
    expect(onBlocked).toHaveBeenCalledOnce();
    expect(currentSurface()).toBe('stage');
    expect(hidden('kitchenOverlay')).toBe(true);
    // unlocks once the gate passes (no onBlocked)
    const onBlocked2 = vi.fn();
    registerSurface('kitchen', { render: () => {}, gate: () => true, onBlocked: onBlocked2 });
    openSurface('kitchen');
    expect(onBlocked2).not.toHaveBeenCalled();
    expect(currentSurface()).toBe('kitchen');
    expect(hidden('kitchenOverlay')).toBe(false);
  });
});
