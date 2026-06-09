import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';
import { CHARGE_ZONES } from '../../src/scoring/tuning';

/**
 * Hold-to-charge BLAST (PLAN v9 P2) — every other spec TAPS the launch
 * button (a sub-200ms tap short-circuits to a neutral ×1.0 with no breakdown
 * line), so the charge mechanic itself had zero e2e coverage.
 *
 * Determinism strategy: the meter sweeps 0→100→0 at ~2.2 units/frame
 * (charge-meter.ts), so a FIXED hold duration lands in different zones at
 * different frame rates — that would flake. Instead we hold the button and
 * poll the REAL meter readout (#chargeFill inline width, painted every
 * frame) until the sweep is inside the good/sweet window, then release.
 *
 * TOLERANCE: between the poll resolving and pointerup reaching the page the
 * sweep advances a frame or two, so we release inside a window comfortably
 * within the GOOD zone (62–98) and assert that SOME charge-quality label
 * (Perfect/Good/Weak — plate.ts chargeBreakdownLine) rendered, rather than
 * pinning the exact zone. A neutral tap/ok release renders NO line, so the
 * assertion still proves a real charged release happened.
 */

test('hold-to-charge: releasing in the sweep zone applies a charge multiplier to the result', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();

  const btn = page.locator('#storyLaunchBtn');
  // hover() auto-scrolls the button into view — on the 375×667 mobile
  // viewport it sits below the fold, and raw mouse coords from boundingBox()
  // would land outside the viewport (mouse.down would hit nothing).
  await btn.hover();
  await page.mouse.down();

  // The meter wakes and the label flips while charging.
  await expect(page.locator('#chargeMeter')).toHaveClass(/active/);
  await expect(page.locator('#launchBig')).toHaveText(/CHARGING/);

  // Poll the live meter until the sweep is inside [goodLo+4, sweetHi-2]
  // (≈66–90 with the current tuning) — release lands in good/sweet even
  // after a frame or two of latency. The sweep oscillates, so if the first
  // ascent is missed the window comes around again.
  await page.waitForFunction(
    ([lo, hi]) => {
      const fill = document.getElementById('chargeFill');
      const w = parseFloat(fill?.style.width || '0');
      return w >= lo && w <= hi;
    },
    [CHARGE_ZONES.goodLo + 4, CHARGE_ZONES.sweetHi - 2] as [number, number],
    { polling: 'raf', timeout: 10_000 },
  );
  await page.mouse.up();

  // The launch resolved into the reaction takeover…
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  // …and the score breakdown carries a charge line. Tolerant on WHICH label
  // (see header comment) but a label MUST be present.
  await expect(
    page.locator('#reactionOverlay .bd-line', { hasText: /(Perfect|Good|Weak) charge/ }),
  ).toHaveCount(1);
  // The multiplier is rendered alongside the label (×N.NN format).
  await expect(
    page.locator('#reactionOverlay .bd-line', { hasText: /charge/ }),
  ).toContainText(/×\d\.\d\d/);
});

test('quick tap stays neutral: no charge line in the breakdown', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  // A Playwright click is a sub-tapMs press → safe ×1.0 tap by design.
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await expect(
    page.locator('#reactionOverlay .bd-line', { hasText: /charge/ }),
  ).toHaveCount(0);
  // The base-match line still renders (the breakdown itself exists).
  await expect(
    page.locator('#reactionOverlay .bd-line', { hasText: /Base match/ }),
  ).toHaveCount(1);
});
