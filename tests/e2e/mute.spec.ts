import { test, expect, type Page } from '@playwright/test';

async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.setItem('fart_intro_granny-edna', 'true');
    localStorage.removeItem('fart_mute');
    localStorage.removeItem('fart_audio_channels');
  });
  await page.reload();
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

  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
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

  await page.click('#muteBtn');
  await page.locator('#audioMuteAllBtn').click();
  await page.waitForTimeout(250);
  const stateAfterMute = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'unknown';
  });
  expect(stateAfterMute).toBe('suspended');
});

test('per-channel sliders persist and affect the muted state', async ({ page }) => {
  await loadApp(page);
  await page.click('#muteBtn');
  // Drag farts to 0 — overall NOT muted (sfx still 100).
  await page.evaluate(() => {
    const s = document.getElementById('audioFartsSlider') as HTMLInputElement;
    s.value = '0';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'false');
  // Drag sfx to 0 too — now overall muted.
  await page.evaluate(() => {
    const s = document.getElementById('audioSfxSlider') as HTMLInputElement;
    s.value = '0';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
  // Reload — settings persist.
  await page.reload();
  await page.evaluate(() => localStorage.setItem('fart_onboarding_seen', 'true'));
  await page.reload();
  const stored = await page.evaluate(() => localStorage.getItem('fart_audio_channels'));
  expect(stored).toContain('"farts":0');
  expect(stored).toContain('"sfx":0');
});
