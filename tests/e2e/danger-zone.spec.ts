import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

/**
 * The Live Show — Danger Zone. Holding the BLAST button past the meter top
 * pins the sweep at 100 and enters the red OVERCHARGE phase; releasing
 * resolves the launch either as a survived overcharge (×1.0–1.5 line in the
 * breakdown) or a misfire FIZZLE. The roll is seeded, so this spec accepts
 * both outcomes — what it pins is the phase itself and that release resolves.
 */

test('holding past the top enters OVERCHARGE and the release resolves a launch', async ({ page }) => {
  // Suppress the one-time Danger Zone feature-intro so it can't cover the
  // reaction overlay assertions.
  await loadStory(page, { extraKeys: { fart_intro_seen_danger_zone: 'true' } });
  await page.locator('[data-food="beans"]').click();

  const btn = page.locator('#storyLaunchBtn');
  await btn.hover();
  await page.mouse.down();

  // The sweep takes ~0.8s to the top, then the Danger Zone takes over.
  await expect(page.locator('#chargeMeter')).toHaveClass(/overcharge/, { timeout: 10_000 });
  await expect(page.locator('#launchBig')).toHaveText('OVERCHARGE!!');
  // The meter is pinned at the top while overcharging.
  await expect(page.locator('#chargeFill')).toHaveCSS('width', /.+/); // painted
  const width = await page
    .locator('#chargeFill')
    .evaluate((el) => parseFloat((el as HTMLElement).style.width));
  expect(width).toBe(100);

  await page.mouse.up();

  // Either outcome lands in the reaction takeover: a survived overcharge
  // carries the "Overcharged!" breakdown line; a misfire shows FIZZLE!.
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  await expect(page.locator('#reactionOverlay')).toContainText(/Overcharged!|FIZZLE!/);
  // The meter fully reset either way.
  await expect(page.locator('#chargeMeter')).not.toHaveClass(/overcharge/);
  await expect(page.locator('#launchBig')).toHaveText('BLAST!');
});
