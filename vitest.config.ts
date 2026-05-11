import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      // DOM-heavy / audio-heavy modules are exercised via Playwright E2E,
      // not jsdom unit tests. Coverage thresholds apply to pure-logic
      // modules (src/scoring, src/state, audio mute glue, haptics).
      exclude: [
        'src/main.ts',
        'src/audio/procedural.ts',
        'src/audio/event-sfx.ts',
        'src/audio/sample-player.ts',
        'src/visuals/**',
        'src/content/commentary.ts',
        // UI modules — DOM-bound, covered by Playwright e2e instead.
        'src/ui/boss-arena.ts',
        'src/ui/kitchen.ts',
        'src/ui/map-screen.ts',
        'src/ui/notebook.ts',
        'src/ui/onboarding.ts',
        'src/ui/plate.ts',
        'src/ui/research.ts',
        'src/ui/shop.ts',
        'src/ui/toast.ts',
        'src/sanity.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 75,
        statements: 80,
      },
    },
  },
});
