import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PLAN v9 P4 / 04 §1 — the Order Ticket design tokens contract. Parsing the
 * stylesheet text keeps this deterministic + framework-reachable (no DOM).
 */
const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');
const fonts = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('Order Ticket design tokens', () => {
  it(':root defines the core palette', () => {
    expect(css).toMatch(/--paper:\s*#f4ecd8/);
    expect(css).toMatch(/--paper2:\s*#eadfc4/);
    expect(css).toMatch(/--ink:\s*#231d16/);
    expect(css).toMatch(/--green:\s*#8fd11e/);
    expect(css).toMatch(/--green-d:\s*#6fae12/);
    expect(css).toMatch(/--orange:\s*#ff7a2f/);
    expect(css).toMatch(/--gold:\s*#f59e0b/);
    expect(css).toMatch(/--muted:\s*#8a7d63/);
  });

  it(':root defines the rarity ramp', () => {
    expect(css).toMatch(/--rar-c:/);
    expect(css).toMatch(/--rar-l:\s*#f59e0b/);
  });
});

describe('Order Ticket typography', () => {
  it('loads Baloo 2, Nunito and Space Mono webfonts in index.html', () => {
    expect(fonts).toMatch(/Baloo\+?2|Baloo 2/);
    expect(fonts).toMatch(/Nunito/);
    expect(fonts).toMatch(/Space\+?Mono|Space Mono/);
  });

  it('body no longer uses Comic Sans (paper-ink language)', () => {
    const body = /body\s*\{[^}]*\}/s.exec(css)?.[0] ?? '';
    expect(body).not.toMatch(/Comic Sans/i);
    expect(body).toMatch(/Nunito/);
  });
});
