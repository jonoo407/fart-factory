import { test, expect, type Page } from '@playwright/test';

async function loadStory(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
  });
  await page.reload();
}

test('confetti container exists and is initially empty', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('.confetti-piece')).toHaveCount(0);
});

test('launch button stays enabled between launches when match < 95', async ({ page }) => {
  await loadStory(page);
  await page.locator('.food-card-clickable[data-food="beans"]').click();
  const btn = page.locator('#storyLaunchBtn');
  await btn.click();
  await expect(btn).toBeEnabled({ timeout: 3000 });
});

test('PERFECT cinematic disables the launch button + spawns confetti', async ({ page }) => {
  await loadStory(page);
  await page.evaluate(() => {
    const w = window as unknown as { __playPerfectCinematic?: () => Promise<void> };
    void w.__playPerfectCinematic?.();
  });
  await expect(page.locator('#storyLaunchBtn')).toBeDisabled();
  await expect(page.locator('.confetti-piece').first()).toBeVisible({ timeout: 500 });
  await page.waitForTimeout(1400);
  await expect(page.locator('#storyLaunchBtn')).toBeEnabled();
});

test('PERFECT cinematic is a no-op under prefers-reduced-motion (no confetti)', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
  });
  await page.reload();
  await page.evaluate(async () => {
    const w = window as unknown as { __playPerfectCinematic?: () => Promise<void> };
    await w.__playPerfectCinematic?.();
  });
  await expect(page.locator('.confetti-piece')).toHaveCount(0);
  await context.close();
});
