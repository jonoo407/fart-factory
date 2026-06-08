import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page, opts?: { notes?: number }) {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_hard_mode');
    localStorage.removeItem('fart_last_match');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_gold');
    localStorage.removeItem('fart_recipes_seen');
    if (p.notes !== undefined) {
      localStorage.setItem('fart_research', String(p.notes));
    } else {
      localStorage.removeItem('fart_research');
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  }, { notes: opts?.notes ?? null });
  await page.reload();
}

test('Research notes counter starts at 0 and is clickable', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#notesCount')).toHaveText('0');
  await expect(page.locator('#researchBtn')).toBeVisible();
});

test('Research modal opens and shows research-eligible foods (no legendary)', async ({ page }) => {
  await loadStoryMode(page, { notes: 50 });
  await page.click('#researchBtn');
  await expect(page.locator('#researchModal')).toBeVisible();
  const offers = page.locator('.research-offer');
  expect(await offers.count()).toBeGreaterThan(0);
});

test('Research panel closes via close button', async ({ page }) => {
  await loadStoryMode(page);
  await page.click('#researchBtn');
  await page.click('#researchCloseBtn');
  await expect(page.locator('#researchModal')).toBeHidden();
});

test('Unlocking a food with enough notes deducts cost and adds to pantry', async ({ page }) => {
  await loadStoryMode(page, { notes: 100 });
  await page.click('#researchBtn');
  const firstOffer = page.locator('.research-offer').first();
  const foodId = await firstOffer.getAttribute('data-food');
  const costText = (await firstOffer.locator('.research-offer-cost').textContent()) ?? '0';
  const cost = parseInt(costText.replace(/\D/g, ''), 10);
  await firstOffer.locator('.research-offer-unlock').click();
  await expect(page.locator(`.research-offer[data-food="${foodId}"]`)).toHaveCount(0);
  await expect(page.locator('#notesCount')).toHaveText(String(100 - cost));
  await page.click('#researchCloseBtn');
  await expect(page.locator(`[data-food="${foodId}"]`)).toBeVisible();
});

test('Research panel correctly blocks unlock when broke (aria-disabled, no deduct)', async ({ page }) => {
  await loadStoryMode(page, { notes: 0 });
  await page.click('#researchBtn');
  const firstUnlock = page.locator('.research-offer-unlock').first();
  await expect(firstUnlock).toHaveAttribute('aria-disabled', 'true');
  await firstUnlock.click({ force: true });
  await expect(page.locator('#notesCount')).toHaveText('0');
});
