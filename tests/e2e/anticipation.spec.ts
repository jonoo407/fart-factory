import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
  });
  await page.reload();
}

test('Launch schedules an anticipation cue before the main fart', async ({ page }) => {
  await loadApp(page);
  await page.click('#launchBtn');
  await page.waitForTimeout(80);

  const schedule = (await page.evaluate(() => {
    const w = window as unknown as { __lastFartSchedule?: () => unknown };
    return w.__lastFartSchedule ? w.__lastFartSchedule() : null;
  })) as null | { cuePresent: boolean; cueDurationMs: number; mainStartOffsetMs: number };

  expect(schedule).not.toBeNull();
  expect(schedule!.cuePresent).toBe(true);
  // 100-250ms cue with the main fart starting 150-300ms after the click
  expect(schedule!.cueDurationMs).toBeGreaterThanOrEqual(100);
  expect(schedule!.cueDurationMs).toBeLessThanOrEqual(250);
  expect(schedule!.mainStartOffsetMs).toBeGreaterThanOrEqual(150);
  expect(schedule!.mainStartOffsetMs).toBeLessThanOrEqual(300);
});
