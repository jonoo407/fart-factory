import { test, expect } from '@playwright/test';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
  });
  await page.reload();
}

test('challenge card renders today\'s challenge name and hint on load', async ({ page }) => {
  await loadApp(page);
  const name = await page.locator('#challengeName').textContent();
  const hint = await page.locator('#challengeHint').textContent();
  expect(name?.trim().length ?? 0).toBeGreaterThan(0);
  expect(hint?.trim().length ?? 0).toBeGreaterThan(0);
  // Match panel hidden until first launch.
  await expect(page.locator('#challengeMatch')).toBeHidden();
});

test('match score appears after Launch and is 100 when sliders match the target', async ({
  page,
}) => {
  await loadApp(page);

  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  // Set sliders exactly to today's profile.
  for (let i = 0; i < 6; i++) {
    const id = `s${i + 1}`;
    await page.locator(`#${id}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(50);
  await expect(page.locator('#challengeMatch')).toBeVisible();
  await expect(page.locator('#challengeMatchPct')).toHaveText('100');
});

test('match score drops noticeably when sliders move away from target', async ({ page }) => {
  await loadApp(page);
  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  // First: launch with profile-matching sliders → should be 100.
  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(50);
  const matched = parseInt((await page.locator('#challengeMatchPct').textContent()) ?? '0', 10);
  expect(matched).toBe(100);

  // Then: set every slider to its furthest value within 1..10.
  for (let i = 0; i < 6; i++) {
    const opp = profile[i] >= 6 ? 1 : 10;
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, opp);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(50);
  const distant = parseInt((await page.locator('#challengeMatchPct').textContent()) ?? '100', 10);
  // Match must drop substantially from a perfect 100.
  expect(distant).toBeLessThan(matched);
  expect(distant).toBeLessThanOrEqual(60);
});
