import { test, expect, type Page } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

/**
 * Tier 4 item 15 — Combo streak counter.
 *
 * 3 consecutive A/A+/S+ grades show a "🔥 3-FART STREAK!" banner.
 * Lower grade breaks the streak and hides the banner.
 */

async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
  });
  await page.reload();
  await page.waitForSelector('#launchBtn');
}

async function setAll(page: Page, value: number): Promise<void> {
  for (let i = 1; i <= 6; i++) {
    await page.evaluate(
      ([id, v]) => {
        const el = document.getElementById(id as string) as HTMLInputElement;
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      [`s${i}`, value],
    );
  }
}

test.describe('Combo streak banner', () => {
  test('one S+ launch does NOT show streak banner', async ({ page }) => {
    await loadApp(page);
    await setAll(page, 10); // S+
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    await expect(page.locator('#comboBanner')).toBeHidden();
  });

  test('three S+ in a row shows the streak banner with count 3', async ({
    page,
  }) => {
    await loadApp(page);
    await setAll(page, 10); // S+
    for (let i = 0; i < 3; i++) {
      await page.click('#launchBtn');
      await page.waitForSelector('#results', { state: 'visible' });
    }
    const banner = page.locator('#comboBanner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/3/);
    await expect(banner).toContainText(/streak/i);
  });

  test('low grade after streak hides banner and resets count', async ({
    page,
  }) => {
    await loadApp(page);
    await setAll(page, 10); // S+
    for (let i = 0; i < 3; i++) {
      await page.click('#launchBtn');
      await page.waitForSelector('#results', { state: 'visible' });
    }
    await expect(page.locator('#comboBanner')).toBeVisible();

    await setAll(page, 1); // F-
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    await expect(page.locator('#comboBanner')).toBeHidden();
  });
});
