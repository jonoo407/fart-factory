import { test, expect } from '@playwright/test';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.removeItem('fart_mode');
  });
  await page.reload();
}

test('mode defaults to story (Phase M flip — food game is the headline)', async ({ page }) => {
  await loadApp(page);
  await expect(page.locator('#modeBtn')).toBeVisible();
  await expect(page.locator('#storyShell')).toBeVisible();
  await expect(page.locator('.lab')).toBeHidden();
  await expect(page.locator('.challenge')).toBeHidden();
});

test('clicking mode button toggles to sandbox + hides Story shell', async ({ page }) => {
  await loadApp(page);
  await page.click('#modeBtn');
  await expect(page.locator('#storyShell')).toBeHidden();
  await expect(page.locator('.lab')).toBeVisible();
  await expect(page.locator('.challenge')).toBeVisible();
  await expect(page.locator('#modeBtn')).toHaveText(/Story/);
});

test('mode persists across reload', async ({ page }) => {
  await loadApp(page);
  await page.click('#modeBtn'); // -> sandbox
  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  await expect(page.locator('.lab')).toBeVisible();
  await expect(page.locator('#storyShell')).toBeHidden();
});

test('toggling back to story reveals food-game chrome again', async ({ page }) => {
  await loadApp(page);
  await page.click('#modeBtn'); // -> sandbox
  await expect(page.locator('#storyShell')).toBeHidden();
  await page.click('#modeBtn'); // -> story
  await expect(page.locator('#storyShell')).toBeVisible();
  await expect(page.locator('.lab')).toBeHidden();
});
