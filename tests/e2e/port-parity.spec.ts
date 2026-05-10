import { test, expect, type Page } from '@playwright/test';
import { useSandboxMode } from './_legacy-setup';

useSandboxMode();

/**
 * Tier 0.3 — Port parity tests.
 *
 * Runs the same 11 lock-points from characterization.spec.ts against the new
 * Vite app served at /fart-factory/. If the modular port preserves the legacy
 * game's behavior byte-for-byte, all 11 must pass identically.
 *
 * RED: this file exists before the port — the new app has no markup, no game
 *      logic, and these tests will fail.
 * GREEN: after the port lands in src/scoring, src/audio, src/state, src/ui,
 *        all 11 pass against the new app.
 */

async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('fart_onboarding_seen', 'true');
  });
  await page.reload();
  await page.waitForSelector('#launchBtn');
}

async function setSliders(page: Page, values: number[]): Promise<void> {
  for (let i = 1; i <= 6; i++) {
    const v = values[i - 1];
    await page.evaluate(
      ([id, val]) => {
        const el = document.getElementById(id as string) as HTMLInputElement;
        el.value = String(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      [`s${i}`, v],
    );
  }
}

test.describe('New build port parity (11 lock-points)', () => {
  test('1. all sliders default to 5; total = 30', async ({ page }) => {
    await loadApp(page);
    const total = await page.evaluate(() => {
      let sum = 0;
      for (let i = 1; i <= 6; i++) {
        sum += parseInt(
          (document.getElementById(`s${i}`) as HTMLInputElement).value,
          10,
        );
      }
      return sum;
    });
    expect(total).toBe(30);
    for (let i = 1; i <= 6; i++) {
      const display = await page.locator(`#v${i}`).textContent();
      expect(display).toBe('5');
    }
  });

  test('2. all sliders at 5 → grade is B (or B+)', async ({ page }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const grade = await page.locator('#grade').textContent();
    expect(['B', 'B+']).toContain(grade?.trim());
  });

  test('3. all sliders at 10 → grade S+ with red color #ff0000', async ({
    page,
  }) => {
    await loadApp(page);
    await setSliders(page, [10, 10, 10, 10, 10, 10]);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const grade = await page.locator('#grade').textContent();
    expect(grade?.trim()).toBe('S+');
    const color = await page
      .locator('#grade')
      .evaluate((el) => (el as HTMLElement).style.color);
    expect(color).toBe('rgb(255, 0, 0)');
  });

  test('4. all sliders at 1 → grade F-', async ({ page }) => {
    await loadApp(page);
    await setSliders(page, [1, 1, 1, 1, 1, 1]);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const grade = await page.locator('#grade').textContent();
    expect(grade?.trim()).toBe('F-');
  });

  test('5. after Launch, #results has display:block', async ({ page }) => {
    await loadApp(page);
    const before = await page
      .locator('#results')
      .evaluate((el) => getComputedStyle(el).display);
    expect(before).toBe('none');
    await page.click('#launchBtn');
    await page.waitForFunction(
      () =>
        (document.getElementById('results') as HTMLElement).style.display ===
        'block',
    );
    const after = await page
      .locator('#results')
      .evaluate((el) => (el as HTMLElement).style.display);
    expect(after).toBe('block');
  });

  test('6. #sc1 matches /^\\d+\\/10 ⭐+$/', async ({ page }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const sc1 = await page.locator('#sc1').textContent();
    expect(sc1).toMatch(/^\d+\/10 ⭐+$/);
  });

  test('7. #stinkFill width = (100 - stink*10)%', async ({ page }) => {
    await loadApp(page);
    await setSliders(page, [5, 5, 5, 7, 5, 5]);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const width = await page
      .locator('#stinkFill')
      .evaluate((el) => (el as HTMLElement).style.width);
    expect(width).toBe('30%');
  });

  test('8. after 6 launches, Hall of Shame has exactly 5 entries', async ({
    page,
  }) => {
    await loadApp(page);
    for (let i = 0; i < 6; i++) {
      await page.click('#launchBtn');
      await page.waitForSelector('#results', { state: 'visible' });
    }
    const entries = await page.locator('#hallList .hall-entry').count();
    expect(entries).toBe(5);
  });

  test('9. #commentary non-empty within 1s of Launch click', async ({
    page,
  }) => {
    await loadApp(page);
    await page.click('#launchBtn');
    await page.waitForFunction(
      () => {
        const el = document.getElementById('commentary');
        return !!el && (el.textContent ?? '').trim().length > 0;
      },
      undefined,
      { timeout: 1000 },
    );
    const text = await page.locator('#commentary').textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('10. total ≥ 41 applies shake animation to body', async ({ page }) => {
    await loadApp(page);
    await setSliders(page, [7, 7, 7, 7, 7, 7]);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const animation = await page.evaluate(() => document.body.style.animation);
    expect(animation).toContain('shake');
  });

  test('11. audio: Launch click creates AudioContext, throws no error', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __audioCreated: number }).__audioCreated = 0;
      const Orig = window.AudioContext;
      window.AudioContext = class extends Orig {
        constructor() {
          super();
          (
            window as unknown as { __audioCreated: number }
          ).__audioCreated += 1;
        }
      } as unknown as typeof AudioContext;
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('fart_onboarding_seen', 'true');
    });
    await page.reload();
    await page.waitForSelector('#launchBtn');
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const created = await page.evaluate(
      () => (window as unknown as { __audioCreated: number }).__audioCreated,
    );
    expect(created).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
  });
});
