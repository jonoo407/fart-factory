import { describe, it, expect } from 'vitest';
import { renderBreakdown } from '../../src/ui/result-panel';
import type { AxisFeedback } from '../../src/scoring/match';

// BUG: the "why N%?" breakdown was built from the abandoned legacy raw-scale
// computeMatchBreakdown (cost = |raw actual - raw target| - 1), while the
// headline % and the reaction judge card use the normalized closeness model
// (computeAxisFeedback). So an axis the SCORE counts as satisfied could render
// as a red ✗ miss — "wants a lot, has a lot, but it's an ✗". The breakdown
// must be sourced from the same feedback model so the ✓/✗ matches the score.
//
// BUG 2 (judge-card mismatch): a mid craving (3/5 → target 0.6) was labelled
// "wanted LOTS" while the symmetric scorer treats a maxed axis against it as
// an overshoot miss — "wanted LOTS, gave lots, ✗?!". The label now has three
// buckets (LOTS / some / a little) and every non-hit verdict says which way
// the plate missed (too much / not enough).

const fb = (over: Partial<AxisFeedback>): AxisFeedback => ({
  axis: 'stink',
  hate: false,
  wantLevel: 'lots',
  target: 0.8,
  got: 0.8,
  closeness: 1,
  status: 'hit',
  direction: 'on',
  ...over,
});

describe('renderBreakdown reflects the production feedback model', () => {
  it('renders a satisfied (hit) axis as a match, never a miss', () => {
    const html = renderBreakdown([fb({ axis: 'stink', status: 'hit', wantLevel: 'lots' })]);
    expect(html).toContain('breakdown-matched');
    expect(html).not.toContain('breakdown-miss');
    // it should communicate the WANT, not a raw overshoot number
    expect(html).toContain('LOTS');
  });

  it('renders a genuine miss as a miss', () => {
    const html = renderBreakdown([fb({ axis: 'musical', status: 'miss', wantLevel: 'lots', direction: 'under' })]);
    expect(html).toContain('breakdown-miss');
    expect(html).not.toContain('breakdown-matched');
  });

  it('labels a low want as "a little", not LOTS', () => {
    const html = renderBreakdown([fb({ axis: 'loud', status: 'hit', wantLevel: 'little' })]);
    expect(html).toContain('little');
    expect(html).not.toContain('LOTS');
  });

  it('labels a mid want as "some", not LOTS', () => {
    const html = renderBreakdown([fb({ axis: 'stink', status: 'hit', wantLevel: 'some', target: 0.6, got: 0.6 })]);
    expect(html).toContain('wanted some');
    expect(html).not.toContain('LOTS');
  });

  it('labels a hated axis as "NONE"', () => {
    const html = renderBreakdown([fb({ axis: 'wet', hate: true, wantLevel: 'little', status: 'hit' })]);
    expect(html).toContain('NONE');
  });

  it('an overshoot miss says "too much", not just "off"', () => {
    const html = renderBreakdown([
      fb({ axis: 'stink', wantLevel: 'some', target: 0.6, got: 1, closeness: 0.3, status: 'miss', direction: 'over' }),
    ]);
    expect(html).toContain('too much');
    expect(html).not.toContain('not enough');
  });

  it('an undershoot miss says "not enough"', () => {
    const html = renderBreakdown([
      fb({ axis: 'loud', wantLevel: 'lots', target: 1, got: 0.5, closeness: 0.2, status: 'miss', direction: 'under' }),
    ]);
    expect(html).toContain('not enough');
    expect(html).not.toContain('too much');
  });
});
