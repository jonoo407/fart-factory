import { test, expect } from '@playwright/test';

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_recipes_seen');
    localStorage.removeItem('fart_bosses_defeated');
    localStorage.removeItem('fart_locations_unlocked');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
      if (k && k.startsWith('fart_best_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Travel button is visible in the progression strip', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('#travelBtn')).toBeVisible();
});

test('Travel button opens the map screen with 20 pins', async ({ page }) => {
  await loadStory(page);
  await page.click('#travelBtn');
  await expect(page.locator('#mapScreen')).toBeVisible();
  const pins = page.locator('.map-pin');
  expect(await pins.count()).toBe(20);
});

test('Hometown pins are unlocked; other regions show locked icons', async ({ page }) => {
  await loadStory(page);
  await page.click('#travelBtn');
  // Hometown locations.
  for (const id of ['outside', 'covers', 'library', 'restroom']) {
    const pin = page.locator(`.map-pin[data-location="${id}"]`);
    await expect(pin).not.toHaveAttribute('data-locked', 'true');
  }
  // City should be locked on a fresh save.
  const cityPin = page.locator('.map-pin[data-location="stadium"]');
  await expect(cityPin).toHaveAttribute('data-locked', 'true');
});

test('Clicking an unlocked pin selects that location and closes the map', async ({ page }) => {
  await loadStory(page);
  await page.click('#travelBtn');
  await page.locator('.map-pin[data-location="library"]').click();
  await expect(page.locator('#mapScreen')).toBeHidden();
  // The new selected location should match the pin clicked.
  // (We'll verify this via the persisted fart_area key.)
  const stored = await page.evaluate(() => localStorage.getItem('fart_area'));
  expect(stored).toBe('"library"');
});

test('Clicking a locked pin does NOT select it', async ({ page }) => {
  await loadStory(page);
  await page.click('#travelBtn');
  // Force-click a locked pin (data-locked="true").
  await page.locator('.map-pin[data-location="stadium"]').click({ force: true });
  // Map stays open OR closes, but the locked location should NOT have been
  // set as current.
  const stored = await page.evaluate(() => localStorage.getItem('fart_area'));
  expect(stored).not.toBe('"stadium"');
});

test('Hot-spot pin has the .map-pin-hot class', async ({ page }) => {
  await loadStory(page);
  await page.click('#travelBtn');
  // At least one hot-spot among unlocked pins.
  const hot = page.locator('.map-pin.map-pin-hot');
  expect(await hot.count()).toBeGreaterThanOrEqual(1);
});

test('Closing the map without selecting reverts to the previous location', async ({ page }) => {
  await loadStory(page);
  // Select outside first.
  await page.click('#travelBtn');
  await page.locator('.map-pin[data-location="outside"]').click();
  // Reopen and close without selecting.
  await page.click('#travelBtn');
  await page.click('#mapCloseBtn');
  await expect(page.locator('#mapScreen')).toBeHidden();
  const stored = await page.evaluate(() => localStorage.getItem('fart_area'));
  expect(stored).toBe('"outside"');
});

test('Region-themed body data-region attribute applies after location select', async ({ page }) => {
  await loadStory(page);
  // Force unlock a Royal location by writing the explicit-unlock list.
  await page.evaluate(() => {
    localStorage.setItem('fart_locations_unlocked', JSON.stringify(['throne']));
  });
  await page.reload();
  await page.click('#travelBtn');
  await page.locator('.map-pin[data-location="throne"]').click();
  // body[data-region='royal'] applied.
  const region = await page.evaluate(() => document.body.dataset.region);
  expect(region).toBe('royal');
});
