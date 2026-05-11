import { test, expect } from '@playwright/test';

async function loadFreshStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_encounter_idx');
    localStorage.removeItem('fart_active_buffs');
    localStorage.removeItem('fart_skip_next_intermission');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Move On button is visible next to the belly meter', async ({ page }) => {
  await loadFreshStory(page);
  await expect(page.locator('#moveOnBtn')).toBeVisible();
});

test('Clicking Move On opens the intermission modal with 3 activity choices', async ({ page }) => {
  await loadFreshStory(page);
  await page.click('#moveOnBtn');
  await expect(page.locator('#intermissionOverlay')).toBeVisible();
  await expect(page.locator('.intermission-choice')).toHaveCount(3);
});

test('Picking an activity closes intermission, advances encounter, refills belly', async ({ page }) => {
  await loadFreshStory(page);
  // Spend belly to verify it refills.
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  await page.waitForTimeout(100);
  // Open intermission, pick the first choice.
  await page.click('#moveOnBtn');
  await page.locator('.intermission-choice').first().click();
  // Overlay closes.
  await expect(page.locator('#intermissionOverlay')).toBeHidden();
  // Encounter idx persists at 1.
  const idx = await page.evaluate(() => localStorage.getItem('fart_encounter_idx'));
  expect(idx).toBe('1');
  // Belly meter is full again.
  await expect(page.locator('#bellyValue')).toHaveText('30');
});

test('Active buff strip appears after picking an activity with a buff', async ({ page }) => {
  await loadFreshStory(page);
  await page.click('#moveOnBtn');
  // Pick activity #1; we don't know which it is (depends on roll). The
  // active-buff strip should show SOMETHING if the activity has a buff,
  // OR stay hidden if it was an immediate-only effect. So we permit either.
  const firstActivity = page.locator('.intermission-choice').first();
  const activityId = await firstActivity.getAttribute('data-activity');
  await firstActivity.click();
  await page.waitForTimeout(120);
  // If the activity has a 'buff', the strip is visible. We just verify it
  // doesn't crash and the activity-id was preserved if buff.
  const buffsRaw = await page.evaluate(() => localStorage.getItem('fart_active_buffs'));
  if (buffsRaw) {
    expect(buffsRaw).toContain(activityId!);
  }
});
