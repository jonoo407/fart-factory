import { describe, it, expect, beforeEach } from 'vitest';
import { resolveLaunchProps } from '../../src/scoring/launch-resolver';
import { savePantry } from '../../src/state/persistence';

beforeEach(() => {
  localStorage.clear();
  // Make sure beans is unlocked so the underlying composition works.
  savePantry(['beans', 'cheese']);
});

/**
 * Phase v5 P1 — the launch must respect prep-table treatments.
 *
 * `resolveLaunchProps(ids, treatments)` is the single function the
 * launch handler should use. It returns the property vector after
 * either the prepped-plate path (treatments non-empty) or the raw
 * fart-recipe path (no treatments).
 */

describe('resolveLaunchProps — prep-aware launch resolution (P1)', () => {
  it('with no treatments, returns the v3 raw-plate properties', () => {
    const ids = ['beans', 'cheese'];
    const result = resolveLaunchProps(ids, []);
    expect(result.props.stink).toBeGreaterThan(0);
    expect(result.usedTreatments).toBe(false);
  });

  it('with treatments, returns the prepped-plate properties', () => {
    const ids = ['beans', 'cheese'];
    const result = resolveLaunchProps(ids, ['roast', 'raw']);
    expect(result.usedTreatments).toBe(true);
    // We don't assert exact equality vs. raw because synergy logic differs
    // between paths, but stink should be at LEAST as high after roasting
    // beans.
    expect(result.props.stink).toBeGreaterThan(0);
  });

  it('roasted plate has HIGHER stink than raw equivalent (deterministic)', () => {
    const ids = ['beans'];
    const raw = resolveLaunchProps(ids, []);
    const roasted = resolveLaunchProps(ids, ['roast']);
    expect(roasted.props.stink).toBeGreaterThan(raw.props.stink);
  });

  it('chilled plate has HIGHER loud than raw equivalent', () => {
    const ids = ['beans'];
    const raw = resolveLaunchProps(ids, []);
    const chilled = resolveLaunchProps(ids, ['chill']);
    expect(chilled.props.loud).toBeGreaterThan(raw.props.loud);
  });

  it('treatments array length mismatch falls back to raw (safety)', () => {
    const ids = ['beans', 'cheese'];
    // Only one treatment for two foods — invalid → raw fallback.
    const result = resolveLaunchProps(ids, ['roast']);
    expect(result.usedTreatments).toBe(false);
  });

  it('empty plate returns zero properties', () => {
    const result = resolveLaunchProps([], []);
    expect(result.props.stink).toBe(0);
    expect(result.props.loud).toBe(0);
    expect(result.usedTreatments).toBe(false);
  });
});
