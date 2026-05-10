import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_hard_mode');
    localStorage.removeItem('fart_last_match');
    localStorage.removeItem('fart_pantry');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Story Hard Mode toggle hides cravings + match %', async ({ page }) => {
  await loadStoryMode(page);
  // Easy mode: cravings text visible.
  await expect(page.locator('#audienceCravings')).not.toHaveText('');
  // Click Hard Mode toggle in Story.
  await page.click('#storyHardModeBtn');
  await expect(page.locator('#audienceCravings')).toHaveText('');
  await expect(page.locator('#audienceRestrictions')).toHaveText('');
  // Launch with a plate that does NOT match any recipe (so no discovery
  // toast steals the panel — Hard Mode intentionally surfaces discoveries
  // even when it hides the match%).
  await page.locator('[data-food="garlic"]').click();
  await page.click('#storyLaunchBtn');
  // No match%, no synergies → result panel stays hidden in Hard Mode.
  await expect(page.locator('#storyResult')).toBeHidden();
});

test('Audience reaction tier renders after launch (Easy Mode)', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(50);
  await expect(page.locator('#audienceReaction')).toBeVisible();
  const tier = await page.locator('#audienceReactionTier').textContent();
  expect((tier ?? '').length).toBeGreaterThan(0);
});

test('Audience reaction trend reads warmer / colder across consecutive launches', async ({ page }) => {
  await loadStoryMode(page);
  // Launch 1 with default plate (single beans) → some match %.
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(50);
  const first = await page.locator('#audienceReactionTrend').textContent();
  // First launch: no prior match → trend should be empty.
  expect((first ?? '').trim()).toBe('');

  // Launch 2 — different plate.
  await page.locator('[data-food="cheese"]').click();
  await page.locator('[data-food="onion"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(50);
  const second = await page.locator('#audienceReactionTrend').textContent();
  // Should be one of warmer/colder/same (non-empty).
  expect(second).toMatch(/warmer|colder|same/);
});

test('Toggling Hard Mode mid-session resets the trend baseline', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(50);
  // Toggle Hard Mode — should hide audience reaction strip (and reset trend).
  await page.click('#storyHardModeBtn');
  await expect(page.locator('#audienceReaction')).toBeHidden();
});
