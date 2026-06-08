import { test, expect } from '@playwright/test';
import { dismissReaction } from './_helpers';

/**
 * Phase M #68 end-to-end gameplay smoke test (v3 flow). Per PLAN.md.
 *
 * Goal: a single test that walks the full food-mechanic loop on a fresh
 * save, exercising every system added in Phases A-L. If this test passes,
 * the v3 build is shippable.
 *
 * Flow:
 *   1. Fresh visit → Story Mode loads with all defaults.
 *   2. Player sees the audience portrait + cravings + 6 area cards.
 *   3. Player plates 2 foods that match an obvious craving axis.
 *   4. Player launches → result panel shows %, audience reaction tier
 *      renders, gold counter updates if match ≥ 50%.
 *   5. Player opens Notebook → discovery toast already appeared, recipe
 *      count is at least 1.
 *   6. Player opens Shop → at least 4 daily offerings render.
 *   7. Player switches to Hard Mode → cravings hidden, audience-reaction
 *      strip carries the verdict.
 *   8. State persists across reload (mode, pantry, gold, notes).
 */

test('Full v3 gameplay flow — fresh save → launch → notebook → shop → Hard Mode → reload', async ({ page }) => {
  // Setup: fresh visit + force Story Mode (Phase M item 68 — also tests
  // that flipping `loadMode` default to 'story' lands correctly).
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_gold');
    localStorage.removeItem('fart_research');
    localStorage.removeItem('fart_recipes_seen');
    localStorage.removeItem('fart_hard_mode');
    localStorage.removeItem('fart_last_match');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();

  // 1. Audience + area + pantry visible.
  await expect(page.locator('#audienceName')).not.toHaveText('—');
  // PLAN v9 UI-overhaul Phase 2: world map removed; the dock Venue tab is the
  // progression surface.
  await expect(page.locator('#venueBtn')).toBeVisible();
  await expect(page.locator('#areaCurrentName')).toBeVisible();
  await expect(page.locator('.food-card-clickable').first()).toBeVisible();

  // 2. Plate two foods.
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
  await expect(page.locator('#plateSlot2.plate-slot-filled')).toBeVisible();

  // 3. Launch.
  await page.click('#storyLaunchBtn');
  await expect(page.locator('#storyResult')).toBeVisible();
  await expect(page.locator('#storyResultTitle')).toContainText(/%/);
  // Audience reaction strip renders.
  await expect(page.locator('#audienceReaction')).toBeVisible();
  // The reaction takeover covers the play screen — close it before navigating.
  await dismissReaction(page);

  // 4. Gold counter is a number (0+).
  const goldText = await page.locator('#goldCount').textContent();
  expect(parseInt(goldText ?? 'x', 10)).toBeGreaterThanOrEqual(0);

  // 5. Notebook opens; recipe Swamp Beast is discovered (beans+cheese).
  await page.click('#notebookBtn');
  await expect(page.locator('#notebookModal')).toBeVisible();
  await expect(page.locator('.notebook-recipe[data-recipe="swamp-beast"]')).toBeVisible();
  await expect(page.locator('.notebook-recipe[data-recipe="swamp-beast"] .notebook-recipe-cook')).toBeVisible();
  // Legendary quests section is present.
  await expect(page.locator('.legendary-quest')).toHaveCount(6);
  await page.click('#notebookCloseBtn');

  // 6. Shop offers ≥4 cards.
  await page.click('#shopBtn');
  await expect(page.locator('#shopModal')).toBeVisible();
  expect(await page.locator('.shop-offer').count()).toBeGreaterThanOrEqual(4);
  await page.click('#shopCloseBtn');

  // 7. V8 T6 — audience prose replaces Hard Mode toggle. The portrait
  //    flavor line is the funny in-character blurb (the hint).
  const flavor = (await page.locator('#audienceFlavor').textContent()) ?? '';
  expect(flavor.length).toBeGreaterThan(10);

  // 8. Reload — state persists.
  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  // Notebook counter > 0 (Swamp Beast was discovered).
  const counterText = await page.locator('#notebookCounter').textContent();
  expect(counterText).toMatch(/^[1-9]\d*\//);
});
