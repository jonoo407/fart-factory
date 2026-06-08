import { describe, it, expect } from 'vitest';
import { reactionFooterSpec } from '../../src/ui/reaction-overlay';

/**
 * PLAN v9 P2 / 01 §4.1 — the pass/retry/improve gate. A flop can ONLY retry
 * the same crowd (no advance); a pass offers Improve + advance; a boss pass
 * offers Improve + Finish. (DOM rendering is verified in the browser.)
 */
describe('reactionFooterSpec', () => {
  it('a flop offers ONLY "Try this crowd again" — it cannot advance', () => {
    const f = reactionFooterSpec(false, false);
    expect(f).toHaveLength(1);
    expect(f[0]!.action).toBe('retry');
  });

  it('a flop on a boss still offers only retry', () => {
    const f = reactionFooterSpec(false, true);
    expect(f.map((b) => b.action)).toEqual(['retry']);
  });

  it('a pass offers Improve (ghost) + Next show (primary)', () => {
    const f = reactionFooterSpec(true, false);
    expect(f.map((b) => b.action)).toEqual(['improve', 'next']);
    expect(f.find((b) => b.action === 'improve')!.primary).toBe(false);
    expect(f.find((b) => b.action === 'next')!.primary).toBe(true);
  });

  it('a boss pass offers Improve + Finish', () => {
    const f = reactionFooterSpec(true, true);
    expect(f.map((b) => b.action)).toEqual(['improve', 'finish']);
  });
});
