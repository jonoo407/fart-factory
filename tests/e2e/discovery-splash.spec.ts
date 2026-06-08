import { test, expect } from '@playwright/test';
import { dismissReaction } from './_helpers';

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_recipes_seen');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Launching a new-recipe combo shows the discovery splash (P6)', async ({ page }) => {
  await loadStory(page);
  // Swamp Beast = beans + cheese — a starter recipe.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  // Splash banner appears center-screen.
  await expect(page.locator('#discoverySplash')).toBeVisible({ timeout: 1000 });
  await expect(page.locator('#discoverySplash')).toContainText(/Swamp Beast/);
});

test('Discovery splash auto-dismisses after timeout', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#discoverySplash')).toBeVisible();
  // 3.2s timeout (allow some buffer).
  await expect(page.locator('#discoverySplash')).toBeHidden({ timeout: 4000 });
});

test('Re-launching a known recipe does NOT show the splash (only first discovery)', async ({ page }) => {
  await loadStory(page);
  // First launch discovers Swamp Beast.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#discoverySplash')).toBeVisible();
  // Wait for it to dismiss.
  await expect(page.locator('#discoverySplash')).toBeHidden({ timeout: 4000 });
  // Close the reaction takeover so the pantry is reachable again.
  await dismissReaction(page);
  // Second launch should NOT trigger a new splash.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(300);
  await expect(page.locator('#discoverySplash')).toBeHidden();
});
