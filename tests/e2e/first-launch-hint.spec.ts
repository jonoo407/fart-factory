import { test, expect } from '@playwright/test';
import { dismissReaction } from './_helpers';

async function loadFresh(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_launch_count');
    localStorage.removeItem('fart_best_overall');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('First-launch hint banner is visible for a brand-new player (P7)', async ({ page }) => {
  await loadFresh(page);
  await expect(page.locator('#firstLaunchHint')).toBeVisible();
  await expect(page.locator('#firstLaunchHint')).toContainText(/Try these/i);
  // At least 2 recommendation chips.
  const chips = page.locator('.hint-chip');
  expect(await chips.count()).toBeGreaterThanOrEqual(2);
});

test('Hint disappears after 3 launches', async ({ page }) => {
  await loadFresh(page);
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-food="beans"]').click();
    await page.click('#storyLaunchBtn');
    await dismissReaction(page); // the reaction takeover covers the pantry — close it to re-plate
  }
  await expect(page.locator('#firstLaunchHint')).toBeHidden();
});

test('Hint disappears once player scores ≥60%', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    // Force best-match high-water mark to 75 (above threshold).
    localStorage.setItem('fart_best_overall', '75');
  });
  await page.reload();
  await expect(page.locator('#firstLaunchHint')).toBeHidden();
});
