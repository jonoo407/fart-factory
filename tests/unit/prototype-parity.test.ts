import { describe, it, expect } from 'vitest';
import { protoLaunch } from '../fixtures/proto';
import { closeness } from '../../src/scoring/match';

/**
 * PLAN v9 D2 — golden-number suite. Locks the SHIPPED scoring math
 * (computeBase + closeness + grade/stars) to the prototype's verified
 * computeLaunch outputs. Every number here was triple-checked: the oracle
 * agent's JS replica, the scoring-core agent, and a by-hand trace.
 */
describe('closeness curve (pow 0.85 * 1.5)', () => {
  it('is 1 on a perfect hit and 0 when fully saturated against a 0 target', () => {
    expect(closeness(0.6, 0.6)).toBe(1);
    expect(closeness(0, 1)).toBe(0); // 1 - 1^0.85*1.5 = -0.5 -> clamped 0
  });
  it('punishes a big miss far more than a small one (steep)', () => {
    const small = closeness(0.85, 0.75); // dist 0.10
    const big = closeness(0.85, 0.375); // dist 0.475
    expect(small).toBeGreaterThan(big);
    expect(big).toBeLessThan(0.25);
  });
});

describe('prototype parity — worked examples (exact pct/grade/stars)', () => {
  it('1× broccoli vs Granny (tap) → 34 / F / 0★', () => {
    const r = protoLaunch(['broccoli'], 'granny');
    expect(r.pct).toBe(34);
    expect(r.grade).toBe('F');
    expect(r.stars).toBe(0);
  });

  it('2× broccoli vs Granny (tap) → 61 / C / 1★ (the teaching beat)', () => {
    const r = protoLaunch(['broccoli', 'broccoli'], 'granny');
    expect(r.pct).toBe(61);
    expect(r.grade).toBe('C');
    expect(r.stars).toBe(1);
  });

  it('Lullaby (kombucha+broccoli, musical ×1.7) vs Granny (tap) → 69 / B / 2★', () => {
    const r = protoLaunch(['kombucha', 'broccoli'], 'granny', 'lullaby');
    expect(r.pct).toBe(69);
    expect(r.grade).toBe('B');
    expect(r.stars).toBe(2);
  });

  it('…the same Lullaby with a PERFECT charge ×1.25 → 87 / A / 3★', () => {
    const r = protoLaunch(['kombucha', 'broccoli'], 'granny', 'lullaby', 1.25);
    expect(r.pct).toBe(87);
    expect(r.grade).toBe('A');
    expect(r.stars).toBe(3);
  });

  it('Fizz (wet ×1.6) vs the Critic-Bot who HATES wet → 0 / F (hate tanks it)', () => {
    const r = protoLaunch(['kombucha', 'pickle'], 'critic', 'fizz');
    expect(r.pct).toBe(0);
    expect(r.grade).toBe('F');
  });

  it('beans+pepper vs Frat: a perfect charge passes (51/C), a weak charge fails (35/F)', () => {
    const perfect = protoLaunch(['beans', 'pepper'], 'frat', null, 1.25);
    const weak = protoLaunch(['beans', 'pepper'], 'frat', null, 0.85);
    expect(perfect.pct).toBe(51);
    expect(perfect.grade).toBe('C');
    expect(weak.pct).toBe(35);
    expect(weak.grade).toBe('F');
  });

  it('Inferno (heat ×1.8) vs Frat (tap) → 73 / B / 2★', () => {
    const r = protoLaunch(['pepper', 'garlic', 'beans'], 'frat', 'inferno');
    expect(r.pct).toBe(73);
    expect(r.grade).toBe('B');
    expect(r.stars).toBe(2);
  });
});
