/**
 * Shared beforeEach for the v2 (slider) tests. Per PLAN.md Phase M:
 * default mode is now 'story', but the v2 test suite was written
 * assuming the sandbox/slider UI is visible. This addInitScript flips
 * any v2 test back to sandbox before each navigation.
 *
 * Story-mode tests (story-*.spec.ts, gameplay-smoke-v3.spec.ts) set
 * fart_mode = 'story' explicitly inside their own setup; they don't
 * import this file.
 */

import { test } from '@playwright/test';

export function useSandboxMode(): void {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('fart_mode', '"sandbox"');
    });
  });
}
