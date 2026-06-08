import type { Page } from '@playwright/test';

/**
 * Shared e2e helpers for the PLAN v9 Order Ticket flow. The redesign changed
 * the core loop (hold-to-charge BLAST → full-screen reaction takeover →
 * pass-gated advance), so specs drive it through these helpers instead of the
 * old click-launch / click-Move-On flow.
 */

/** Fresh story save, onboarding skipped, the first-encounter grant modal dismissed. */
export async function loadFreshStory(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
  });
  await page.reload();
  await dismissOverlays(page);
}

/** Dismiss any feature-intro modal (e.g. the Granny → broccoli food grant). */
export async function dismissOverlays(page: Page): Promise<void> {
  const close = page.locator('#featureIntroCloseBtn');
  for (let i = 0; i < 6; i++) {
    if ((await close.count()) > 0 && (await close.first().isVisible().catch(() => false))) {
      await close.first().click();
      await page.waitForTimeout(80);
    } else break;
  }
}

/**
 * Plate the broccoli Granny grants (it is secretly musical) twice and launch.
 * That passes Granny (~B). Leaves the reaction overlay open. A Playwright click
 * on the BLAST button generates the pointer events the charge meter needs, so
 * it resolves as a safe tap.
 */
export async function launchPassingPlate(page: Page): Promise<void> {
  // The first encounter grants broccoli AND pops a feature-intro modal. Wait for
  // the grant to land in the pantry, then dismiss the modal so the tile is
  // clickable (not covered) — both are needed to avoid a timing flake.
  const broc = page.locator('[data-food="broccoli"]').first();
  await broc.waitFor({ state: 'attached' });
  await dismissOverlays(page);
  await broc.click();
  await broc.click();
  await dismissOverlays(page);
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
}

/** From an open PASS reaction overlay, advance to the next encounter. */
export async function advanceToNext(page: Page): Promise<void> {
  await page.locator('#reactionOverlay .rxn-cta[data-action="next"]').click();
}

/**
 * Close the reaction takeover (if open) by its first footer button — retry on a
 * flop, Improve on a pass — staying on the same crowd. Specs that launch
 * repeatedly need this so the overlay stops covering the pantry.
 */
export async function dismissReaction(page: Page): Promise<void> {
  const ov = page.locator('#reactionOverlay');
  if (await ov.isVisible().catch(() => false)) {
    await ov.locator('.rxn-cta').first().click();
    await ov.waitFor({ state: 'hidden' });
  }
}

/** Launch the current plate and return the reaction grade shown on the stamp. */
export async function launchAndReadGrade(page: Page): Promise<string> {
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  return (await page.locator('#reactionOverlay .stamp .g').textContent()) ?? '';
}
