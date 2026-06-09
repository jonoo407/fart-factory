import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('Story Launch button fires; empty plate produces "whisper" message', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('#storyLaunchBtn')).toBeVisible();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#storyResult')).toBeVisible();
  await expect(page.locator('#storyResultTitle')).toHaveText(/whisper|Empty/i);
});

test('Story Launch with Beans + Cheese triggers Swamp synergy message', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#storyResult')).toBeVisible();
  await expect(page.locator('#storyResultEffects')).toContainText(/Swamp/i);
});

test('Story Launch clears the plate and deducts belly persistently', async ({ page }) => {
  await loadStory(page);
  await page.locator('[data-food="beans"]').click();   // +2 fill
  await page.locator('[data-food="cheese"]').click();  // +2 fill
  await page.locator('[data-food="onion"]').click();   // +2 fill → 6 of 20 full
  await expect(page.locator('#bellyValue')).toHaveText('6');
  await page.click('#storyLaunchBtn');
  // Plate cleared, belly fullness persisted at 6
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toHaveCount(0);
  await expect(page.locator('#bellyValue')).toHaveText('6');
  // Reload — belly stays at 6 since we already committed (encounter-anchored).
  await page.reload(); // fart_onboarding_seen persists from the initial seed
  await expect(page.locator('#bellyValue')).toHaveText('6');
});

// NB: the "AudioContext exists after Story Launch" assertion lives in
// mute.spec.ts ("muting via popover suspends AudioContext after a story
// launch"), which performs the identical launch + state read — it was
// duplicated here and has been dropped.
