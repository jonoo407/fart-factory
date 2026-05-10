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
      // not jsdom unit tests. Coverage thresholds apply to pure-logic modules.
      exclude: [
        'src/main.ts',
        'src/audio/procedural.ts',
        'src/visuals/**',
        'src/content/commentary.ts',
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
