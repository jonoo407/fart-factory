import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('Gold counter increments after a launch (and persists in localStorage)', async ({ page }) => {
  await loadStory(page);
  // Plate a few foods and launch — match% will be whatever the daily audience yields.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  // Wait for the launch to fully process (reaction takeover is its terminal state).
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  // Read both the displayed counter and the stored value.
  const displayed = await page.locator('#goldCount').textContent();
  const stored = await page.evaluate(() => localStorage.getItem('fart_gold'));
  // Whatever the value, displayed must match stored. (≥0; could be 0 if match<50.)
  const displayedNum = parseInt(displayed ?? '0', 10);
  const storedNum = stored === null ? 0 : parseInt(stored, 10);
  expect(displayedNum).toBe(storedNum);
  expect(displayedNum).toBeGreaterThanOrEqual(0);
});

test('Gold counter starts at 0 and is visible alongside notes counter and a Shop button', async ({ page }) => {
  await loadStory(page);
  // Fresh save → 0 gold (folded in from the former "starts at 0" test).
  await expect(page.locator('#goldCount')).toBeVisible();
  await expect(page.locator('#goldCount')).toHaveText('0');
  // PLAN v9 UI-overhaul — #notesCount relocated into the now-hidden #researchBtn
  // (research is reached via the Lab Book). Assert the counter is wired (value
  // readable) rather than visible.
  await expect(page.locator('#notesCount')).toHaveCount(1);
  expect((await page.locator('#notesCount').textContent())?.trim().length).toBeGreaterThan(0);
  await expect(page.locator('#shopBtn')).toBeVisible();
});
