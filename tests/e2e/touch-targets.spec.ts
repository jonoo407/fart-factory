import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
}

test('every visible interactive element is at least 44×44 CSS px on mobile', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-viewport-only check (375×667)');
  await loadApp(page);

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
