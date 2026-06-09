import { test, expect } from '@playwright/test';
import { loadStory, dismissReaction } from './_helpers';

/**
 * Recipe discovery — merged spec (former story-discovery + discovery-splash,
 * which drove the identical beans+cheese launch/relaunch flow). Each launch
 * asserts BOTH discovery surfaces: the #discoverySplash center-screen overlay
 * AND the .story-result-discovery-new result line.
 */

test('First launch of a new combo shows the NEW RECIPE result line AND the discovery splash (P6)', async ({ page }) => {
  await loadStory(page);
  // Swamp Beast = beans + cheese — a starter recipe.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  // Result line in the breakdown panel…
  await expect(page.locator('.story-result-discovery-new')).toBeVisible();
  await expect(page.locator('.story-result-discovery-new')).toContainText('Swamp Beast');
  // …and the center-screen splash banner.
  await expect(page.locator('#discoverySplash')).toBeVisible();
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

test('Re-launching a known recipe shows the muted "Recipe:" line — no NEW line, no splash', async ({ page }) => {
  await loadStory(page);
  // First launch — discover Swamp Beast.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#discoverySplash')).toBeVisible();
  // Wait for the splash to dismiss (3.2s — also comfortably clears the 1.2s
  // launch cooldown gate before the second BLAST).
  await expect(page.locator('#discoverySplash')).toBeHidden({ timeout: 4000 });
  // Close the reaction takeover so the pantry is reachable again.
  await dismissReaction(page);
  // Second launch — should NOT trigger NEW line nor a new splash.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await expect(page.locator('.story-result-discovery-new')).toHaveCount(0);
  await expect(page.locator('.story-result-discovery')).toContainText('Swamp Beast');
  await expect(page.locator('#discoverySplash')).toBeHidden();
});

test('Discovered recipes persist in localStorage', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  // Wait for the launch to fully process before reading the persisted state.
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  const seen = await page.evaluate(() => localStorage.getItem('fart_recipes_seen'));
  expect(seen).toBeTruthy();
  expect(seen).toContain('swamp-beast');
});
