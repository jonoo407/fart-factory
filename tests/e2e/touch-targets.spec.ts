import { test, expect } from '@playwright/test';
import { loadStory } from './_helpers';

test('every visible interactive element is at least 44×44 CSS px on mobile', async ({ page }) => {
  // Runs on the mobile project only (project pinning in playwright.config.ts),
  // so no runtime viewport skip is needed.
  // grannyIntroSeen: false matches the historical surface — the first-encounter
  // grant modal's buttons are part of the audited set.
  await loadStory(page, { grannyIntroSeen: false });

  const interactiveSel = 'button, [role="button"], input[type="range"], a[href]';
  const results = await page.locator(interactiveSel).evaluateAll((els) =>
    els
      .filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          r.width > 0 &&
          r.height > 0
        );
      })
      .map((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: (el as HTMLElement).id || '',
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      }),
  );

  const tooSmall = results.filter((r) => r.width < 44 || r.height < 44);
  if (tooSmall.length) {
    console.log('Touch targets below 44×44 on mobile:', JSON.stringify(tooSmall, null, 2));
  }
  expect(tooSmall).toHaveLength(0);
});
