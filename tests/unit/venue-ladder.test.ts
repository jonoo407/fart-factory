import { describe, it, expect } from 'vitest';
import { computeLadderNodes } from '../../src/ui/venue-ladder';
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
