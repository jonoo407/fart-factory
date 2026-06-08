import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page, opts?: { pantry?: string[] }) {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_hard_mode');
    localStorage.removeItem('fart_last_match');
    localStorage.removeItem('fart_recipes_seen');
    if (p.pantry) {
      localStorage.setItem('fart_pantry', JSON.stringify(p.pantry));
    } else {
      localStorage.removeItem('fart_pantry');
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  }, { pantry: opts?.pantry ?? null });
  await page.reload();
}

test('Notebook shows the Legendary Quests section with 6 quest cards', async ({ page }) => {
  await loadStoryMode(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#legendaryQuests')).toBeVisible();
  const quests = page.locator('.legendary-quest');
  expect(await quests.count()).toBe(6);
});

test('Each quest card shows steps and a CLAIM/Locked button', async ({ page }) => {
  await loadStoryMode(page);
  await page.click('#notebookBtn');
  const firstQuest = page.locator('.legendary-quest').first();
  await expect(firstQuest.locator('.legendary-quest-steps')).toBeVisible();
  // On a fresh save, no quest is complete — Claim button is aria-disabled.
  const claimBtn = firstQuest.locator('.quest-claim-btn').first();
  await expect(claimBtn).toHaveAttribute('aria-disabled', 'true');
});

test('Launching a recipe with a legendary food fires the fanfare animation', async ({ page }) => {
  // Force the pantry to include a legendary food (forbidden-burrito).
  await loadStoryMode(page, {
    pantry: ['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage', 'forbidden-burrito'],
  });
  await page.locator('[data-food="forbidden-burrito"]').click();
  await page.click('#storyLaunchBtn');
  // The fanfare class is added briefly. Catch it within its 1.6s window.
  await expect(page.locator('.audience-wrap.audience-wrap-legendary')).toBeVisible({ timeout: 500 });
});

test('Audience portrait does NOT fanfare for non-legendary launches', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(200);
  await expect(page.locator('.audience-wrap.audience-wrap-legendary')).toHaveCount(0);
});
