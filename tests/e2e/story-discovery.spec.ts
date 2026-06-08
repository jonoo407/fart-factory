import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_hard_mode');
    localStorage.removeItem('fart_last_match');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_recipes_seen');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Launching a known-recipe combo shows the "NEW RECIPE" discovery toast', async ({ page }) => {
  await loadStoryMode(page);
  // Swamp Beast = beans + cheese.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('.story-result-discovery-new')).toBeVisible();
  await expect(page.locator('.story-result-discovery-new')).toContainText('Swamp Beast');
});

test('Re-launching a known recipe shows muted "Recipe:" line, not NEW', async ({ page }) => {
  await loadStoryMode(page);
  // First launch — discover.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(50);
  // Second launch — should NOT show NEW.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  // The NEW class should not appear; the normal recipe line should.
  await expect(page.locator('.story-result-discovery-new')).toHaveCount(0);
  await expect(page.locator('.story-result-discovery')).toContainText('Swamp Beast');
});

test('Discovered recipes persist in localStorage', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  const seen = await page.evaluate(() => localStorage.getItem('fart_recipes_seen'));
  expect(seen).toBeTruthy();
  expect(seen).toContain('swamp-beast');
});
