import { test, expect } from '@playwright/test';

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.setItem('fart_kitchen_mode', 'true');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_treatment');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

async function equip(page: import('@playwright/test').Page, treatment: string) {
  await page.click('#kitchenModeToggle');
  await page.click(`.kit-treat[data-treatment="${treatment}"]`);
  await page.click('#kitchenCloseBtn');
}

test('Equipping persists the treatment to localStorage (single-equip plumbing)', async ({ page }) => {
  await loadStory(page);
  await equip(page, 'roast');
  const stored = await page.evaluate(() => localStorage.getItem('fart_treatment'));
  expect(stored).toBe('"roast"');
});

test('The equipped treatment SURVIVES a launch (persists — not consumed per-shot)', async ({ page }) => {
  await loadStory(page);
  await equip(page, 'roast');
  await page.locator('[data-food="beans"]').first().click();
  await page.click('#storyLaunchBtn');
  // Unlike the old prep model, the equipped treatment is NOT cleared by a launch.
  const after = await page.evaluate(() => localStorage.getItem('fart_treatment'));
  expect(after).toBe('"roast"');
  // And the dock stays lit.
  await expect(page.locator('#kitchenModeToggle')).toHaveClass(/hot/);
});

// NB: the deterministic proof that an equipped treatment changes the resolved
// launch props (roast↑stink, chill↑loud, etc.) lives in the unit suite
// (tests/unit/equipped-launch.test.ts), where the audience + rounding are fixed.
// An end-to-end %-comparison here is flaky (daily-audience/rounding dependent),
// so we assert the robust behaviours above instead.
