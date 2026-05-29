import { test, expect, type Page } from '@playwright/test';

interface FeatureIntroOpts {
  id: string;
  emoji: string;
  title: string;
  body: string;
  cta?: string;
}

async function loadStory(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
  });
  await page.reload();
}

async function callIntro(page: Page, opts: FeatureIntroOpts): Promise<void> {
  await page.evaluate((o) => {
    const w = window as unknown as { __showFeatureIntro?: (opts: FeatureIntroOpts) => void };
    w.__showFeatureIntro?.(o);
  }, opts);
}

test('feature-intro is a no-op when already seen', async ({ page }) => {
  await loadStory(page);
  await page.evaluate(() => localStorage.setItem('fart_intro_seen_kitchen', 'true'));
  await callIntro(page, { id: 'kitchen', emoji: '🍳', title: 'X', body: 'X' });
  await expect(page.locator('.feature-intro')).toHaveCount(0);
});

test('feature-intro mounts on first call + persists seen flag + does not re-mount', async ({ page }) => {
  await loadStory(page);
  await callIntro(page, { id: 'boss', emoji: '⚔', title: 'Boss intro', body: 'Bring it.' });
  const intro = page.locator('.feature-intro');
  await expect(intro).toBeVisible();
  await expect(intro.locator('.feature-intro-title')).toHaveText('Boss intro');
  const seen = await page.evaluate(() => localStorage.getItem('fart_intro_seen_boss'));
  expect(seen).toBe('true');
  await page.locator('.feature-intro-close').click();
  await callIntro(page, { id: 'boss', emoji: '⚔', title: 'Boss intro', body: 'Bring it.' });
  await expect(page.locator('.feature-intro')).toHaveCount(0);
});

test('clicking the backdrop closes the intro', async ({ page }) => {
  await loadStory(page);
  await callIntro(page, { id: 'codex', emoji: '📜', title: 'T', body: 'B' });
  await expect(page.locator('.feature-intro')).toBeVisible();
  await page.locator('.feature-intro').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.feature-intro')).toHaveCount(0);
});
