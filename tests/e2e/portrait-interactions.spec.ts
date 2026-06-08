import { test, expect, type Page } from '@playwright/test';

async function loadStory(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
  });
  await page.reload();
  await page.waitForSelector('#audiencePortraitEmoji');
}

test('audience portrait is keyboard-accessible (role=button, tabindex)', async ({ page }) => {
  await loadStory(page);
  const emoji = page.locator('#audiencePortraitEmoji');
  await expect(emoji).toHaveAttribute('role', 'button');
  await expect(emoji).toHaveAttribute('tabindex', '0');
});

test('quick tap on the portrait spawns reaction particles + shows voice-preview hint once', async ({ page }) => {
  await loadStory(page);
  const emoji = page.locator('#audiencePortraitEmoji');
  // Use mouse down→up faster than the 600ms long-press threshold.
  const box = await emoji.boundingBox();
  if (!box) throw new Error('portrait not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  // First tap shows the long-press discoverability hint.
  await expect(page.locator('.feature-intro')).toBeVisible();
  // Particles spawn under .audience-wrap (the container they mount into).
  await expect(page.locator('.audience-wrap .reaction-particle').first()).toBeVisible({ timeout: 500 });
});

test('long-press (≥600ms) does not re-show the hint (already seen)', async ({ page }) => {
  await loadStory(page);
  await page.evaluate(() => localStorage.setItem('fart_intro_seen_portrait_voice', 'true'));
  const emoji = page.locator('#audiencePortraitEmoji');
  const box = await emoji.boundingBox();
  if (!box) throw new Error('portrait not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(750);
  await page.mouse.up();
  // No feature-intro mount this time.
  await expect(page.locator('.feature-intro')).toHaveCount(0);
});
