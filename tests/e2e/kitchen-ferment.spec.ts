import { test, expect } from '@playwright/test';
import { loadStory as loadStoryBase } from './_helpers';

async function loadStory(page: import('@playwright/test').Page, opts: { rack?: Array<{foodId: string; startedAt: string; startedAtIdx?: number}>; ferments?: number } = {}) {
  const extraKeys: Record<string, string> = {};
  if (opts.rack) extraKeys['fart_ferment_rack'] = JSON.stringify(opts.rack);
  if (opts.ferments !== undefined) extraKeys['fart_ferment_claims'] = String(opts.ferments);
  await loadStoryBase(page, { kitchen: true, extraKeys });
}

// The single-equip rebuild removed the prep table (and with it the per-slot
// "Send to Rack" add path). The fermentation rack stays in the Kitchen overlay
// as a claim-only section for now (it moves behind the "More" surface later),
// so these specs seed the rack directly and cover display + claim.

test('A waiting ferment renders in the rack', async ({ page }) => {
  await loadStory(page, {
    rack: [{ foodId: 'cheese', startedAt: new Date().toISOString(), startedAtIdx: 0 }],
  });
  await page.click('#kitchenModeToggle');
  await expect(page.locator('.ferment-slot-waiting').first()).toBeVisible();
});

test('Ferment slot placed at idx 0 shows Ready + Claim at idx 1', async ({ page }) => {
  // Seed rack with a slot stamped at idx 0; advance encounter counter to 1.
  await loadStory(page, {
    rack: [{ foodId: 'cheese', startedAt: new Date().toISOString(), startedAtIdx: 0 }],
  });
  await page.evaluate(() => localStorage.setItem('fart_encounter_idx', '1'));
  await page.reload();
  await page.click('#kitchenModeToggle');
  await expect(page.locator('.ferment-slot-ready').first()).toBeVisible();
  await expect(page.locator('.ferment-claim-btn').first()).toBeVisible();
});

test('Clicking Claim removes the slot and increments the ferment-claims counter (Phase V item 98)', async ({ page }) => {
  await loadStory(page, {
    rack: [{ foodId: 'cheese', startedAt: new Date().toISOString(), startedAtIdx: 0 }],
  });
  await page.evaluate(() => localStorage.setItem('fart_encounter_idx', '1'));
  await page.reload();
  await page.click('#kitchenModeToggle');
  await page.locator('.ferment-claim-btn').first().click();
  // Rack slot disappears (now empty placeholder).
  await expect(page.locator('.ferment-slot-ready')).toHaveCount(0);
  // The persisted ferment-claims counter should be 1.
  const claims = await page.evaluate(() => localStorage.getItem('fart_ferment_claims'));
  expect(parseInt(claims ?? '0', 10)).toBe(1);
});
