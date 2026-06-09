import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showHiddenComboSplash, showLootDropSplash } from '../../src/ui/splashes';

// Bug: every splash on the shared #discoverySplash node scheduled its own
// un-cancelled hide timer. A second splash shown while the first's timer is
// still pending got dismissed early when that stale timer fired.
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="discoverySplash" hidden></div>';
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('shared splash node cancels a stale hide timer', () => {
  it('a newer splash is not dismissed by the older splash’s pending timer', () => {
    const splash = document.getElementById('discoverySplash')!;
    showHiddenComboSplash({ name: 'Combo', emoji: '🎁', flavor: 'x', bonusGold: 1, bonusNotes: 1 }); // hide @ +3500
    vi.advanceTimersByTime(2000);
    showLootDropSplash({ id: 'beans', name: 'Beans', emoji: '🫘', rarity: 'common' }); // hide @ +3200 from now
    // Advance PAST the first splash's original 3500 deadline (now t=3500).
    vi.advanceTimersByTime(1500);
    // The loot splash (shown at 2000) must still be visible — its real deadline is 5200.
    expect(splash.hasAttribute('hidden')).toBe(false);
    expect(splash.textContent).toContain('Beans');
    // And it does hide at its OWN deadline.
    vi.advanceTimersByTime(2000); // t=5500 > 5200
    expect(splash.hasAttribute('hidden')).toBe(true);
  });
});
