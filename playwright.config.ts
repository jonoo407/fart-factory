import { defineConfig, devices } from '@playwright/test';

/**
 * Layout-sensitive specs that must run on ALL THREE viewports. Everything
 * else runs on mobile only (the primary target — 375×667). NEW specs are
 * mobile-only by default; add a spec here ONLY if it asserts viewport-
 * dependent layout/a11y behavior.
 */
const CROSS_VIEWPORT_SPECS = [
  '**/gameplay-smoke-v3.spec.ts',
  '**/axe-story.spec.ts',
  '**/pantry.spec.ts',
];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173/fart-factory/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      testMatch: CROSS_VIEWPORT_SPECS,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      testMatch: CROSS_VIEWPORT_SPECS,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/fart-factory/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
