import { test, expect } from '@playwright/test';

/**
 * Tier 3 item 11 — Sparkle particles on S+.
 *
 * When the player achieves S+ grade (total ≥ 54 = all sliders at 9-10),
 * the app should spawn at least 20 .sparkle DOM nodes for celebration.
 * Particles must respect prefers-reduced-motion (none should spawn when set).
 */

test.describe('S+ sparkle particles', () => {
  test('S+ spawns at least 20 sparkle nodes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      await page.evaluate(
        (sliderId) => {
          const el = document.getElementById(sliderId) as HTMLInputElement;
          el.value = '10';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        id,
      );
    }
    await page.click('#launchBtn');
    await page.waitForSelector('.sparkle', { timeout: 2000 });
    const count = await page.locator('.sparkle').count();
    expect(count).toBeGreaterThanOrEqual(20);
  });

  test('B grade does NOT spawn sparkle nodes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Defaults are all 5 → total 30 → grade B
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    // Wait briefly for any potential animation
    await page.waitForTimeout(150);
    const count = await page.locator('.sparkle').count();
    expect(count).toBe(0);
  });

  test('prefers-reduced-motion suppresses sparkle particles', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      await page.evaluate(
        (sliderId) => {
          const el = document.getElementById(sliderId) as HTMLInputElement;
          el.value = '10';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        id,
      );
    }
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    await page.waitForTimeout(150);
    const count = await page.locator('.sparkle').count();
    expect(count).toBe(0);
    await context.close();
  });
});
