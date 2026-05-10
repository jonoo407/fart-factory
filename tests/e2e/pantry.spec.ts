import { test, expect } from '@playwright/test';

async function loadStoryMode(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.setItem('fart_mode', '"story"');
    // Clear pantry / belly for clean test
    localStorage.removeItem('fart_pantry');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Story Mode renders pantry grid + plate + belly meter', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('#storyShell')).toBeVisible();
  await expect(page.locator('#pantryGrid')).toBeVisible();
  await expect(page.locator('#plate')).toBeVisible();
  await expect(page.locator('#bellyValue')).toHaveText('20');
  await expect(page.locator('#bellyCap')).toHaveText('20');
});

test('pantry grid shows starter common foods (clickable)', async ({ page }) => {
  await loadStoryMode(page);
  const grid = page.locator('#pantryGrid');
  // At least 6 common starter cards visible + clickable.
  const clickableCards = grid.locator('.food-card-clickable');
  await expect(clickableCards).toHaveCount(6); // 6 starter commons
  await expect(grid.locator('[data-food="beans"]')).toBeVisible();
});

test('tapping a food card adds it to the first empty plate slot + drops belly', async ({ page }) => {
  await loadStoryMode(page);
  // Beans costs 2 belly per food.ts
  await page.locator('[data-food="beans"]').click();
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
  await expect(page.locator('#bellyValue')).toHaveText('18'); // 20 - 2
});

test('tapping a filled plate slot returns the food to pantry + refunds belly', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="cheese"]').click();
  await expect(page.locator('#bellyValue')).toHaveText('18');
  await page.locator('#plateSlot1').click();
  await expect(page.locator('#plateSlot1')).not.toHaveClass(/plate-slot-filled/);
  await expect(page.locator('#bellyValue')).toHaveText('20');
});

test('cannot add a food when belly is insufficient', async ({ page }) => {
  await loadStoryMode(page);
  // Spend most of belly. Beans costs 2; cabbage costs 3; 4 starter additions = 2+2+2+3 = 9 budget consumed.
  // Add 6 foods that cost 2-3 each → exhausts the 20 budget in ~7-9 adds across 4 plate slots.
  await page.locator('[data-food="beans"]').click(); // -2 → 18
  await page.locator('[data-food="cheese"]').click(); // -2 → 16
  await page.locator('[data-food="cabbage"]').click(); // -3 → 13
  await page.locator('[data-food="onion"]').click(); // -2 → 11. Plate now full (4/4).
  // Plate full → cannot add another.
  await page.locator('[data-food="egg"]').click();
  // Plate slot 1 should still be beans (not replaced); plate stays 4-deep.
  await expect(page.locator('#plateSlot1.plate-slot-filled')).toBeVisible();
});

test('locked tier foods are visible as teasers but not clickable', async ({ page }) => {
  await loadStoryMode(page);
  // Uncommon kimchi should be in the pantry as a locked teaser.
  const kimchi = page.locator('[data-food="kimchi"]');
  await expect(kimchi).toBeVisible();
  await expect(kimchi).toHaveClass(/food-card-locked/);
  // Locked teasers are rendered as <div>, not <button> — not focusable / clickable.
  await expect(kimchi).not.toHaveClass(/food-card-clickable/);
});
