import { test, expect } from '@playwright/test';
import { TUTORIAL_STEPS } from '../../src/ui/onboarding';

/**
 * The TRUE first-launch path: no seeded flags at all (every other spec seeds
 * fart_onboarding_seen to skip this). A brand-new player must see the
 * tutorial cards, be able to click through all of them, land on a usable
 * plate screen, and never see the tutorial again after a reload.
 */

test('first run shows the tutorial; clicking through lands on a usable plate screen; reload skips it', async ({ page }) => {
  // Fresh browser context + NO localStorage seeding = a brand-new player.
  await page.goto('/');

  const overlay = page.locator('.onboarding');
  await expect(overlay).toBeVisible();

  // Card 1 — content comes from the real TUTORIAL_STEPS catalog.
  await expect(overlay.locator('.onboarding-title')).toHaveText(TUTORIAL_STEPS[0].title);
  // One progress dot per step.
  await expect(overlay.locator('.onboarding-step-indicator i')).toHaveCount(TUTORIAL_STEPS.length);

  // Click through every card; the last card's button reads "Let's go!".
  const next = page.locator('#onboardingNext');
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    await expect(overlay.locator('.onboarding-title')).toHaveText(TUTORIAL_STEPS[i].title);
    if (i === TUTORIAL_STEPS.length - 1) {
      await expect(next).toContainText(/Let's go/);
    } else {
      await expect(next).toContainText('Next');
    }
    await next.click();
  }
  await expect(page.locator('.onboarding')).toHaveCount(0);

  // The seen flag persisted.
  const seen = await page.evaluate(() => localStorage.getItem('fart_onboarding_seen'));
  expect(seen).toBe('true');

  // The plate screen is usable: plate a starter food.
  await page.locator('[data-food="beans"]').click();
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();

  // A reload no longer shows the onboarding.
  await page.reload();
  await expect(page.locator('#pantryGrid')).toBeVisible();
  await expect(page.locator('.onboarding')).toHaveCount(0);
});

test('Skip closes the tutorial immediately and marks it seen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.onboarding')).toBeVisible();
  await page.locator('#onboardingSkip').click();
  await expect(page.locator('.onboarding')).toHaveCount(0);
  const seen = await page.evaluate(() => localStorage.getItem('fart_onboarding_seen'));
  expect(seen).toBe('true');
});
