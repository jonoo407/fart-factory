import { test, expect } from '@playwright/test';
import { loadStory, dismissReaction, waitLaunchCooldown } from './_helpers';

test('First-launch hint banner is visible for a brand-new player (P7)', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('#firstLaunchHint')).toBeVisible();
  await expect(page.locator('#firstLaunchHint')).toContainText(/Try these/i);
  // At least 2 recommendation chips.
  const chips = page.locator('.hint-chip');
  expect(await chips.count()).toBeGreaterThanOrEqual(2);
});

test('Hint disappears after 3 launches', async ({ page }) => {
  await loadStory(page);
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-food="beans"]').click();
    await page.click('#storyLaunchBtn');
    await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
    await dismissReaction(page); // the reaction takeover covers the pantry — close it to re-plate
    // A BLAST inside the 1.2s launch-cooldown window is silently dropped
    // (plate.ts LAUNCH_COOLDOWN_MS) — space the launches so all 3 count.
    await waitLaunchCooldown(page);
  }
  await expect(page.locator('#firstLaunchHint')).toBeHidden();
});

test('Hint disappears once player scores ≥60%', async ({ page }) => {
  // Force best-match high-water mark to 75 (above threshold).
  await loadStory(page, { extraKeys: { fart_best_overall: '75' } });
  await expect(page.locator('#firstLaunchHint')).toBeHidden();
});
