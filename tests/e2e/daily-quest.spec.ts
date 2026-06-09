import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

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

test('MUTATED quest progress persists across reload', async ({ page }) => {
  // The quest steps themselves are deterministically date-seeded, so simply
  // comparing labels before/after a reload would pass even WITHOUT any
  // persistence (the same date regenerates the same quest). Instead, mutate
  // the stored progress — something regeneration would reset to 0 — and
  // assert the mutation survives the reload.
  await loadStory(page);
  await expect(page.locator('.daily-quest-step')).toHaveCount(3);
  const mutated = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('fart_daily_quest_'));
    if (!key) return null;
    const quest = JSON.parse(localStorage.getItem(key)!);
    quest.steps[0].progress = quest.steps[0].target; // mark step 1 as done
    localStorage.setItem(key, JSON.stringify(quest));
    return { target: quest.steps[0].target as number };
  });
  expect(mutated).not.toBeNull();
  await page.reload();
  // Step 1 renders DONE from the persisted (mutated) quest — a freshly
  // regenerated quest would show 0 progress and no done state.
  const firstStep = page.locator('.daily-quest-step').first();
  await expect(firstStep).toHaveClass(/daily-quest-step-done/);
  await expect(firstStep.locator('.daily-quest-progress')).toHaveText(
    `${mutated!.target}/${mutated!.target}`,
  );
  // The remaining steps are still pending (no blanket done state).
  await expect(page.locator('.daily-quest-step-done')).toHaveCount(1);
});
