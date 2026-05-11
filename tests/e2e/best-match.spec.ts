import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    // Clear any best-match keys so each test starts at 0.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_best_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('best-today defaults to 0 and updates after a launch', async ({ page }) => {
  await loadApp(page);
  await expect(page.locator('#challengeBestPct')).toHaveText('0');

  // Match the daily target exactly → 100%.
  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  await expect(page.locator('#challengeBestPct')).toHaveText('100');
});

test('best-today only updates when a higher match is achieved', async ({ page }) => {
  await loadApp(page);
  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  // First launch: match the profile → 100%.
  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  await expect(page.locator('#challengeBestPct')).toHaveText('100');

  // Second launch: way off → low match.
  for (let i = 0; i < 6; i++) {
    const opp = profile[i] >= 6 ? 1 : 10;
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, opp);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  // Best stays at 100 — the lower match doesn't overwrite.
  await expect(page.locator('#challengeBestPct')).toHaveText('100');
});

test('best-today persists across reload', async ({ page }) => {
  await loadApp(page);
  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];
  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(80);

  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  await expect(page.locator('#challengeBestPct')).toHaveText('100');
});
