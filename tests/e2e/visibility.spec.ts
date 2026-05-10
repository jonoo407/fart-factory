import { test, expect } from '@playwright/test';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
  });
  await page.reload();
}

test('visibilitychange to hidden suspends AudioContext', async ({ page }) => {
  await loadApp(page);
  await page.click('#launchBtn');
  // ctx now exists. Confirm running (or suspended pending autoplay).
  const before = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(['running', 'suspended']).toContain(before);

  // Simulate the tab going hidden by dispatching the visibilitychange event
  // with document.hidden=true. CDP page.emulateMedia doesn't drive this; we
  // override the property and dispatch the event the app listens for.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(100);

  const afterHidden = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(afterHidden).toBe('suspended');
});

test('visibilitychange back to visible resumes AudioContext (when not muted)', async ({ page }) => {
  await loadApp(page);
  await page.click('#launchBtn');

  // Hide
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(80);

  // Show
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(80);

  const afterVisible = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(afterVisible).toBe('running');
});
