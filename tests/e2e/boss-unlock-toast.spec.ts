import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('Boss-unlock toast fires once when a boss first becomes unlocked', async ({ page }) => {
  // Setup: 9 recipes discovered (Boss 1 needs 10). After 1 more discovery
  // via a launch, the toast should appear.
  await loadStory(page, {
    recipes: Array.from({ length: 9 }, (_, i) => `recipe-stub-${i}`),
  });
  // Plate beans + cheese (Swamp Beast) — discovers a real recipe, pushing
  // count to 10 → Boss 1 unlocked.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#bossUnlockToast')).toBeVisible({ timeout: 1000 });
  await expect(page.locator('#bossUnlockToast')).toContainText(/Granny|Family Reunion/);
});

test('Boss-unlock toast does NOT re-fire on subsequent launches', async ({ page }) => {
  await loadStory(page, {
    recipes: Array.from({ length: 10 }, (_, i) => `recipe-stub-${i}`),
    // Pre-seed the toast-seen flag so the first launch doesn't re-fire it.
    extraKeys: { 'fart_boss_toast_granny-family-reunion': 'true' },
  });
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  // Wait for the launch to settle (the reaction takeover is the launch's
  // terminal UI state — the toast decision has been made by then), instead
  // of a blind sleep before the negative assertion.
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await expect(page.locator('#bossUnlockToast')).toBeHidden();
});
