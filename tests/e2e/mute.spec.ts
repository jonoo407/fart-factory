import { test, expect, type Page } from '@playwright/test';

async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
  });
  await page.reload();
}

test('mute button toggles label and persists across reload', async ({ page }) => {
  await loadApp(page);
  const muteBtn = page.locator('#muteBtn');
  await expect(muteBtn).toBeVisible();
  await expect(muteBtn).toHaveAttribute('aria-pressed', 'false');

  await muteBtn.click();
  await expect(muteBtn).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
});

test('clicking mute suspends AudioContext after a story launch', async ({ page }) => {
  await loadApp(page);

  // Click any unlocked pantry food (free common food) then launch to create an AudioContext.
  await page.locator('.food-card-clickable').first().click();
  await page.click('#storyLaunchBtn');
  const stateAfterLaunch = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'unknown';
  });
  expect(['running', 'suspended']).toContain(stateAfterLaunch);

  await page.click('#muteBtn');
  await page.waitForTimeout(250);
  const stateAfterMute = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'unknown';
  });
  expect(stateAfterMute).toBe('suspended');
});
