import { test, expect } from '@playwright/test';

async function loadStory(page: import('@playwright/test').Page, opts: { rack?: Array<{foodId: string; startedAt: string}>; ferments?: number } = {}) {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.setItem('fart_kitchen_mode', 'true');
    localStorage.removeItem('fart_pantry');
    if (p.rack) localStorage.setItem('fart_ferment_rack', JSON.stringify(p.rack));
    else localStorage.removeItem('fart_ferment_rack');
    if (p.ferments !== undefined) localStorage.setItem('fart_ferment_claims', String(p.ferments));
    else localStorage.removeItem('fart_ferment_claims');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  }, { rack: opts.rack ?? null, ferments: opts.ferments ?? null });
  await page.reload();
}

test('Each prep slot has a "Send to Rack" button (Phase V item 97)', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').click();
  await expect(page.locator('#prepSlot1 .prep-send-to-rack-btn')).toBeVisible();
});

test('Clicking Send to Rack removes the prep slot AND adds to ferment rack', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').click();
  await page.locator('#prepSlot1 .prep-send-to-rack-btn').click();
  // Prep slot 1 is now empty.
  await expect(page.locator('#prepSlot1.prep-slot-filled')).toHaveCount(0);
  // Ferment rack now has a waiting slot.
  await expect(page.locator('.ferment-slot-waiting').first()).toBeVisible();
});

test('Yesterday-seeded ferment slot shows Ready + Claim button', async ({ page }) => {
  const yesterday = new Date(Date.now() - 86_400_000);
  await loadStory(page, { rack: [{ foodId: 'cheese', startedAt: yesterday.toISOString() }] });
  await page.click('#kitchenBtn');
  await expect(page.locator('.ferment-slot-ready').first()).toBeVisible();
  await expect(page.locator('.ferment-claim-btn').first()).toBeVisible();
});

test('Clicking Claim removes the slot and increments the ferment-claims counter (Phase V item 98)', async ({ page }) => {
  const yesterday = new Date(Date.now() - 86_400_000);
  await loadStory(page, { rack: [{ foodId: 'cheese', startedAt: yesterday.toISOString() }] });
  await page.click('#kitchenBtn');
  await page.locator('.ferment-claim-btn').first().click();
  // Rack slot disappears (now empty placeholder).
  await expect(page.locator('.ferment-slot-ready')).toHaveCount(0);
  // The persisted ferment-claims counter should be 1.
  const claims = await page.evaluate(() => localStorage.getItem('fart_ferment_claims'));
  expect(parseInt(claims ?? '0', 10)).toBe(1);
});
