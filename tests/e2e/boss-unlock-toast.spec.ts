import { test, expect } from '@playwright/test';

test('Boss-unlock toast fires once when a boss first becomes unlocked', async ({ page }) => {
  // Setup: 9 recipes discovered (Boss 1 needs 10). After 1 more discovery
  // via a launch, the toast should appear.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    const recipes = Array.from({ length: 9 }, (_, i) => `recipe-stub-${i}`);
    localStorage.setItem('fart_recipes_seen', JSON.stringify(recipes));
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
  // Plate beans + cheese (Swamp Beast) — discovers a real recipe, pushing
  // count to 10 → Boss 1 unlocked.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#bossUnlockToast')).toBeVisible({ timeout: 1000 });
  await expect(page.locator('#bossUnlockToast')).toContainText(/Granny|Family Reunion/);
});

test('Boss-unlock toast does NOT re-fire on subsequent launches', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    const recipes = Array.from({ length: 10 }, (_, i) => `recipe-stub-${i}`);
    localStorage.setItem('fart_recipes_seen', JSON.stringify(recipes));
    // Pre-seed the toast-seen flag so the first launch doesn't re-fire it.
    localStorage.setItem('fart_boss_toast_granny-family-reunion', 'true');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  // No toast should appear.
  await page.waitForTimeout(500);
  await expect(page.locator('#bossUnlockToast')).toBeHidden();
});
