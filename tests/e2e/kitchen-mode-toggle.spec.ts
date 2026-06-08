import { test, expect } from '@playwright/test';

async function loadFresh(page: import('@playwright/test').Page, opts: { unlocked?: boolean } = {}) {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    if (p.unlocked) localStorage.setItem('fart_kitchen_mode', 'true');
    else localStorage.removeItem('fart_kitchen_mode');
    localStorage.removeItem('fart_pantry');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  }, { unlocked: opts.unlocked ?? false });
  await page.reload();
}

test('Kitchen dock tab is locked by default (no unlock flag)', async ({ page }) => {
  await loadFresh(page);
  const tab = page.locator('#kitchenModeToggle');
  await expect(tab).toBeVisible();
  await expect(tab).toHaveClass(/locked/);
  await expect(tab).toHaveAttribute('aria-disabled', 'true');
});

test('Clicking the locked Kitchen tab does NOT open the overlay', async ({ page }) => {
  await loadFresh(page);
  // The locked tab is aria-disabled, so a normal click is blocked by Playwright's
  // actionability check; force the click to prove the handler still no-ops.
  await page.click('#kitchenModeToggle', { force: true });
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
});

test('With kitchen mode unlocked, the dock tab is not locked', async ({ page }) => {
  await loadFresh(page, { unlocked: true });
  const tab = page.locator('#kitchenModeToggle');
  await expect(tab).not.toHaveClass(/locked/);
  await expect(tab).toHaveAttribute('aria-disabled', 'false');
});

test('With kitchen mode unlocked, clicking the tab opens (and close hides) the overlay', async ({ page }) => {
  await loadFresh(page, { unlocked: true });
  await page.click('#kitchenModeToggle');
  await expect(page.locator('#kitchenOverlay')).toBeVisible();
  await page.click('#kitchenCloseBtn');
  await expect(page.locator('#kitchenOverlay')).toBeHidden();
});
