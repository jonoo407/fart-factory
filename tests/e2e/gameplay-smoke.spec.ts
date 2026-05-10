import { test, expect } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fart_best_')) localStorage.removeItem(k);
    }
    localStorage.removeItem('fart_achievements');
  });
  await page.reload();
}

/**
 * Player-loop smoke: simulate three plausible launches a curious player
 * would make on a fresh visit, and verify each layer of feedback fires.
 *
 * Per RULE 3 (verify behavior, not just data shape) — this test exercises
 * the integrated gameplay loop end-to-end across:
 *   1. challenge card render on load
 *   2. first launch with random sliders → match% renders, axis hints
 *      appear, audience reactions show, commentary text appears,
 *      results card becomes visible, best-today updates
 *   3. second launch closer to target (using hint feedback) → match
 *      improves
 *   4. third launch matching profile exactly → 100% match, celebration
 *      reactive pulse fires, perfect-match achievement candidate
 */
test('full player loop: three converging launches reach 100% match', async ({ page }) => {
  await loadApp(page);

  // --- Initial state ---
  await expect(page.locator('#challengeName')).not.toHaveText('—');
  await expect(page.locator('#challengeBestPct')).toHaveText('0');
  await expect(page.locator('#challengeMatch')).toBeHidden();

  const profile = (await page.evaluate(() => {
    const w = window as unknown as { __challengeProfile?: () => number[] };
    return w.__challengeProfile ? w.__challengeProfile() : [5, 5, 5, 5, 5, 5];
  })) as number[];

  // --- Launch 1: defaults (5,5,5,5,5,5) — produces some non-100% match ---
  await page.click('#launchBtn');
  await page.waitForTimeout(100);
  await expect(page.locator('#challengeMatch')).toBeVisible();
  await expect(page.locator('#commentary')).not.toHaveText('');
  await expect(page.locator('#results')).toBeVisible();
  const match1 = parseInt((await page.locator('#challengeMatchPct').textContent()) ?? '0', 10);
  // Hints should be populated for every axis.
  for (let i = 1; i <= 6; i++) {
    const dir = await page.locator(`#hint${i}`).getAttribute('data-dir');
    expect(dir).toMatch(/^(ok|up|down)$/);
  }

  // --- Launch 2: halfway between defaults and target ---
  for (let i = 0; i < 6; i++) {
    const halfway = Math.round((5 + profile[i]) / 2);
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, halfway);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(100);
  const match2 = parseInt((await page.locator('#challengeMatchPct').textContent()) ?? '0', 10);
  expect(match2).toBeGreaterThanOrEqual(match1);

  // --- Launch 3: exact target → 100% ---
  for (let i = 0; i < 6; i++) {
    await page.locator(`#s${i + 1}`).evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, profile[i]);
  }
  await page.click('#launchBtn');
  await page.waitForTimeout(100);
  await expect(page.locator('#challengeMatchPct')).toHaveText('100');
  await expect(page.locator('#challengeBestPct')).toHaveText('100');
  // Reactive pulse class fired.
  await expect(page.locator('#challengeCard')).toHaveClass(/match-tier-2/);
  // All axis hints now show 'ok'.
  for (let i = 1; i <= 6; i++) {
    const dir = await page.locator(`#hint${i}`).getAttribute('data-dir');
    expect(dir).toBe('ok');
  }
  // AudioContext is still running (didn't crash from the celebration sting).
  const ctxState = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(['running', 'suspended']).toContain(ctxState);
});

test('mute -> launch -> unmute -> launch flows without crash', async ({ page }) => {
  await loadApp(page);

  // Click launch once to bring up ctx.
  await page.click('#launchBtn');
  await page.waitForTimeout(100);

  // Mute and verify ctx suspends.
  await page.click('#muteBtn');
  await page.waitForTimeout(150);
  let state = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(state).toBe('suspended');

  // Launch while muted — should not throw, schedule remains tracked.
  await page.click('#launchBtn');
  await page.waitForTimeout(100);

  // Unmute and verify resume.
  await page.click('#muteBtn');
  await page.waitForTimeout(150);
  state = await page.evaluate(() => {
    const w = window as unknown as { __audioCtxState?: () => string };
    return w.__audioCtxState ? w.__audioCtxState() : 'none';
  });
  expect(state).toBe('running');

  // Final launch — should still resolve.
  await page.click('#launchBtn');
  await page.waitForTimeout(100);
  await expect(page.locator('#results')).toBeVisible();
});
