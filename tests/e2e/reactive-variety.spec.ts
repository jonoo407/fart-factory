import { test, expect } from '@playwright/test';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_best_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('100% match adds match-tier-2 class to challenge card', async ({ page }) => {
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
  await page.waitForTimeout(50);
  await expect(page.locator('#challengeCard')).toHaveClass(/match-tier-2/);
});

test('low match does NOT add a match-tier class', async ({ page }) => {
  await loadApp(page);
  // Default sliders (5,5,5,5,5,5) usually produce a moderate match —
  // certainly under 90% for most challenges. Just launch as-is.
  await page.click('#launchBtn');
  await page.waitForTimeout(50);
  const cls = (await page.locator('#challengeCard').getAttribute('class')) ?? '';
  expect(cls).not.toContain('match-tier-1');
  expect(cls).not.toContain('match-tier-2');
});
