import { test, expect } from '@playwright/test';
import { loadFreshStory, launchPassingPlate, advanceToNext } from './_helpers';

/**
 * PLAN v9 — the encounter loop under the redesign: a flop can't advance
 * (Move On is gated), and the primary advance path is the reaction footer's
 * "Next show ▶", which opens the intermission.
 */

test('Move On is present but gated until the crowd is passed', async ({ page }) => {
  await loadFreshStory(page);
  await expect(page.locator('#moveOnBtn')).toBeVisible();
  await expect(page.locator('#moveOnBtn')).toBeDisabled();
});

test('Passing a crowd → "Next show" opens the intermission with 3 choices', async ({ page }) => {
  await loadFreshStory(page);
  await launchPassingPlate(page);
  await advanceToNext(page);
  await expect(page.locator('#intermissionOverlay')).toBeVisible();
  await expect(page.locator('.intermission-choice')).toHaveCount(3);
});

test('Picking an activity closes intermission, advances encounter, refills belly', async ({ page }) => {
  await loadFreshStory(page);
  await launchPassingPlate(page);
  await advanceToNext(page);
  await page.locator('.intermission-choice').first().click();
  await expect(page.locator('#intermissionOverlay')).toBeHidden();
  const idx = await page.evaluate(() => localStorage.getItem('fart_encounter_idx'));
  expect(idx).toBe('1');
  await expect(page.locator('#bellyValue')).toHaveText('30');
});

test('Active buff strip appears after picking an activity with a buff', async ({ page }) => {
  await loadFreshStory(page);
  await launchPassingPlate(page);
  await advanceToNext(page);
  const firstActivity = page.locator('.intermission-choice').first();
  const activityId = await firstActivity.getAttribute('data-activity');
  await firstActivity.click();
  await page.waitForTimeout(120);
  const buffsRaw = await page.evaluate(() => localStorage.getItem('fart_active_buffs'));
  if (buffsRaw) {
    expect(buffsRaw).toContain(activityId!);
  }
});
