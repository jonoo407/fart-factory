import { test, expect, type Page } from '@playwright/test';
import { loadStory, dismissReaction } from './_helpers';

async function loadApp(page: Page): Promise<void> {
  await loadStory(page);
}

test('mute button opens audio popover; muting via popover persists across reload', async ({ page }) => {
  await loadApp(page);
  const muteBtn = page.locator('#muteBtn');
  await expect(muteBtn).toBeVisible();
  await expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
  await muteBtn.click();
  await expect(page.locator('#audioPopover')).toBeVisible();
  // Click "Mute everything" inside the popover.
  await page.locator('#audioMuteAllBtn').click();
  await expect(muteBtn).toHaveAttribute('aria-pressed', 'true');

  await page.reload(); // fart_onboarding_seen persists from the initial seed
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
});

test('muting via popover suspends AudioContext after a story launch', async ({ page }) => {
  await loadApp(page);
  await page.locator('.food-card-clickable').first().click();
  await page.click('#storyLaunchBtn');
  const stateAfterLaunch = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'unknown';
  });
  expect(['running', 'suspended']).toContain(stateAfterLaunch);

  // The reaction takeover covers the top bar — close it to reach #muteBtn.
  await dismissReaction(page);
  await page.click('#muteBtn');
  await page.locator('#audioMuteAllBtn').click();
  // AudioContext.suspend() resolves asynchronously — poll the state instead
  // of sleeping a fixed amount.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as { __audioCtxState?: () => string };
        return w.__audioCtxState ? w.__audioCtxState() : 'unknown';
      }),
    )
    .toBe('suspended');
});

test('per-channel sliders persist; Master drives the muted state (4-channel model)', async ({ page }) => {
  await loadApp(page);
  await page.click('#muteBtn');
  const setChannel = (ch: string, val: string) =>
    page.evaluate(
      ([c, v]) => {
        const s = document.querySelector(`#audioPopover input[data-channel="${c}"]`) as HTMLInputElement;
        s.value = v;
        s.dispatchEvent(new Event('input', { bubbles: true }));
      },
      [ch, val],
    );
  // Farts → 0: overall NOT muted (Master still 100).
  await setChannel('farts', '0');
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'false');
  // Master → 0: now overall muted.
  await setChannel('master', '0');
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
  // Reload — settings persist.
  await page.reload();
  const stored = await page.evaluate(() => localStorage.getItem('fart_audio_channels'));
  expect(stored).toContain('"farts":0');
  expect(stored).toContain('"master":0');
});
