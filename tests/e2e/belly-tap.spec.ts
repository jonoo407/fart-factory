import { test, expect, type Page } from '@playwright/test';
import { loadStory as loadStoryBase } from './_helpers';

async function loadStory(page: Page): Promise<void> {
  await loadStoryBase(page);
  await page.waitForSelector('.belly-track');
}

test('belly track click does not change belly value (easter egg, no belly cost)', async ({ page }) => {
  await loadStory(page);
  const track = page.locator('.belly-track');
  const bellyBefore = await page.locator('#bellyValue').textContent();
  await track.click();
  await expect(page.locator('#bellyValue')).toHaveText(bellyBefore ?? '');
});

test('10 belly taps trigger the easter-egg toast', async ({ page }) => {
  await loadStory(page);
  // Seed counter to 9 so the very next tap is the 10th.
  await page.evaluate(() => localStorage.setItem('fart_belly_taps', '9'));
  const track = page.locator('.belly-track');
  await track.click();
  await expect(page.locator('.discovery-splash-card')).toBeVisible({ timeout: 500 });
  await expect(page.locator('.discovery-splash-banner')).toContainText(/belly pokes/i);
});
