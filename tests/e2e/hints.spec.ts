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

test('axis hints show 🎯 for matching sliders after launch', async ({ page }) => {
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

  for (let i = 1; i <= 6; i++) {
    const dir = await page.locator(`#hint${i}`).getAttribute('data-dir');
    expect(dir).toBe('ok');
  }
});

test('axis hint shows ⬇️ when slider is too high relative to target', async ({ page }) => {
  await loadApp(page);
  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  // Pick the first slider whose target is ≤ 7 so we can push it higher.
  let idx = profile.findIndex((v) => v <= 7);
  if (idx === -1) idx = 0;

  // Match all sliders, then push the chosen slider hard up.
  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, i === idx ? 10 : profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(80);

  const dir = await page.locator(`#hint${idx + 1}`).getAttribute('data-dir');
  expect(dir).toBe('down');
});

test('changing a slider clears its hint until next launch', async ({ page }) => {
  await loadApp(page);
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  // After launch, hints exist (may be ok / up / down based on default 5,5,5...)
  const before = await page.locator('#hint1').textContent();
  expect((before ?? '').length).toBeGreaterThan(0);

  // Change the slider.
  await page.locator('#s1').evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const after = await page.locator('#hint1').textContent();
  expect(after).toBe('');
});
