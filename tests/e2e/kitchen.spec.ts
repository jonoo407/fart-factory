import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

/**
 * Kitchen — merged spec (former kitchen.spec + kitchen-mode-toggle lock
 * gating + kitchen-launch treatment-survives-launch).
 */

async function equip(page: import('@playwright/test').Page, treatment: string) {
  await page.click('#kitchenModeToggle');
  await page.click(`.kit-treat[data-treatment="${treatment}"]`);
  await page.click('#kitchenCloseBtn');
}

// ---- Lock gating (no unlock flag) ----

test('Kitchen dock tab is locked by default (no unlock flag)', async ({ page }) => {
  await loadStory(page, { kitchen: false });
  const tab = page.locator('#kitchenModeToggle');
  await expect(tab).toBeVisible();
  await expect(tab).toHaveClass(/locked/);
  await expect(tab).toHaveAttribute('aria-disabled', 'true');
});

test('Clicking the locked Kitchen tab does NOT open the overlay', async ({ page }) => {
  await loadStory(page, { kitchen: false });
  // The locked tab is aria-disabled, so a normal click is blocked by Playwright's
  // actionability check; force the click to prove the handler still no-ops.
  await page.click('#kitchenModeToggle', { force: true });
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
});

// ---- Unlocked behavior ----

test('Kitchen tab is present in the dock and unlocked once kitchen mode is on', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  const tab = page.locator('#kitchenModeToggle');
  await expect(tab).toBeVisible();
  await expect(tab).not.toHaveClass(/locked/);
  await expect(tab).toHaveAttribute('aria-disabled', 'false');
});

test('Kitchen button opens the kitchen overlay', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  await page.click('#kitchenModeToggle');
  await expect(page.locator('#kitchenOverlay')).toBeVisible();
});

test('Kitchen shows a None row + one row per treatment, and a 3-slot ferment rack', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  await page.click('#kitchenModeToggle');
  // None + roast + ferment + chill = 4 treatment rows.
  await expect(page.locator('#treatmentList .kit-treat')).toHaveCount(4);
  await expect(page.locator('.kit-treat[data-treatment="none"]')).toBeVisible();
  await expect(page.locator('.kit-treat[data-treatment="roast"]')).toBeVisible();
  await expect(page.locator('.ferment-slot')).toHaveCount(3);
});

test('Equipping a treatment marks that row .on and lights the dock Kitchen tab', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  await page.click('#kitchenModeToggle');
  // Nothing equipped → None is active, dock not hot.
  await expect(page.locator('.kit-treat[data-treatment="none"]')).toHaveClass(/on/);
  await expect(page.locator('#kitchenModeToggle')).not.toHaveClass(/hot/);
  // Equip roast.
  await page.click('.kit-treat[data-treatment="roast"]');
  await expect(page.locator('.kit-treat[data-treatment="roast"]')).toHaveClass(/on/);
  await expect(page.locator('.kit-treat[data-treatment="none"]')).not.toHaveClass(/on/);
  await expect(page.locator('#kitchenModeToggle')).toHaveClass(/hot/);
  // It persists.
  const stored = await page.evaluate(() => localStorage.getItem('fart_treatment'));
  expect(stored).toBe('"roast"');
});

test('The equipped treatment SURVIVES a launch (persists — not consumed per-shot)', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  await equip(page, 'roast');
  await page.locator('[data-food="beans"]').first().click();
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  // Unlike the old prep model, the equipped treatment is NOT cleared by a launch.
  const after = await page.evaluate(() => localStorage.getItem('fart_treatment'));
  expect(after).toBe('"roast"');
  // And the dock stays lit.
  await expect(page.locator('#kitchenModeToggle')).toHaveClass(/hot/);
});

test('Selecting None clears the equipped treatment and the dock light', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  await page.click('#kitchenModeToggle');
  await page.click('.kit-treat[data-treatment="chill"]');
  await expect(page.locator('#kitchenModeToggle')).toHaveClass(/hot/);
  await page.click('.kit-treat[data-treatment="none"]');
  await expect(page.locator('#kitchenModeToggle')).not.toHaveClass(/hot/);
  const stored = await page.evaluate(() => localStorage.getItem('fart_treatment'));
  expect(stored).toBe('null');
});

test('Kitchen close button hides the overlay', async ({ page }) => {
  await loadStory(page, { kitchen: true });
  await page.click('#kitchenModeToggle');
  await page.click('#kitchenCloseBtn');
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
});

// NB: the deterministic proof that an equipped treatment changes the resolved
// launch props (roast↑stink, chill↑loud, etc.) lives in the unit suite
// (tests/unit/equipped-launch.test.ts), where the audience + rounding are fixed.
// An end-to-end %-comparison here is flaky (daily-audience/rounding dependent),
// so we assert the robust behaviours above instead.
