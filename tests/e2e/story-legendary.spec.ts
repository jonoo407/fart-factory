import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('Notebook shows the Legendary Quests section with 6 quest cards', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#legendaryQuests')).toBeVisible();
  const quests = page.locator('.legendary-quest');
  expect(await quests.count()).toBe(6);
});

test('Each quest card shows steps and a CLAIM/Locked button', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  const firstQuest = page.locator('.legendary-quest').first();
  await expect(firstQuest.locator('.legendary-quest-steps')).toBeVisible();
  // On a fresh save, no quest is complete — Claim button is aria-disabled.
  const claimBtn = firstQuest.locator('.quest-claim-btn').first();
  await expect(claimBtn).toHaveAttribute('aria-disabled', 'true');
});

test('Launching a recipe with a legendary food fires the fanfare animation', async ({ page }) => {
  // Force the pantry to include a legendary food (forbidden-burrito).
  await loadStory(page, {
    pantry: ['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage', 'forbidden-burrito'],
  });
  await page.locator('[data-food="forbidden-burrito"]').click();
  await page.click('#storyLaunchBtn');
  // The fanfare class is added briefly. Catch it within its 1.6s window.
  await expect(page.locator('.audience-wrap.audience-wrap-legendary')).toBeVisible({ timeout: 500 });
});

test('Audience portrait does NOT fanfare for non-legendary launches', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  // The fanfare class is added synchronously inside the launch handler; the
  // reaction takeover is the handler's terminal UI state — once it is visible
  // the negative assertion is meaningful (no blind sleep).
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await expect(page.locator('.audience-wrap.audience-wrap-legendary')).toHaveCount(0);
});
