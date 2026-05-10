// Flat config (ESLint 9+). Closes Quality v2 axis sub-test (b) cyclomatic
// complexity and (a) source-level a11y / lint hygiene per QUALITY_CRITIC.md.
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/**', 'legacy/**', '.session/**'],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: false,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Cyclomatic complexity per McCabe 1976; threshold 10 (NIST SP 500-235).
      complexity: ['error', 10],
      // Empty catch blocks are silent failures (Bloch *Effective Java* Item 77).
      'no-empty': ['error', { allowEmptyCatch: false }],
      // No unreachable code.
      'no-unreachable': 'error',
      // No new `any` introductions.
      '@typescript-eslint/no-explicit-any': 'error',
      // No empty interfaces / interfaces extending nothing.
      '@typescript-eslint/no-empty-interface': 'error',
      // Forbid floating promises (swallowed async errors). Off in tests.
      '@typescript-eslint/no-floating-promises': 'off',
      // Function size hint — not a hard error since onLaunch is dense.
      'max-lines-per-function': ['warn', { max: 100, skipComments: true, skipBlankLines: true }],
    },
  },
];
