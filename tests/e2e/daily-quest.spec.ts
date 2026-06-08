import { test, expect, type Page } from '@playwright/test';

async function loadStory(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
  });
  await page.reload();
}

test('daily-quest strip renders with 3 steps + a pending-reward chip on first load', async ({ page }) => {
  await loadStory(page);
  const strip = page.locator('#dailyQuest');
  await expect(strip).toBeVisible();
  await expect(strip.locator('.daily-quest-step')).toHaveCount(3);
  await expect(strip.locator('.daily-quest-pending')).toBeVisible();
});

test('claim button replaces pending chip once every step is done; awards gold + notes', async ({ page }) => {
  await loadStory(page);
  // Seed today's quest as already complete via localStorage.
  await page.evaluate(() => {
    const yyyy = new Date().getUTCFullYear();
    const mm = String(new Date().getUTCMonth() + 1).padStart(2, '0');
    const dd = String(new Date().getUTCDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const quest = {
      dateKey: key,
      claimed: false,
      steps: [
        { kind: 'launch-ge-75', target: 3, progress: 3, label: 'Land 3 launches at ≥75% match' },
        { kind: 'plate-rare', target: 1, progress: 1, label: 'Plate a rare-or-better food' },
        { kind: 'discover-recipe', target: 1, progress: 1, label: 'Discover a new recipe' },
      ],
    };
    localStorage.setItem(`fart_daily_quest_${key}`, JSON.stringify(quest));
    // Seed gold/notes counters to known values for the assertion below.
    localStorage.setItem('fart_gold', '0');
    localStorage.setItem('fart_research', '0');
  });
  await page.reload();
  const claim = page.locator('#dailyQuestClaimBtn');
  await expect(claim).toBeVisible();
  // The claim button has a pulse animation — click with force to avoid the
  // stability retry timing out.
  await claim.click({ force: true });
  await expect(page.locator('#goldCount')).toHaveText('25');
  await expect(page.locator('#notesCount')).toHaveText('10');
  // Button now disabled with "Claimed today".
  await expect(page.locator('.daily-quest-claim[disabled]')).toBeVisible();
});

test('quest persists across reload', async ({ page }) => {
  await loadStory(page);
  const before = await page.locator('.daily-quest-step .daily-quest-label').allTextContents();
  await page.reload();
  const after = await page.locator('.daily-quest-step .daily-quest-label').allTextContents();
  expect(after).toEqual(before);
});
