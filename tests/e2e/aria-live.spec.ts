import { test, expect, type Page } from '@playwright/test';

/**
 * Tier 1 item 6 — ARIA live region announces grade.
 *
 * The new app must have an [aria-live="polite"] off-screen status node
 * that gets the announced grade text within 2 seconds of clicking Launch.
 * Without this, screen-reader users get no feedback after pressing Launch.
 */

async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#launchBtn');
}

test.describe('ARIA live region', () => {
  test('grade is announced within 2 seconds of Launch click', async ({
    page,
  }) => {
    await loadApp(page);
    const live = page.locator('#liveRegion');
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toHaveAttribute('role', 'status');
    expect((await live.textContent())?.trim()).toBe('');

    const start = Date.now();
    await page.click('#launchBtn');
    await page.waitForFunction(
      () => {
        const el = document.getElementById('liveRegion');
        return !!el && (el.textContent ?? '').trim().length > 0;
      },
      undefined,
      { timeout: 2000 },
    );
    expect(Date.now() - start).toBeLessThan(2100);

    const announcement = (await live.textContent())?.trim() ?? '';
    expect(announcement).toMatch(/^Grade: (F-|D|C\+?|B\+?|A\+?|S\+)\./);
  });

  test('all 6 sliders have aria-label', async ({ page }) => {
    await loadApp(page);
    for (let i = 1; i <= 6; i++) {
      const label = await page.locator(`#s${i}`).getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(3);
    }
  });

  test('lab group has role=group and an accessible name', async ({ page }) => {
    await loadApp(page);
    const lab = page.locator('.lab');
    await expect(lab).toHaveAttribute('role', 'group');
    const name = await lab.getAttribute('aria-label');
    expect(name).toBeTruthy();
  });
});
