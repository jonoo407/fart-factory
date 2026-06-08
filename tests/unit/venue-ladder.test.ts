import { describe, it, expect } from 'vitest';
import { computeLadderNodes, ladderNodePositions } from '../../src/ui/venue-ladder';
import { getAudience } from '../../src/state/audience';

/**
 * PLAN v9 P5 / 04 §7 — venue-ladder node states (DOM render verified in browser).
 */
describe('computeLadderNodes', () => {
  const roster = [getAudience('granny-edna')!, getAudience('frat-bros')!, getAudience('silent-monks')!];

  it('marks done (passed), current, and upcoming nodes', () => {
    const stars = (id: string) => (id === 'granny-edna' ? 3 : 0);
    const nodes = computeLadderNodes(roster, 'frat-bros', stars);
    expect(nodes[0]!.state).toBe('done');
    expect(nodes[0]!.stars).toBe(3);
    expect(nodes[1]!.state).toBe('current');
    expect(nodes[2]!.state).toBe('upcoming');
  });

  it('flags boss-tier audiences', () => {
    const nodes = computeLadderNodes(roster, 'granny-edna', () => 0);
    expect(nodes.find((n) => n.audienceId === 'silent-monks')!.isBoss).toBe(true);
    expect(nodes.find((n) => n.audienceId === 'granny-edna')!.isBoss).toBe(false);
  });
});

/**
 * PLAN v9 UI-overhaul Phase 2 / 04 §7 — the ladder is a winding node-path, not a
 * flat list. Positions zig-zag from bottom-left up to top-right so the SVG path
 * reads as a climb. Pure + deterministic; the DOM render is verified in-browser.
 */
describe('ladderNodePositions', () => {
  it('returns no points for an empty venue', () => {
    expect(ladderNodePositions(0)).toEqual([]);
  });

  it('centers a single node', () => {
    expect(ladderNodePositions(1)).toEqual([[48, 50]]);
  });

  it('zig-zags bottom-left → top-right for a 4-show venue', () => {
    const p = ladderNodePositions(4);
    expect(p).toHaveLength(4);
    expect(p[0]).toEqual([30, 86]); // first show: bottom-left
    expect(p[3]).toEqual([66, 14]); // last show: top-right
    expect(p.map(([x]) => x)).toEqual([30, 66, 30, 66]); // x alternates
    const ys = p.map(([, y]) => y);
    expect(ys.every((y, i) => i === 0 || y < ys[i - 1]!)).toBe(true); // y climbs
  });

  it('keeps every point inside the 0-100 canvas bounds', () => {
    for (const [x, y] of ladderNodePositions(6)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });
});
