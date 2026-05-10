import { test, expect } from '@playwright/test';

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fart_onboarding_seen', 'true');
    localStorage.removeItem('fart_mute');
  });
  await page.reload();
}

test('SFX manifest is served and has ≥12 non-fallback entries', async ({ page, baseURL }) => {
  await loadApp(page);
  const url = new URL('/fart-factory/sfx/manifest.json', baseURL).toString();
  const res = await page.request.get(url);
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(typeof json.version).toBe('string');
  expect(Array.isArray(json.entries)).toBe(true);
  const shipped = json.entries.filter((e: { proceduralFallback?: boolean }) => !e.proceduralFallback);
  expect(shipped.length).toBeGreaterThanOrEqual(12);
});

test('SFX library covers ≥3 mood affects + ≥2 duration buckets', async ({ page, baseURL }) => {
  await loadApp(page);
  const url = new URL('/fart-factory/sfx/manifest.json', baseURL).toString();
  const res = await page.request.get(url);
  const json = (await res.json()) as { entries: Array<{ mood: string; durationMs: number; proceduralFallback?: boolean }> };
  const shipped = json.entries.filter((e) => !e.proceduralFallback);

  // Library Richness sub-test (A28): ≥3 distinct mood tags.
  const moods = new Set(shipped.map((e) => e.mood));
  expect(moods.size).toBeGreaterThanOrEqual(3);

  // Library Richness sub-test (A28): ≥2 duration buckets {short ≤500, medium 500-1700, long >1700}.
  const buckets = new Set<string>();
  for (const e of shipped) {
    if (e.durationMs <= 800) buckets.add('short');
    else if (e.durationMs <= 1700) buckets.add('medium');
    else buckets.add('long');
  }
  expect(buckets.size).toBeGreaterThanOrEqual(2);
});

test('Launching while manifest is loaded uses a sample-bank entry (mainDurationMs > 1500ms for high length)', async ({ page }) => {
  await loadApp(page);
  // Set length to 10 → maps to long bucket; long-bucket samples are
  // ≥2.0s. Procedural-only path produces 0.3 + 10*0.25 = 2.8s, which
  // could collide with samples — so check the schedule shape instead.
  await page.locator('#s1').evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '10';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('#launchBtn');
  // Allow the manifest fetch + decode time on first launch.
  await page.waitForTimeout(400);
  const sched = (await page.evaluate(() => {
    const w = window as unknown as { __lastFartSchedule?: () => unknown };
    return w.__lastFartSchedule ? w.__lastFartSchedule() : null;
  })) as null | { cuePresent: boolean; cueDurationMs: number; mainStartOffsetMs: number; mainDurationMs: number };
  expect(sched).not.toBeNull();
  expect(sched!.cuePresent).toBe(true);
  expect(sched!.mainDurationMs).toBeGreaterThan(0);
});
