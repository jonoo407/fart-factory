import { describe, it, expect, beforeEach } from 'vitest';
import {
  rollUnicornEncounter,
  UNICORN_AUDIENCE,
  UNICORN_CHANCE,
} from '../../src/state/unicorn-encounter';

beforeEach(() => {
  localStorage.clear();
});

describe('Mystery unicorn audience (T4.2)', () => {
  it('UNICORN_AUDIENCE is a well-formed Audience', () => {
    expect(UNICORN_AUDIENCE.id).toBe('mystery-unicorn');
    expect(UNICORN_AUDIENCE.name.toLowerCase()).toContain('unicorn');
    expect(UNICORN_AUDIENCE.emoji).toBe('🦄');
    expect(UNICORN_AUDIENCE.cravings).toBeDefined();
  });

  it('UNICORN_CHANCE is a small positive probability', () => {
    expect(UNICORN_CHANCE).toBeGreaterThan(0);
    expect(UNICORN_CHANCE).toBeLessThanOrEqual(0.1);
  });

  it('rollUnicornEncounter returns true sometimes and false sometimes over many rolls', () => {
    let trueCount = 0;
    for (let i = 0; i < 500; i++) {
      if (rollUnicornEncounter(i)) trueCount++;
    }
    // At UNICORN_CHANCE = 0.01-0.05, we expect 5-25 trues in 500 rolls.
    expect(trueCount).toBeGreaterThan(0);
    expect(trueCount).toBeLessThan(500);
  });
});
