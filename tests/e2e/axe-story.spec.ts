import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadStory as loadStoryBase } from './_helpers';

async function loadStory(page: import('@playwright/test').Page) {
  await loadStoryBase(page, {
    kitchen: true,
    // Stub recipes so Boss 1 is unlocked for arena coverage.
    recipes: Array.from({ length: 12 }, (_, i) => `r${i}`),
  });
  await page.waitForLoadState('networkidle');
}

test('axe-core: zero serious/critical violations in Story Mode (P13)', async ({ page }) => {
  await loadStory(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (seriousOrCritical.length) {
    console.log(
      'Story-mode axe violations:',
      JSON.stringify(seriousOrCritical.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })), null, 2),
    );
  }
  expect(seriousOrCritical).toHaveLength(0);
});

test('axe-core: Kitchen overlay open — zero serious/critical violations', async ({ page }) => {
  await loadStory(page);
  await page.click('#kitchenModeToggle');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (seriousOrCritical.length) {
    console.log(
      'Story-mode Kitchen axe violations:',
      JSON.stringify(seriousOrCritical.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })), null, 2),
    );
  }
  expect(seriousOrCritical).toHaveLength(0);
});
