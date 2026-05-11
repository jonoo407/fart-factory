import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
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

test('Story Launch button fires; empty plate produces "whisper" message', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#storyLaunchBtn')).toBeVisible();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#storyResult')).toBeVisible();
  await expect(page.locator('#storyResultTitle')).toHaveText(/whisper|Empty/i);
});

test('Story Launch with Beans + Cheese triggers Swamp synergy message', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#storyResult')).toBeVisible();
  await expect(page.locator('#storyResultEffects')).toContainText(/Swamp/i);
});

test('Story Launch clears the plate and deducts belly persistently', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();   // -2
  await page.locator('[data-food="cheese"]').click();  // -2
  await page.locator('[data-food="onion"]').click();   // -2 → 24 remaining (30-6)
  await expect(page.locator('#bellyValue')).toHaveText('24');
  await page.click('#storyLaunchBtn');
  // Plate cleared, belly persisted at 24
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toHaveCount(0);
  await expect(page.locator('#bellyValue')).toHaveText('24');
  // Reload — belly stays at 24 since we already committed (encounter-anchored).
  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  await expect(page.locator('#bellyValue')).toHaveText('24');
});

test('AudioContext exists after Story Launch (no crash)', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(50);
  const state = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(['running', 'suspended']).toContain(state);
});
