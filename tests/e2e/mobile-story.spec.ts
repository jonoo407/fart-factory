import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

/**
 * Mobile (375×667) verification of the Story Mode UI. Per PLAN_v5 P5.
 *
 * Runs on the mobile project only (project pinning in playwright.config.ts),
 * so no runtime viewport skip is needed. The 44×44 touch audit lives in
 * touch-targets.spec.ts (it audits a superset of selectors) — this spec keeps
 * the layout-overflow check.
 */

test('Top status bar fits without horizontal overflow on narrow viewports', async ({ page }) => {
  await loadStory(page);
  // PLAN v9 UI-overhaul Phase 1 — the .progression-strip was replaced by .top.
  const strip = page.locator('.top');
  await expect(strip).toBeVisible();
  // The bar must not overflow horizontally — its scrollWidth ≤ clientWidth + 2px tolerance.
  const overflow = await strip.evaluate((el) => {
    return Math.max(0, el.scrollWidth - el.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(2);
});
