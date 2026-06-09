import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { crowdOutcome, MIN_ATTEMPT_BELLY } from '../../src/ui/plate';

// The belly is the per-crowd attempt budget. If you haven't pleased the crowd
// and you no longer have enough belly to make a real attempt, you're stuffed —
// the crowd leaves (soft fail, design decision). Otherwise you may retry.

describe('crowdOutcome — stuffed-fail loop', () => {
  it('passing the crowd wins regardless of belly', () => {
    expect(crowdOutcome(true, 0)).toBe('passed');
    expect(crowdOutcome(true, MIN_ATTEMPT_BELLY - 1)).toBe('passed');
  });

  it('not passed but still enough belly -> retry', () => {
    expect(crowdOutcome(false, MIN_ATTEMPT_BELLY)).toBe('retry');
    expect(crowdOutcome(false, MIN_ATTEMPT_BELLY + 10)).toBe('retry');
  });

  it('not passed and too stuffed to attempt -> stuffed-fail', () => {
    expect(crowdOutcome(false, MIN_ATTEMPT_BELLY - 1)).toBe('stuffed-fail');
    expect(crowdOutcome(false, 0)).toBe('stuffed-fail');
  });
});
