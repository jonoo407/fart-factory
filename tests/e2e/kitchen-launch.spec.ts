import { test, expect } from '@playwright/test';

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.setItem('fart_mode', '"story"');
    localStorage.setItem('fart_kitchen_mode', 'true');
    localStorage.removeItem('fart_pantry');
    localStorage.removeItem('fart_plate_treatments');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Send to Performance persists treatments to localStorage (P1 plumbing)', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').click();
  await page.locator('#prepSlot1 .prep-treatment-select').selectOption('roast');
  await page.click('#kitchenSendBtn');
  const stored = await page.evaluate(() => localStorage.getItem('fart_plate_treatments'));
  expect(stored).toBe('["roast"]');
});

test('Launch consumes the treatments (cleared after launch)', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').click();
  await page.locator('#prepSlot1 .prep-treatment-select').selectOption('roast');
  await page.click('#kitchenSendBtn');
  // Pre-launch: treatments stored.
  const before = await page.evaluate(() => localStorage.getItem('fart_plate_treatments'));
  expect(before).toBe('["roast"]');
  // Launch.
  await page.click('#storyLaunchBtn');
  // Post-launch: cleared.
  const after = await page.evaluate(() => localStorage.getItem('fart_plate_treatments'));
  expect(after).toBeNull();
});

test('Opposing treatments produce different match scores (P1 regression)', async ({ page }) => {
  // Use Ferment (+stink:+2 +musical:+1 +length:+1) vs. Chill (-wet:-1 -temp:-1
  // +loud:+1) — they push different axes. With a plate of beans+cheese,
  // these two treatments should produce different match percentages against
  // the same daily audience.
  await loadStory(page);
  // Ferment+Ferment.
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.locator('#prepSlot1 .prep-treatment-select').selectOption('ferment');
  await page.locator('#prepSlot2 .prep-treatment-select').selectOption('ferment');
  await page.click('#kitchenSendBtn');
  await page.click('#storyLaunchBtn');
  const fermentedText = (await page.locator('#storyResultTitle').textContent()) ?? '';
  const fermentedMatch = parseInt((fermentedText.match(/(\d+)%/) ?? ['', '0'])[1], 10);
  // Reset belly + plate-treatments + reload.
  await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
    localStorage.removeItem('fart_plate_treatments');
  });
  await page.reload();
  // Chill+Chill.
  await page.click('#kitchenBtn');
  await page.locator('[data-food="beans"]').click();
  await page.locator('[data-food="cheese"]').click();
  await page.locator('#prepSlot1 .prep-treatment-select').selectOption('chill');
  await page.locator('#prepSlot2 .prep-treatment-select').selectOption('chill');
  await page.click('#kitchenSendBtn');
  await page.click('#storyLaunchBtn');
  const chilledText = (await page.locator('#storyResultTitle').textContent()) ?? '';
  const chilledMatch = parseInt((chilledText.match(/(\d+)%/) ?? ['', '0'])[1], 10);
  // Should differ — Ferment and Chill push different axes.
  expect(fermentedMatch).not.toBe(chilledMatch);
});
