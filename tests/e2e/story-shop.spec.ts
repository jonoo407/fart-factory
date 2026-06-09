import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

async function loadStoryMode(page: import('@playwright/test').Page, opts?: { gold?: number }) {
  await loadStory(page, { gold: opts?.gold });
}

test('Shop modal opens on Shop button click and shows offerings', async ({ page }) => {
  await loadStoryMode(page, { gold: 100 });
  // Modal hidden by default.
  await expect(page.locator('#shopModal')).toBeHidden();
  // Open it.
  await page.click('#shopBtn');
  await expect(page.locator('#shopModal')).toBeVisible();
  // At least 4 offerings (3 uncommon + 1 rare; epic may appear too).
  const cards = page.locator('.shop-offer');
  expect(await cards.count()).toBeGreaterThanOrEqual(4);
});

test('Shop modal shows prices in gold for every offering', async ({ page }) => {
  await loadStoryMode(page, { gold: 100 });
  await page.click('#shopBtn');
  const prices = page.locator('.shop-offer-price');
  const count = await prices.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const t = (await prices.nth(i).textContent()) ?? '';
    expect(t).toMatch(/\d+/);
  }
});

test('Shop modal closes via close button', async ({ page }) => {
  await loadStoryMode(page, { gold: 100 });
  await page.click('#shopBtn');
  await expect(page.locator('#shopModal')).toBeVisible();
  await page.click('#shopCloseBtn');
  await expect(page.locator('#shopModal')).toBeHidden();
});

test('Buying with enough gold deducts cost, unlocks food, and refreshes pantry', async ({ page }) => {
  await loadStoryMode(page, { gold: 100 });
  await page.click('#shopBtn');
  // Grab the first offering's foodId and price.
  const firstOffer = page.locator('.shop-offer').first();
  const foodId = await firstOffer.getAttribute('data-food');
  const priceText = (await firstOffer.locator('.shop-offer-price').textContent()) ?? '0';
  const price = parseInt(priceText.replace(/\D/g, ''), 10);
  expect(foodId).toBeTruthy();
  expect(price).toBeGreaterThan(0);

  // Click Buy.
  await firstOffer.locator('.shop-offer-buy').click();

  // Modal stays open. Offering should be removed (already-unlocked).
  await expect(page.locator(`.shop-offer[data-food="${foodId}"]`)).toHaveCount(0);

  // Gold counter decreased.
  const goldAfter = await page.locator('#goldCount').textContent();
  expect(parseInt(goldAfter ?? '0', 10)).toBe(100 - price);

  // Close the modal — newly-unlocked food should appear in pantry.
  await page.click('#shopCloseBtn');
  await expect(page.locator(`[data-food="${foodId}"]`)).toBeVisible();
});

test('Buying when broke: button is aria-disabled, no deduct, offer remains', async ({ page }) => {
  await loadStoryMode(page, { gold: 0 });
  await page.click('#shopBtn');
  const firstBuy = page.locator('.shop-offer-buy').first();
  // Buttons are marked aria-disabled when unaffordable (accessibility hint).
  await expect(firstBuy).toHaveAttribute('aria-disabled', 'true');
  // Force-click bypasses the disabled check to verify refusal logic still
  // protects the balance (defense in depth — not just a UI gate).
  await firstBuy.click({ force: true });
  await expect(page.locator('#goldCount')).toHaveText('0');
  expect(await page.locator('.shop-offer').count()).toBeGreaterThan(0);
});
