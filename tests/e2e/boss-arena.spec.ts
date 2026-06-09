import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

/** 12 stub recipes — Boss 1 (Granny's Family Reunion) unlocks at 10. */
const BOSS1_RECIPES = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);

async function openBoss1Arena(page: import('@playwright/test').Page): Promise<void> {
  await page.click('#notebookBtn');
  await page.locator('.boss-card[data-boss="granny-family-reunion"] .boss-fight-btn').click();
  await expect(page.locator('#arenaOverlay')).toBeVisible();
}

test('Boss arena overlay is hidden by default', async ({ page }) => {
  await loadStory(page);
  await expect(page.locator('#arenaOverlay')).toBeHidden();
});

test('Opening the notebook reveals a Bosses section with 5 boss cards', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#bossList')).toBeVisible();
  await expect(page.locator('.boss-card')).toHaveCount(5);
});

test('Locked bosses show the unlock requirement and a disabled Fight button', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  // On a fresh save, Boss 1 (Granny) requires 10 recipes — locked.
  const card = page.locator('.boss-card[data-boss="granny-family-reunion"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.boss-fight-btn')).toHaveAttribute('aria-disabled', 'true');
  await expect(card).toContainText(/10 recipes/i);
});

test('Boss 1 unlocks after discovering 10 recipes', async ({ page }) => {
  await loadStory(page, { recipes: BOSS1_RECIPES });
  await page.click('#notebookBtn');
  const card = page.locator('.boss-card[data-boss="granny-family-reunion"]');
  await expect(card.locator('.boss-fight-btn')).not.toHaveAttribute('aria-disabled', 'true');
});

test('Clicking Fight on an unlocked boss opens the arena overlay', async ({ page }) => {
  await loadStory(page, { recipes: BOSS1_RECIPES });
  await openBoss1Arena(page);
  // Boss name + emoji visible.
  await expect(page.locator('#arenaBossName')).toContainText(/Granny/);
});

test('Arena Close button forfeits and returns to Story shell', async ({ page }) => {
  await loadStory(page, { recipes: BOSS1_RECIPES });
  await openBoss1Arena(page);
  await page.click('#arenaCloseBtn');
  await expect(page.locator('#arenaOverlay')).toBeHidden();
});

test('When arena active, daily audience portrait is hidden but plate+pantry remain visible', async ({ page }) => {
  await loadStory(page, { recipes: BOSS1_RECIPES });
  await openBoss1Arena(page);
  // Audience-wrap hidden via the body[data-arena-active] CSS.
  await expect(page.locator('.audience-wrap')).toBeHidden();
  // Plate + pantry + launch still visible underneath.
  await expect(page.locator('#plateSlot1')).toBeVisible();
  await expect(page.locator('#pantryGrid')).toBeVisible();
  await expect(page.locator('#storyLaunchBtn')).toBeVisible();
});

/**
 * Deterministic VICTORY. Boss 1 is the intersection puzzle: ONE launch must
 * score ≥50% vs granny-edna AND baby-shower AND kindergarten simultaneously.
 * broccoli+asparagus was brute-forced against the REAL pipeline
 * (computeFartFromPlate → Backyard area modifiers → evaluateMatch, tap
 * quality 1.0) and lands 67/64/66 — a comfortable, fully deterministic win
 * (no buffs/mastery/legendary on a fresh save; none of the three audiences
 * has restrictions; the encounter rotation does not affect arena scoring).
 */
test('Launch routes to arena: deterministic VICTORY unlocks the reward food + persists the defeat', async ({ page }) => {
  await loadStory(page, {
    recipes: BOSS1_RECIPES,
    pantry: ['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage', 'broccoli', 'asparagus'],
  });
  await openBoss1Arena(page);

  await page.locator('.food-card-clickable[data-food="broccoli"]').click();
  await page.locator('.food-card-clickable[data-food="asparagus"]').click();
  await page.click('#storyLaunchBtn');

  // Victory panel renders with the legendary reward (boss-arena.ts shows the
  // reward FOOD ID on a first win).
  const result = page.locator('#arenaResult');
  await expect(result).toBeVisible();
  await expect(result.locator('.arena-victory')).toBeVisible();
  await expect(result).toContainText(/VICTORY/);
  await expect(result).toContainText('mystery-casserole');

  // Reward food granted to the pantry + the win persisted.
  const pantry = await page.evaluate(() => localStorage.getItem('fart_pantry'));
  expect(pantry).toContain('mystery-casserole');
  const defeated = await page.evaluate(() => localStorage.getItem('fart_bosses_defeated'));
  expect(defeated).toContain('granny-family-reunion');
});

/**
 * Deterministic DEFEAT companion. beans+hot-pepper scores 22/21/28 against
 * the three family audiences (same brute-force, same pipeline) — far below
 * the 50% pass line, and Boss 1 only grants one round.
 */
test('Deterministic DEFEAT: arena shows the defeat result and sets the boss cooldown', async ({ page }) => {
  await loadStory(page, {
    recipes: BOSS1_RECIPES,
    pantry: ['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage', 'hot-pepper'],
  });
  await openBoss1Arena(page);

  await page.locator('.food-card-clickable[data-food="beans"]').click();
  await page.locator('.food-card-clickable[data-food="hot-pepper"]').click();
  await page.click('#storyLaunchBtn');

  // The defeat panel renders asynchronously (dynamic imports) — wait for it.
  const result = page.locator('#arenaResult');
  await expect(result.locator('.arena-defeat')).toBeVisible();
  await expect(result).toContainText(/Cool off/i);

  // Cooldown persisted (3 performances) and the boss is NOT marked defeated.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('fart_boss_cooldown_granny-family-reunion')))
    .toBe('3');
  const defeated = await page.evaluate(() => localStorage.getItem('fart_bosses_defeated'));
  expect(defeated ?? '').not.toContain('granny-family-reunion');
});
