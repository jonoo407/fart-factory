/**
 * Run Lighthouse against the local dev server, compare scores to
 * lighthouse-baseline.json, exit non-zero if any score regressed by
 * more than the baseline's regressionTolerance.
 *
 * Usage:
 *   npm run dev &              # wait for "ready in"
 *   npm run lighthouse:check
 *
 * In CI / on a remote container without Chromium, this script will
 * exit non-zero from Lighthouse itself; fail fast and consider it a
 * config issue rather than a regression.
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const BASELINE_PATH = join(REPO_ROOT, 'lighthouse-baseline.json');
const SESSION_DIR = join(REPO_ROOT, '.session');
const REPORT_PATH = join(SESSION_DIR, 'lighthouse.json');

interface Baseline {
  scores: { performance: number; accessibility: number };
  regressionTolerance: number;
}

async function runLighthouse(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'npx',
      [
        'lighthouse',
        'http://localhost:5173/fart-factory/',
        '--form-factor=mobile',
        '--only-categories=performance,accessibility',
        '--chrome-flags=--headless=new --no-sandbox',
        '--output=json',
        `--output-path=${REPORT_PATH}`,
        '--quiet',
      ],
      { stdio: 'inherit' },
    );
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`lighthouse exit ${code}`))));
  });
}

interface ReportShape {
  categories: {
    performance: { score: number | null };
    accessibility: { score: number | null };
  };
}

async function main(): Promise<void> {
  await runLighthouse();
  const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8')) as Baseline;
  const report = JSON.parse(await readFile(REPORT_PATH, 'utf8')) as ReportShape;
  const actual = {
    performance: Math.round((report.categories.performance.score ?? 0) * 100),
    accessibility: Math.round((report.categories.accessibility.score ?? 0) * 100),
  };
  const tol = baseline.regressionTolerance;
  const failures: string[] = [];
  for (const k of ['performance', 'accessibility'] as const) {
    const got = actual[k];
    const expected = baseline.scores[k];
    const delta = got - expected;
    console.log(`${k.padEnd(14)} got=${got} baseline=${expected} delta=${delta >= 0 ? '+' : ''}${delta}`);
    if (delta < -tol) {
      failures.push(`${k}: ${got} (expected ≥ ${expected - tol}, regressed by ${-delta} points)`);
    }
  }
  if (failures.length > 0) {
    console.error('\nLighthouse regression:');
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('\n✓ Lighthouse scores within tolerance.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
