import { test, expect } from '@playwright/test';
import { loadStory, dismissReaction } from './_helpers';

test('Notebook button shows discovered/total count', async ({ page }) => {
  await loadStory(page);
  // 0 / (total) at start (only pre-known are visible but discovered=0 since
  // markRecipeDiscovered hasn't been called yet — pre-known just means
  // not-hidden, doesn't auto-add to fart_recipes_seen).
  await expect(page.locator('#notebookBtn')).toBeVisible();
  await expect(page.locator('#notebookBtn')).toContainText('0/');
});

test('Notebook button counter increments after discovery', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await expect(page.locator('#notebookBtn')).toContainText('1/');
});

test('Notebook modal opens and shows recipe cards', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#notebookModal')).toBeVisible();
  // Many recipe cards rendered (all of them — discovered + undiscovered).
  const cards = page.locator('.notebook-recipe');
  expect(await cards.count()).toBeGreaterThanOrEqual(30);
});

test('Undiscovered hidden recipes show as silhouette (no name)', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  // At least one card should be locked (most are hidden=true).
  await expect(page.locator('.notebook-recipe-locked').first()).toBeVisible();
});

test('Discovered recipe has a Cook button that auto-fills the plate', async ({ page }) => {
  await loadStory(page);
  // Discover Swamp Beast (beans + cheese).
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await dismissReaction(page); // close the takeover covering the nav
  // Open notebook and click Cook on the discovered recipe.
  await page.click('#notebookBtn');
  const swampCard = page.locator('.notebook-recipe[data-recipe="swamp-beast"]');
  await expect(swampCard).toBeVisible();
  await swampCard.locator('.notebook-recipe-cook').click();
  // Modal closes; plate is filled with beans + cheese.
  await expect(page.locator('#notebookModal')).toBeHidden();
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
  await expect(page.locator('#plateSlot2.plate-slot-filled')).toBeVisible();
});

test('Notebook closes via close button', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#notebookModal')).toBeVisible();
  await page.click('#notebookCloseBtn');
  await expect(page.locator('#notebookModal')).toBeHidden();
});
