import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

/**
 * The Live Show — live crowd read while plating. The strip on the crowd
 * ticket must surface a coarse mood as foods are plated, never leak numbers
 * (tier-only, anti-oracle), and read IDENTICALLY for the same plate (the
 * jitter is deterministic per encounter + plate composition — no rerolls).
 */

test('plating updates the live crowd mood; same plate always reads the same', async ({ page }) => {
  await loadStory(page);
  const strip = page.locator('#crowdMoodStrip');
  const caption = strip.locator('.cm-caption');
  const emoji = strip.locator('.cm-emoji');

  // Empty plate → the expectant state renders after the debounce.
  await expect(strip).toBeVisible();
  await expect(caption).toContainText('crowd watches');

  // Plate a food → a real mood replaces the expectant state.
  await page.locator('[data-food="beans"]').click();
  await expect(caption).not.toContainText('crowd watches');
  const firstCaption = await caption.textContent();
  const firstEmoji = await emoji.textContent();
  // Tier-only: the strip must never leak a number.
  expect(await strip.textContent()).not.toMatch(/\d/);

  // Remove it → back to expectant.
  await page.locator('#plateSlot1').click();
  await expect(caption).toContainText('crowd watches');

  // Re-plate the SAME food → identical mood + caption (deterministic jitter:
  // the read can't be rerolled by removing and re-adding).
  await page.locator('[data-food="beans"]').click();
  await expect(caption).not.toContainText('crowd watches');
  expect(await caption.textContent()).toBe(firstCaption);
  expect(await emoji.textContent()).toBe(firstEmoji);
});
