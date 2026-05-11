import { test, expect } from '@playwright/test';

/**
 * Mobile (375×667) verification of the Story Mode UI. Per PLAN_v5 P5.
 */

async function loadStory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_mode', '"story"');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_belly_')) localStorage.removeItem(k);
    }
  });
  await page.reload();
}

test('Story Mode interactive elements meet 44×44 on mobile (P5)', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-viewport-only check (375×667)');
  await loadStory(page);

  const interactiveSel = 'button:not([hidden]), [role="button"]';
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
          cls: (el as HTMLElement).className || '',
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      }),
  );
  const tooSmall = results.filter((r) => r.width < 44 || r.height < 44);
  if (tooSmall.length) {
    console.log('Story-mode touch targets below 44×44 on mobile:', JSON.stringify(tooSmall, null, 2));
  }
  expect(tooSmall).toHaveLength(0);
});

test('Progression strip wraps gracefully on narrow viewports', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-viewport-only');
  await loadStory(page);
  const strip = page.locator('.progression-strip');
  await expect(strip).toBeVisible();
  // The strip must not overflow horizontally — its scrollWidth ≤ clientWidth + 2px tolerance.
  const overflow = await strip.evaluate((el) => {
    return Math.max(0, el.scrollWidth - el.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(2);
});

test('World map pins are at least 44×44 on mobile (P5)', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-viewport-only');
  await loadStory(page);
  await page.click('#travelBtn');
  const pinResults = await page.locator('.map-pin').evaluateAll((els) =>
    els.map((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return { id: el.getAttribute('data-location') || '', width: Math.round(r.width), height: Math.round(r.height) };
    }),
  );
  const tooSmall = pinResults.filter((r) => r.width < 44 || r.height < 44);
  if (tooSmall.length) {
    console.log('Map pins below 44×44 on mobile:', JSON.stringify(tooSmall, null, 2));
  }
  expect(tooSmall).toHaveLength(0);
});
