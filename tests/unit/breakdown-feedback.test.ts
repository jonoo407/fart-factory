import { describe, it, expect } from 'vitest';
import { renderBreakdown } from '../../src/ui/result-panel';
import type { AxisFeedback } from '../../src/scoring/match';

// BUG: the "why N%?" breakdown was built from the abandoned legacy raw-scale
// computeMatchBreakdown (cost = |raw actual - raw target| - 1), while the
// headline % and the reaction judge card use the normalized closeness model
// (computeAxisFeedback). So an axis the SCORE counts as satisfied could render
// as a red ✗ miss — "wants a lot, has a lot, but it's an ✗". The breakdown
// must be sourced from the same feedback model so the ✓/✗ matches the score.

const fb = (over: Partial<AxisFeedback>): AxisFeedback => ({
  axis: 'stink',
  hate: false,
  wantHigh: true,
  target: 0.8,
  got: 0.8,
  closeness: 1,
  status: 'hit',
  ...over,
});

describe('renderBreakdown reflects the production feedback model', () => {
  it('renders a satisfied (hit) axis as a match, never a miss', () => {
    const html = renderBreakdown([fb({ axis: 'stink', status: 'hit', wantHigh: true })]);
    expect(html).toContain('breakdown-matched');
    expect(html).not.toContain('breakdown-miss');
    // it should communicate the WANT, not a raw overshoot number
    expect(html).toContain('LOTS');
  });

  it('renders a genuine miss as a miss', () => {
    const html = renderBreakdown([fb({ axis: 'musical', status: 'miss', wantHigh: true })]);
    expect(html).toContain('breakdown-miss');
    expect(html).not.toContain('breakdown-matched');
  });

  it('labels a low want as "a little", not LOTS', () => {
    const html = renderBreakdown([fb({ axis: 'loud', status: 'hit', wantHigh: false })]);
    expect(html).toContain('little');
    expect(html).not.toContain('LOTS');
  });

  it('labels a hated axis as "NONE"', () => {
    const html = renderBreakdown([fb({ axis: 'wet', hate: true, wantHigh: false, status: 'hit' })]);
    expect(html).toContain('NONE');
  });
});
