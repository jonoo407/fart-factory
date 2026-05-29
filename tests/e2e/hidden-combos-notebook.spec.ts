import { test, expect, type Page } from '@playwright/test';

async function loadStory(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
  });
  await page.reload();
}

test('Hidden Combos section renders all combos as silhouettes on a fresh save', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  const list = page.locator('#hiddenCombosList');
  await expect(list).toBeVisible();
  await expect(list.locator('.hidden-combo')).toHaveCount(14);
  // None found yet → all locked.
  await expect(list.locator('.hidden-combo-found')).toHaveCount(0);
  await expect(list.locator('.hidden-combo-locked')).toHaveCount(14);
});

test('a discovered combo shows revealed (name + emoji) in the notebook', async ({ page }) => {
  await loadStory(page);
  // Seed bender as found.
  await page.evaluate(() => {
    localStorage.setItem('fart_hidden_combos_found', JSON.stringify(['bender']));
  });
  await page.reload();
  await page.click('#notebookBtn');
  const bender = page.locator('.hidden-combo[data-combo="bender"]');
  await expect(bender).toHaveClass(/hidden-combo-found/);
  await expect(bender.locator('.hidden-combo-name')).toContainText('BENDER');
});

test('locked combos still show their hint (to tease discovery)', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  // Every locked combo card has a non-empty hint visible.
  const hints = await page.locator('.hidden-combo-locked .hidden-combo-hint').allTextContents();
  expect(hints.length).toBe(14);
  for (const h of hints) expect(h.trim().length).toBeGreaterThan(0);
});
