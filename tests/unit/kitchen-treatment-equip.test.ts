import { describe, it, expect, beforeEach } from 'vitest';
import { renderTreatmentList } from '../../src/ui/kitchen';
import { wireDock } from '../../src/ui/dock';
import { loadEquippedTreatment } from '../../src/state/persistence';

/**
 * PLAN v9 Phase 6 — single-equip Kitchen. The overlay shows a `.kit-list` of
 * `.kit-treat` rows: a 🚫 None row plus one per applicable treatment. Tapping a
 * row equips exactly that treatment (single-select), persists it, and dispatches
 * `fart:treatment-changed` so the dock Kitchen tab lights `.hot`.
 */

function rows(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('#treatmentList .kit-treat')];
}
function rowFor(treatment: string): HTMLButtonElement {
  const el = rows().find((b) => b.dataset.treatment === treatment);
  if (!el) throw new Error(`no kit-treat row for ${treatment}`);
  return el;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = `
    <button id="kitchenModeToggle"></button>
    <div id="treatmentList"></div>
  `;
});

describe('Kitchen single-equip treatment list (P6)', () => {
  it('renders a None row plus one row per applicable treatment (raw/blend excluded)', () => {
    renderTreatmentList();
    // None + roast + ferment + chill = 4. raw (identity) and blend (merge) excluded.
    expect(rows().length).toBe(4);
    expect(rowFor('none')).toBeTruthy();
    expect(rowFor('roast')).toBeTruthy();
    expect(rowFor('ferment')).toBeTruthy();
    expect(rowFor('chill')).toBeTruthy();
  });

  it('with nothing equipped, only the None row is marked .on', () => {
    renderTreatmentList();
    const on = document.querySelectorAll('#treatmentList .kit-treat.on');
    expect(on.length).toBe(1);
    expect((on[0] as HTMLElement).dataset.treatment).toBe('none');
    expect(loadEquippedTreatment()).toBeNull();
  });

  it('clicking a treatment row equips + persists it and marks exactly that row .on', () => {
    renderTreatmentList();
    rowFor('roast').click();
    expect(loadEquippedTreatment()).toBe('roast');
    const on = document.querySelectorAll('#treatmentList .kit-treat.on');
    expect(on.length).toBe(1);
    expect((on[0] as HTMLElement).dataset.treatment).toBe('roast');
  });

  it('clicking None clears the equipped treatment', () => {
    renderTreatmentList();
    rowFor('ferment').click();
    expect(loadEquippedTreatment()).toBe('ferment');
    rowFor('none').click();
    expect(loadEquippedTreatment()).toBeNull();
    expect(rowFor('none').classList.contains('on')).toBe(true);
  });

  it('equipping fires fart:treatment-changed so the dock Kitchen tab turns .hot (was dead)', () => {
    wireDock(); // initial render + listener
    renderTreatmentList();
    const tab = document.getElementById('kitchenModeToggle')!;
    expect(tab.classList.contains('hot')).toBe(false);
    rowFor('chill').click();
    expect(tab.classList.contains('hot')).toBe(true);
    rowFor('none').click();
    expect(tab.classList.contains('hot')).toBe(false);
  });
});
