import { test, expect } from '@playwright/test';

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    // Kitchen is opt-in/unlocked. Enable it for these tests.
    localStorage.setItem('fart_kitchen_mode', 'true');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_ferment_rack');
    localStorage.removeItem('fart_treatment');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Kitchen tab is present in the dock and unlocked once kitchen mode is on', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('#kitchenModeToggle')).toBeVisible();
  await expect(page.locator('#kitchenModeToggle')).not.toHaveClass(/locked/);
});

test('Kitchen button opens the kitchen overlay', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenModeToggle');
  await expect(page.locator('#kitchenOverlay')).toBeVisible();
});

test('Kitchen shows a None row + one row per treatment, and a 3-slot ferment rack', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenModeToggle');
  // None + roast + ferment + chill = 4 treatment rows.
  await expect(page.locator('#treatmentList .kit-treat')).toHaveCount(4);
  await expect(page.locator('.kit-treat[data-treatment="none"]')).toBeVisible();
  await expect(page.locator('.kit-treat[data-treatment="roast"]')).toBeVisible();
  await expect(page.locator('.ferment-slot')).toHaveCount(3);
});

test('Equipping a treatment marks that row .on and lights the dock Kitchen tab', async ({ page }) => {
  await loadStory(page);
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

test('Selecting None clears the equipped treatment and the dock light', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenModeToggle');
  await page.click('.kit-treat[data-treatment="chill"]');
  await expect(page.locator('#kitchenModeToggle')).toHaveClass(/hot/);
  await page.click('.kit-treat[data-treatment="none"]');
  await expect(page.locator('#kitchenModeToggle')).not.toHaveClass(/hot/);
  const stored = await page.evaluate(() => localStorage.getItem('fart_treatment'));
  expect(stored).toBe('null');
});

test('Kitchen close button hides the overlay', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenModeToggle');
  await page.click('#kitchenCloseBtn');
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
});
