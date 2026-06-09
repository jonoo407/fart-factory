import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

async function loadStoryMode(page: import('@playwright/test').Page, opts?: { notes?: number }) {
  await loadStory(page, { notes: opts?.notes });
}

test('Research notes counter starts at 0; research is reachable from the Lab Book', async ({ page }) => {
  await loadStoryMode(page);
  // #notesCount lives inside the now-hidden #researchBtn; assert its value directly.
  expect((await page.locator('#notesCount').textContent())?.trim()).toBe('0');
  // Research is reached via the dock Book tab → Open Research Lab.
  await page.click('#notebookBtn');
  await expect(page.locator('#notebookResearchBtn')).toBeVisible();
  await page.click('#notebookResearchBtn');
  await expect(page.locator('#researchModal')).toBeVisible();
});

test('Research modal opens and shows research-eligible foods (no legendary)', async ({ page }) => {
  await loadStoryMode(page, { notes: 50 });
  await page.click('#notebookBtn');
  await page.click('#notebookResearchBtn');
  await expect(page.locator('#researchModal')).toBeVisible();
  const offers = page.locator('.research-offer');
  expect(await offers.count()).toBeGreaterThan(0);
});

test('Research panel closes via close button', async ({ page }) => {
  await loadStoryMode(page);
  await page.click('#notebookBtn');
  await page.click('#notebookResearchBtn');
  await page.click('#researchCloseBtn');
  await expect(page.locator('#researchModal')).toBeHidden();
});

test('Unlocking a food with enough notes deducts cost and adds to pantry', async ({ page }) => {
  await loadStoryMode(page, { notes: 100 });
  await page.click('#notebookBtn');
  await page.click('#notebookResearchBtn');
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
  await page.click('#notebookBtn');
  await page.click('#notebookResearchBtn');
  const firstUnlock = page.locator('.research-offer-unlock').first();
  await expect(firstUnlock).toHaveAttribute('aria-disabled', 'true');
  await firstUnlock.click({ force: true });
  await expect(page.locator('#notesCount')).toHaveText('0');
});
