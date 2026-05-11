import { test, expect } from '@playwright/test';

async function loadFresh(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_kitchen_mode');
    localStorage.removeItem('fart_pantry');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Kitchen button is hidden by default (simple mode)', async ({ page }) => {
  await loadFresh(page);
  await expect(page.locator('#kitchenBtn')).toBeHidden();
});

test('Kitchen-mode toggle is visible and OFF by default', async ({ page }) => {
  await loadFresh(page);
  await expect(page.locator('#kitchenModeToggle')).toBeVisible();
  await expect(page.locator('#kitchenModeToggle')).toHaveAttribute('aria-pressed', 'false');
});

test('Toggling Kitchen Mode ON reveals the Kitchen button + persists', async ({ page }) => {
  await loadFresh(page);
  await page.click('#kitchenModeToggle');
  await expect(page.locator('#kitchenModeToggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#kitchenBtn')).toBeVisible();
  // Verify persistence.
  const stored = await page.evaluate(() => localStorage.getItem('fart_kitchen_mode'));
  expect(stored).toBe('true');
});

test('Toggling Kitchen Mode OFF hides the button + clicking pantry routes to plate (simple mode)', async ({ page }) => {
  await loadFresh(page);
  await page.click('#kitchenModeToggle'); // ON
  await page.click('#kitchenModeToggle'); // OFF
  await expect(page.locator('#kitchenBtn')).toBeHidden();
  // Pantry click should plate directly (simple mode behavior).
  await page.locator('[data-food="beans"]').click();
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
});
