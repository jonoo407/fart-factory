import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_pantry');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Story Mode shows audience portrait with name + flavor + cravings', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#audienceName')).not.toHaveText('—');
  await expect(page.locator('#audienceFlavor')).not.toHaveText('—');
  const portrait = await page.locator('#audiencePortraitEmoji').textContent();
  expect((portrait ?? '').length).toBeGreaterThan(0);
});

test('Story Mode shows current location summary', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#areaCurrentName')).toBeVisible();
});

test('Launch shows match % + audience name in result panel', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#storyResult')).toBeVisible();
  // The title should contain a percentage like "42%".
  await expect(page.locator('#storyResultTitle')).toContainText(/\d+%/);
});
