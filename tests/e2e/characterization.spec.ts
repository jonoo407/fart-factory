import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/**
 * Tier 0.2 — Characterization tests.
 *
 * These lock the EXISTING behavior of legacy/index.legacy.html so that the
 * Tier 0.3 module port can be verified to preserve it byte-for-byte.
 *
 * They run against legacy/index.legacy.html via file:// URL. After the port,
 * the same suite (or a new spec re-targeted at the new index.html) re-runs
 * to confirm parity. A failure here at 0.3 = a regression introduced.
 *
 * Tests should be deterministic: any randomness in the legacy code is
 * neutralized by checking against a value range or grade tier, not exact ints.
 */

const LEGACY_URL = pathToFileURL(
  resolve(process.cwd(), 'legacy/index.legacy.html'),
).href;

async function loadLegacy(page: Page): Promise<void> {
  await page.goto(LEGACY_URL);
  await page.evaluate(() => localStorage.clear());
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

test.describe('Legacy characterization (10 lock-points)', () => {
  test('1. all sliders default to 5; total = 30', async ({ page }) => {
    await loadLegacy(page);
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
    await loadLegacy(page);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const grade = await page.locator('#grade').textContent();
    expect(['B', 'B+']).toContain(grade?.trim());
  });

  test('3. all sliders at 10 → grade S+ with red color #ff0000', async ({
    page,
  }) => {
    await loadLegacy(page);
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
    await loadLegacy(page);
    await setSliders(page, [1, 1, 1, 1, 1, 1]);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const grade = await page.locator('#grade').textContent();
    expect(grade?.trim()).toBe('F-');
  });

  test('5. after Launch, #results has display:block', async ({ page }) => {
    await loadLegacy(page);
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
    await loadLegacy(page);
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    const sc1 = await page.locator('#sc1').textContent();
    expect(sc1).toMatch(/^\d+\/10 ⭐+$/);
  });

  test('7. #stinkFill width = (100 - stink*10)%', async ({ page }) => {
    await loadLegacy(page);
    await setSliders(page, [5, 5, 5, 7, 5, 5]); // stink=7
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
    await loadLegacy(page);
    for (let i = 0; i < 6; i++) {
      await page.click('#launchBtn');
      await page.waitForSelector('#results', { state: 'visible' });
    }
    const entries = await page.locator('#hallList .hall-entry').count();
    expect(entries).toBe(5);
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fart_hall') ?? '[]'),
    );
    expect(stored).toHaveLength(5);
    for (let i = 1; i < stored.length; i++) {
      expect(stored[i - 1].score).toBeGreaterThanOrEqual(stored[i].score);
    }
  });

  test('9. #commentary non-empty within 1s of Launch click', async ({
    page,
  }) => {
    await loadLegacy(page);
    const start = Date.now();
    await page.click('#launchBtn');
    await page.waitForFunction(
      () => {
        const el = document.getElementById('commentary');
        return !!el && (el.textContent ?? '').trim().length > 0;
      },
      undefined,
      { timeout: 1000 },
    );
    expect(Date.now() - start).toBeLessThan(1100);
    const text = await page.locator('#commentary').textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('10. total ≥ 41 applies shake animation to body', async ({ page }) => {
    await loadLegacy(page);
    await setSliders(page, [7, 7, 7, 7, 7, 7]); // total = 42
    await page.click('#launchBtn');
    await page.waitForSelector('#results', { state: 'visible' });
    // Shake is set inline on body.style.animation; check just after click.
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
    await page.goto(LEGACY_URL);
    await page.evaluate(() => localStorage.clear());
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
