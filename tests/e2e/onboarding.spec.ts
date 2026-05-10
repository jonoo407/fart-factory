import { test, expect, type Page } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function freshLoad(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#launchBtn');
}

test.describe('Onboarding tutorial', () => {
  test('first visit shows the tutorial overlay', async ({ page }) => {
    await freshLoad(page);
    const overlay = page.locator('.onboarding');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('.onboarding-title')).toBeVisible();
    await expect(overlay.locator('.onboarding-step-indicator')).toBeVisible();
  });

  test('next button advances steps; final step closes overlay', async ({
    page,
  }) => {
    await freshLoad(page);
    const overlay = page.locator('.onboarding');
    await expect(overlay).toBeVisible();
    // step 1 → step 2
    await page.click('#onboardingNext');
    await expect(overlay.locator('.onboarding-step-indicator')).toContainText(
      /2/,
    );
    // step 2 → step 3
    await page.click('#onboardingNext');
    await expect(overlay.locator('.onboarding-step-indicator')).toContainText(
      /3/,
    );
    // step 3 → close
    await page.click('#onboardingNext');
    await expect(overlay).toBeHidden();
  });

  test('skip button closes overlay', async ({ page }) => {
    await freshLoad(page);
    const overlay = page.locator('.onboarding');
    await expect(overlay).toBeVisible();
    await page.click('#onboardingSkip');
    await expect(overlay).toBeHidden();
  });

  test('does not show on subsequent reload after dismissal', async ({
    page,
  }) => {
    await freshLoad(page);
    await page.click('#onboardingSkip');
    await page.reload();
    await page.waitForSelector('#launchBtn');
    await expect(page.locator('.onboarding')).toHaveCount(0);
  });
});
