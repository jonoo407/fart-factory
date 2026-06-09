import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('Move On button shows plain label on a fresh load', async ({ page }) => {
  await loadStory(page);
  const moveOn = page.locator('#moveOnBtn');
  await expect(moveOn).toContainText('Move On');
  await expect(moveOn).not.toHaveClass(/move-on-encore/);
});

test('After being wowed (seeded), Move On button advertises the encore bonus', async ({ page }) => {
  await loadStory(page);
  // Seed encounter progress as already wowed against today's audience.
  await page.evaluate(() => {
    // Best-effort: read the rendered audience id from the portrait section.
    const nameEl = document.getElementById('audienceName');
    const id = nameEl?.getAttribute('data-audience-id')
      ?? 'granny-edna'; // safe fallback
    localStorage.setItem(
      'fart_encounter_progress',
      JSON.stringify({
        encounterIdx: 0,
        audienceId: id,
        launches: 1,
        wowed: true,
        bestPct: 92,
      }),
    );
  });
  await page.reload();
  const moveOn = page.locator('#moveOnBtn');
  // The encore text shows the bonus amount.
  await expect(moveOn).toContainText(/Encore \+20/);
});

test('Conquests notebook section starts empty + a seeded conquest renders', async ({ page }) => {
  await loadStory(page);
  await page.click('#notebookBtn');
  await expect(page.locator('#conquestList')).toContainText('No conquests yet');
  // Close + seed a conquest.
  await page.click('#notebookCloseBtn');
  await page.evaluate(() => {
    localStorage.setItem(
      'fart_conquests',
      JSON.stringify([
        { audienceId: 'granny-edna', wowedAt: '2026-05-29T10:00:00Z', bestPct: 95, timesWowed: 2 },
      ]),
    );
  });
  await page.click('#notebookBtn');
  const row = page.locator('.conquest-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('95%');
  await expect(row).toContainText('×2');
});

test('Claiming the encore on Move On awards +20 gold + clears encounter progress', async ({ page }) => {
  await loadStory(page);
  // Seed wowed + gold counter.
  await page.evaluate(() => {
    localStorage.setItem('fart_gold', '0');
    // Read the same audience the page is using.
    const audId = document.getElementById('audienceName')?.getAttribute('data-audience-id')
      ?? 'granny-edna';
    localStorage.setItem(
      'fart_encounter_progress',
      JSON.stringify({
        encounterIdx: 0,
        audienceId: audId,
        launches: 1,
        wowed: true,
        bestPct: 90,
      }),
    );
  });
  await page.reload();
  await page.click('#moveOnBtn');
  // Intermission overlay opens; pick the first available activity.
  const firstChoice = page.locator('#intermissionChoices button').first();
  await expect(firstChoice).toBeVisible();
  await firstChoice.click();
  // Gold rose by 20 (the encore bonus).
  await expect(page.locator('#goldCount')).toHaveText('20');
  // Encounter progress was cleared.
  const cleared = await page.evaluate(() => localStorage.getItem('fart_encounter_progress'));
  expect(cleared).toBeNull();
});
