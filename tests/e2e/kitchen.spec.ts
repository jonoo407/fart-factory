import { test, expect } from '@playwright/test';

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    // Phase W item 99 — Kitchen Mode is opt-in. Enable it for these tests.
    localStorage.setItem('fart_kitchen_mode', 'true');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_ferment_rack');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Kitchen button is visible in the progression strip', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('#kitchenBtn')).toBeVisible();
});

test('Kitchen button opens the kitchen overlay', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await expect(page.locator('#kitchenOverlay')).toBeVisible();
});

test('Kitchen has 4 prep-table slots + 3 ferment-rack slots', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await expect(page.locator('.prep-slot')).toHaveCount(4);
  await expect(page.locator('.ferment-slot')).toHaveCount(3);
});

test('Kitchen close button hides the overlay', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.click('#kitchenCloseBtn');
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
});

test('Clicking a pantry food while Kitchen is open adds it to the first empty prep slot', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  // Click a pantry food (uses the same pantry grid).
  await page.locator('[data-food="beans"]').first().click();
  // First prep slot now contains beans.
  await expect(page.locator('#prepSlot1.prep-slot-filled')).toBeVisible();
});

test('Each prep slot has a treatment selector with 5 options', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').first().click();
  const select = page.locator('#prepSlot1 .prep-treatment-select');
  await expect(select).toBeVisible();
  const options = await select.locator('option').count();
  expect(options).toBe(5);
});

test('Send to Performance closes Kitchen and propagates prepped plate', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').first().click();
  await page.locator('#prepSlot1 .prep-treatment-select').selectOption('roast');
  await page.click('#kitchenSendBtn');
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
  // The main plate's slot 1 should be filled (the prepped plate flows
  // back to the launch plate).
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
});
