import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

async function loadStoryMode(page: import('@playwright/test').Page) {
  await loadStory(page);
}

test('Plate slot gets the plate-pop animation class after adding a food (item 67)', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  // After click, slot 1 should have the pop animation class briefly.
  await expect(page.locator('#plateSlot1.plate-slot-popping')).toBeVisible({ timeout: 500 });
});

test('Belly meter gets the .belly-deplete class on add (item 66)', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await expect(page.locator('.belly-track.belly-deplete')).toBeVisible({ timeout: 500 });
});

test('Audience portrait has idle-wobble animation class always present (item 65)', async ({ page }) => {
  await loadStoryMode(page);
  await expect(page.locator('.audience-portrait')).toHaveClass(/audience-portrait-idle/);
});

test('Audience portrait switches to reaction-face class after a launch (item 65)', async ({ page }) => {
  await loadStoryMode(page);
  await page.locator('[data-food="beans"]').click();
  await page.click('#storyLaunchBtn');
  // Should have one of the reaction classes (e.g. audience-portrait-loved/liked/meh/disliked/evacuated).
  const cls = await page.locator('.audience-portrait').getAttribute('class');
  expect(cls).toMatch(/audience-portrait-(loved|liked|meh|disliked|evacuated)/);
});

test('Legendary food cards have rarity-legendary class for the glow (item 64)', async ({ page }) => {
  // Force unlock a legendary food.
  await loadStory(page, {
    pantry: ['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage', 'forbidden-burrito'],
  });
  const legendaryCard = page.locator('.food-card[data-food="forbidden-burrito"]');
  await expect(legendaryCard).toHaveClass(/rarity-legendary/);
});

test('reduce-motion media query disables animations (item 64-67 — accessibility)', async ({ page }) => {
  // Emulate reduce-motion preference.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadStoryMode(page);
  // The audience-portrait should still render but its animation should be 'none' via CSS.
  const animation = await page.locator('.audience-portrait').evaluate((el) => {
    return window.getComputedStyle(el).animationName;
  });
  expect(animation).toBe('none');
});
