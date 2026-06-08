import { describe, it, expect } from 'vitest';
import { computeShowPosition, regionNameForArea } from '../../src/ui/top-bar';

/**
 * PLAN v9 UI-overhaul Phase 1 / 04 §2 — the play-screen top bar shows the
 * region name + "Show N of M". M comes from the same ~6-show venue windowing
 * the venue ladder uses (venue-ladder.ts), NOT a hardcoded total, so the top
 * label and the ladder agree on the same climb framing.
 */
describe('computeShowPosition', () => {
  it('first show of a short hometown roster (4 audiences)', () => {
    expect(computeShowPosition(4, 0)).toEqual({ showIndex: 1, showTotal: 4 });
  });

  it('last show of a short roster fills the window', () => {
    expect(computeShowPosition(4, 3)).toEqual({ showIndex: 4, showTotal: 4 });
  });

  it('windows a 20-audience region into 6-show venues (second venue, first show)', () => {
    expect(computeShowPosition(20, 6)).toEqual({ showIndex: 1, showTotal: 6 });
  });

  it('mid-window position inside a full venue', () => {
    expect(computeShowPosition(20, 13)).toEqual({ showIndex: 2, showTotal: 6 });
  });

  it('a final short venue (only 2 shows left after the window start)', () => {
    expect(computeShowPosition(20, 19)).toEqual({ showIndex: 2, showTotal: 2 });
  });

  it('degenerate empty roster does not throw and clamps total to 0', () => {
    expect(computeShowPosition(0, 0)).toEqual({ showIndex: 1, showTotal: 0 });
  });

  it('honours a custom venue size', () => {
    expect(computeShowPosition(10, 4, 4)).toEqual({ showIndex: 1, showTotal: 4 });
  });
});

describe('regionNameForArea', () => {
  it('maps a hometown area id to its region name', () => {
    expect(regionNameForArea('outside')).toBe('Hometown');
  });

  it('maps a royal area id to its region name', () => {
    expect(regionNameForArea('throne')).toBe('Royal');
  });

  it('falls back to Hometown for an unknown area id', () => {
    expect(regionNameForArea('does-not-exist')).toBe('Hometown');
  });
});
