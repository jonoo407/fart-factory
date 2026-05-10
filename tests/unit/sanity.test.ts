import { describe, it, expect } from 'vitest';
import { isFartFactory } from '../../src/sanity';

describe('Tier 0.1 — toolchain sanity', () => {
  it('Vitest + jsdom + TS imports run', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(isFartFactory()).toBe(true);
  });
});
