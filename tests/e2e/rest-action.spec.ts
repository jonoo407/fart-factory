import { test, expect } from '@playwright/test';

async function loadStoryWithState(
  page: import('@playwright/test').Page,
  opts: { bellyRemaining?: number; notes?: number } = {},
) {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_pantry');
    const now = new Date();
    const dayKey = `fart_belly_${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    if (p.bellyRemaining !== undefined) localStorage.setItem(dayKey, String(p.bellyRemaining));
    if (p.notes !== undefined) localStorage.setItem('fart_research', String(p.notes));
  }, opts);
  await page.reload();
}

test('Rest button is HIDDEN when belly is full', async ({ page }) => {
  await loadStoryWithState(page, { notes: 50 });
  await expect(page.locator('#restBtn')).toBeHidden();
});

test('Rest button appears when belly is low (<33% capacity)', async ({ page }) => {
  await loadStoryWithState(page, { bellyRemaining: 5, notes: 50 });
  await expect(page.locator('#restBtn')).toBeVisible();
});

test('Rest button is aria-disabled when player has fewer than 10 notes', async ({ page }) => {
  await loadStoryWithState(page, { bellyRemaining: 5, notes: 3 });
  await expect(page.locator('#restBtn')).toBeVisible();
  await expect(page.locator('#restBtn')).toHaveAttribute('aria-disabled', 'true');
});

test('Clicking Rest with enough notes refills belly and deducts notes', async ({ page }) => {
  await loadStoryWithState(page, { bellyRemaining: 5, notes: 50 });
  await page.click('#restBtn');
  // Belly value reads 30/30 (full).
  await expect(page.locator('#bellyValue')).toHaveText('30');
  await expect(page.locator('#notesCount')).toHaveText('40');
});

test('Rest button hides again after a successful refill (belly is full)', async ({ page }) => {
  await loadStoryWithState(page, { bellyRemaining: 5, notes: 50 });
  await page.click('#restBtn');
  await expect(page.locator('#restBtn')).toBeHidden();
});
