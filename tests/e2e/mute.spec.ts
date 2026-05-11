import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function loadApp(page: import('@playwright/test').Page) {
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

test('clicking mute suspends AudioContext after a launch', async ({ page }) => {
  await loadApp(page);

  await page.click('#launchBtn');
  // ctx is created lazily inside playFart on click
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
