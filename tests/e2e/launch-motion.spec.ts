import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
}

test('Launch button gets .firing class on click and animates', async ({ page }) => {
  await loadApp(page);
  const btn = page.locator('#launchBtn');
  await expect(btn).not.toHaveClass(/firing/);
  await btn.click();
  // .firing is added synchronously in the click handler (after a forced reflow).
  await expect(btn).toHaveClass(/firing/);

  // CSS animation declared on .launch.firing — verify resolved animation.
  const animName = await btn.evaluate((el) => getComputedStyle(el).animationName);
  expect(animName).toBe('launchWindupPopSettle');
  const animDur = await btn.evaluate((el) => getComputedStyle(el).animationDuration);
  // 600ms expected, but reduced-motion shouldn't be active in this test.
  expect(animDur).toBe('0.6s');
});

test('Launch motion respects prefers-reduced-motion (clamped to under 1ms)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadApp(page);
  const btn = page.locator('#launchBtn');
  await btn.click();
  // Browser may serialize the clamped duration as "1e-06s" or "0.001ms".
  // Resolve in seconds and assert it's effectively zero.
  const animDurSec = await btn.evaluate((el) => {
    const s = getComputedStyle(el).animationDuration;
    if (s.endsWith('ms')) return parseFloat(s) / 1000;
    return parseFloat(s); // seconds
  });
  expect(animDurSec).toBeLessThan(0.005);
});
