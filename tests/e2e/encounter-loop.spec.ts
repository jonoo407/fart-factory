import { test, expect } from '@playwright/test';
import { loadFreshStory, dismissOverlays, launchPassingPlate, advanceToNext } from './_helpers';

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

test('Multi-encounter: pass crowd 1 → intermission activity → encounter advances, second crowd renders', async ({ page }) => {
  await loadFreshStory(page);
  // The first crowd is always Granny Edna (encounter idx 0; the rotation is
  // AUDIENCES[idx % len] — see state/audience.ts audienceForEncounter).
  await expect(page.locator('#audienceName')).toContainText('Granny Edna');
  await launchPassingPlate(page);
  await advanceToNext(page);
  await page.locator('.intermission-choice').first().click();
  await expect(page.locator('#intermissionOverlay')).toBeHidden();
  // Encounter idx advanced + belly refilled for the fresh crowd.
  const idx = await page.evaluate(() => localStorage.getItem('fart_encounter_idx'));
  expect(idx).toBe('1');
  await expect(page.locator('#bellyValue')).toHaveText('0'); // fresh crowd → empty stomach
  // The SECOND crowd renders: idx 1 in the global rotation is the Toddler
  // Birthday Party (deterministic — no run-seed dependence in the rotation).
  await expect(page.locator('#audienceName')).toContainText('Toddler Birthday Party');
  // And the new crowd is playable: plating a food fills the plate again.
  await dismissOverlays(page); // the toddler crowd has no grant, but be safe
  await page.locator('[data-food="beans"]').click();
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
});

test('Active buff strip appears after picking an activity with a buff', async ({ page }) => {
  // loadFreshStory pins fart_run_seed=7, which makes the intermission roll
  // deterministic: encounter 0 offers fizzy-drink / stretch-routine /
  // glass-of-milk — ALL of which carry a next-launch buff (computed from the
  // real state/activities.ts + run-state.ts algorithms).
  await loadFreshStory(page);
  await launchPassingPlate(page);
  await advanceToNext(page);
  const firstActivity = page.locator('.intermission-choice').first();
  const activityId = await firstActivity.getAttribute('data-activity');
  expect(activityId).toBe('fizzy-drink');
  await firstActivity.click();
  await expect(page.locator('#intermissionOverlay')).toBeHidden();
  // UNCONDITIONAL: the buff persisted…
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('fart_active_buffs')))
    .toContain('fizzy-drink');
  // …and the active-buff strip DOM rendered it.
  await expect(page.locator('#activeBuffStrip')).toBeVisible();
  await expect(page.locator('#activeBuffStrip .active-buff-chip')).toContainText('Fizzy Drink');
});
