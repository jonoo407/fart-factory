import { test, expect, type Page } from '@playwright/test';

/**
 * Tier 4 item 16 — Achievements toast.
 *
 * On Launch, any newly-unlocked achievements should display a transient
 * toast above the main app. Each toast: emoji + name + desc, ARIA-friendly
 * role=status. Toast auto-dismisses; can be skipped on click.
 */

async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#launchBtn');
}

test.describe('Achievements toast', () => {
  test('first launch shows the "First Toot" toast', async ({ page }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    const toast = page.locator('.achievement-toast');
    await expect(toast.first()).toBeVisible({ timeout: 1500 });
    await expect(toast.first()).toContainText(/first toot/i);
    await expect(toast.first()).toHaveAttribute('role', 'status');
  });

  test('S+ launch unlocks multiple toasts (s-tier + first-toot + loud-and-proud + ...)', async ({
    page,
  }) => {
    await loadApp(page);
    for (let i = 1; i <= 6; i++) {
      await page.evaluate(
        (n) => {
          const el = document.getElementById(`s${n}`) as HTMLInputElement;
          el.value = '10';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        i,
      );
    }
    await page.click('#launchBtn');
    // Toasts stagger by 250ms; 5 unlocks → last appears ~1s after launch.
    await page.waitForFunction(
      () => document.querySelectorAll('.achievement-toast').length >= 5,
      undefined,
      { timeout: 3000 },
    );
    const count = await page.locator('.achievement-toast').count();
    // first-toot, s-tier, stink-lord, symphony, loud-and-proud
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('subsequent launches do NOT re-show "First Toot"', async ({ page }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await expect(page.locator('.achievement-toast').first()).toBeVisible({
      timeout: 1500,
    });
    // Wait for toasts to auto-dismiss
    await page.waitForFunction(
      () => document.querySelectorAll('.achievement-toast').length === 0,
      undefined,
      { timeout: 6000 },
    );
    await page.click('#launchBtn');
    // No new first-toot toast (achievement is persistent across launches)
    await page.waitForTimeout(300);
    const visible = await page
      .locator('.achievement-toast')
      .filter({ hasText: /first toot/i })
      .count();
    expect(visible).toBe(0);
  });

  test('toast does not block clicks on launch button', async ({ page }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await expect(page.locator('.achievement-toast').first()).toBeVisible({
      timeout: 1500,
    });
    // While toast is visible, the launch button must remain clickable —
    // toast must not intercept the click.
    const toastPointerEvents = await page
      .locator('.achievement-toast')
      .first()
      .evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(toastPointerEvents).toBe('none');
  });

  test('toast description text size is at least 0.9em (mobile readability)', async ({
    page,
  }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await expect(page.locator('.achievement-toast').first()).toBeVisible({
      timeout: 1500,
    });
    const fontSize = await page
      .locator('.ach-desc')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // 0.9em on 16px root = 14.4px floor
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  test('achievements persist across reload', async ({ page }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await expect(page.locator('.achievement-toast').first()).toBeVisible({
      timeout: 1500,
    });
    await page.reload();
    await page.waitForSelector('#launchBtn');
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('fart_achievements');
      return raw ? JSON.parse(raw) : null;
    });
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toContain('first-toot');
  });
});
