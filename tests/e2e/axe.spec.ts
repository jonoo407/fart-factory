import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();
import AxeBuilder from '@axe-core/playwright';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  // Settle any onboarding/transition.
  await page.waitForLoadState('networkidle');
}

test('axe-core: zero serious or critical violations on initial render', async ({ page }) => {
  await loadApp(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (seriousOrCritical.length) {
    console.log(
      'axe violations:',
      JSON.stringify(
        seriousOrCritical.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        })),
        null,
        2,
      ),
    );
  }
  expect(seriousOrCritical).toHaveLength(0);
});

test('axe-core: zero serious or critical violations after Launch', async ({ page }) => {
  await loadApp(page);
  await page.click('#launchBtn');
  await page.waitForTimeout(300);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (seriousOrCritical.length) {
    console.log(
      'axe post-launch violations:',
      JSON.stringify(
        seriousOrCritical.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        })),
        null,
        2,
      ),
    );
  }
  expect(seriousOrCritical).toHaveLength(0);
});
