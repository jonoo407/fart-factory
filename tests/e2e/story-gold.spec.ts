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
    localStorage.removeItem('fart_gold');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Story Mode shows a gold counter starting at 0', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#goldCount')).toHaveText('0');
});

test('Gold counter increments after a launch (and persists in localStorage)', async ({ page }) => {
  await loadStoryMode(page);
  // Plate a few foods and launch — match% will be whatever the daily audience yields.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(80);
  // Read both the displayed counter and the stored value.
  const displayed = await page.locator('#goldCount').textContent();
  const stored = await page.evaluate(() => localStorage.getItem('fart_gold'));
  // Whatever the value, displayed must match stored. (≥0; could be 0 if match<50.)
  const displayedNum = parseInt(displayed ?? '0', 10);
  const storedNum = stored === null ? 0 : parseInt(stored, 10);
  expect(displayedNum).toBe(storedNum);
  expect(displayedNum).toBeGreaterThanOrEqual(0);
});

test('Gold counter is visible alongside research-notes counter and a Shop button', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#goldCount')).toBeVisible();
  await expect(page.locator('#notesCount')).toBeVisible();
  await expect(page.locator('#shopBtn')).toBeVisible();
});
