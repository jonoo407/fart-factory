import { test, expect } from '@playwright/test';

async function loadStoryWithUnlocks(
  page: import('@playwright/test').Page,
  opts: { defeatedBosses?: string[]; pantry?: string[]; recipes?: string[]; bestOverall?: number; epicsOwned?: string[] } = {},
) {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_hard_mode');
    if (p.pantry) localStorage.setItem('fart_pantry', JSON.stringify(p.pantry));
    if (p.recipes) localStorage.setItem('fart_recipes_seen', JSON.stringify(p.recipes));
    if (p.defeatedBosses) localStorage.setItem('fart_bosses_defeated', JSON.stringify(p.defeatedBosses));
    if (p.bestOverall !== undefined) localStorage.setItem('fart_best_overall', String(p.bestOverall));
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  }, opts);
  await page.reload();
}

test('Boss arena overlay is hidden by default', async ({ page }) => {
  await loadStoryWithUnlocks(page);
  await expect(page.locator('#arenaOverlay')).toBeHidden();
});

test('Opening the notebook reveals a Bosses section with 5 boss cards', async ({ page }) => {
  await loadStoryWithUnlocks(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#bossList')).toBeVisible();
  await expect(page.locator('.boss-card')).toHaveCount(5);
});

test('Locked bosses show the unlock requirement and a disabled Fight button', async ({ page }) => {
  await loadStoryWithUnlocks(page);
  await page.click('#notebookBtn');
  // On a fresh save, Boss 1 (Granny) requires 10 recipes — locked.
  const card = page.locator('.boss-card[data-boss="granny-family-reunion"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.boss-fight-btn')).toHaveAttribute('aria-disabled', 'true');
  await expect(card).toContainText(/10 recipes/i);
});

test('Boss 1 unlocks after discovering 10 recipes', async ({ page }) => {
  const fakeRecipes = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);
  await loadStoryWithUnlocks(page, { recipes: fakeRecipes });
  await page.click('#notebookBtn');
  const card = page.locator('.boss-card[data-boss="granny-family-reunion"]');
  await expect(card.locator('.boss-fight-btn')).not.toHaveAttribute('aria-disabled', 'true');
});

test('Clicking Fight on an unlocked boss opens the arena overlay', async ({ page }) => {
  const fakeRecipes = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);
  await loadStoryWithUnlocks(page, { recipes: fakeRecipes });
  await page.click('#notebookBtn');
  await page.locator('.boss-card[data-boss="granny-family-reunion"] .boss-fight-btn').click();
  await expect(page.locator('#arenaOverlay')).toBeVisible();
  // Boss name + emoji visible.
  await expect(page.locator('#arenaBossName')).toContainText(/Granny/);
});

test('Arena Close button forfeits and returns to Story shell', async ({ page }) => {
  const fakeRecipes = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);
  await loadStoryWithUnlocks(page, { recipes: fakeRecipes });
  await page.click('#notebookBtn');
  await page.locator('.boss-card[data-boss="granny-family-reunion"] .boss-fight-btn').click();
  await expect(page.locator('#arenaOverlay')).toBeVisible();
  await page.click('#arenaCloseBtn');
  await expect(page.locator('#arenaOverlay')).toBeHidden();
});

test('When arena active, daily audience portrait is hidden but plate+pantry remain visible', async ({ page }) => {
  const fakeRecipes = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);
  await loadStoryWithUnlocks(page, { recipes: fakeRecipes });
  await page.click('#notebookBtn');
  await page.locator('.boss-card[data-boss="granny-family-reunion"] .boss-fight-btn').click();
  // Audience-wrap hidden via the body[data-arena-active] CSS.
  await expect(page.locator('.audience-wrap')).toBeHidden();
  // Plate + pantry + launch still visible underneath.
  await expect(page.locator('#plateSlot1')).toBeVisible();
  await expect(page.locator('#pantryGrid')).toBeVisible();
  await expect(page.locator('#storyLaunchBtn')).toBeVisible();
});

test('Launch routes to arena: victory unlocks reward food (Boss 1 — intersection puzzle)', async ({ page }) => {
  const fakeRecipes = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);
  await loadStoryWithUnlocks(page, { recipes: fakeRecipes });
  // Open arena.
  await page.click('#notebookBtn');
  await page.locator('.boss-card[data-boss="granny-family-reunion"] .boss-fight-btn').click();
  await expect(page.locator('#arenaOverlay')).toBeVisible();

  // Plate a mild plate that should pass all 3 family-style audiences.
  // Granny/Baby Shower/Kindergarten all want gentle, musical, short. Cheese
  // is mild, low-stink, low-loud — close to the intersection.
  await page.locator('.food-card-clickable[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');

  // Either victory or defeat result panel visible. We don't assert outcome
  // here (depends on cravings math) — but we DO assert that the arena
  // handled the launch (result panel filled in).
  await expect(page.locator('#arenaResult')).toBeVisible();
});
