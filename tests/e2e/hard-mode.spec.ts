import { test, expect } from '@playwright/test';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.removeItem('fart_hard_mode');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_best_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Hard Mode button toggles label + aria-pressed and persists across reload', async ({ page }) => {
  await loadApp(page);
  const btn = page.locator('#hardModeBtn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(btn).toHaveText(/🧠 Hard$/);

  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(btn).toHaveText(/Hard ON/);

  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  await expect(page.locator('#hardModeBtn')).toHaveAttribute('aria-pressed', 'true');
});

test('Hard Mode hides hint, hides per-axis arrows, hides match%, shows audience reaction', async ({ page }) => {
  await loadApp(page);
  await page.click('#hardModeBtn');
  await page.waitForTimeout(50);

  // Descriptive hint hidden.
  await expect(page.locator('#challengeHint')).toBeHidden();
  // Match% panel hidden after launch (Hard Mode).
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  await expect(page.locator('#challengeMatch')).toBeHidden();
  // Audience strip visible with non-empty tier text.
  await expect(page.locator('#audience')).toBeVisible();
  const tierText = await page.locator('#audienceTier').textContent();
  expect((tierText ?? '').length).toBeGreaterThan(0);
  // Per-axis hint slots are empty (no arrow emoji).
  for (let i = 1; i <= 6; i++) {
    const hint = await page.locator(`#hint${i}`).textContent();
    expect((hint ?? '').trim()).toBe('');
  }
});

test('Hard Mode trend indicator reads warmer / colder across launches', async ({ page }) => {
  await loadApp(page);
  await page.click('#hardModeBtn');
  await page.waitForTimeout(50);

  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  // Launch 1 with defaults (5,5,5,5,5,5).
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  const trend1 = (await page.locator('#audienceTrend').textContent()) ?? '';
  expect(trend1.trim()).toBe(''); // 'first' resolves to empty trend string

  // Launch 2 with sliders matching the target → match% strictly higher.
  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  const trend2 = (await page.locator('#audienceTrend').textContent()) ?? '';
  expect(trend2).toMatch(/warmer/);
});

test('Easy mode (default) still shows match% and per-axis arrows', async ({ page }) => {
  await loadApp(page);
  // Don't click Hard Mode — defaults should be Easy.
  await page.click('#launchBtn');
  await page.waitForTimeout(80);
  await expect(page.locator('#challengeMatch')).toBeVisible();
  // At least one hint should have a non-empty value.
  let anyHint = '';
  for (let i = 1; i <= 6; i++) {
    const t = await page.locator(`#hint${i}`).textContent();
    if (t && t.trim().length > 0) anyHint = t;
  }
  expect(anyHint.length).toBeGreaterThan(0);
  // Audience strip stays hidden in Easy mode.
  await expect(page.locator('#audience')).toBeHidden();
});
