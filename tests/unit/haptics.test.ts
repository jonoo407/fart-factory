import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerHaptic } from '../../src/ui/haptics';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('triggerHaptic', () => {
  it('returns false silently when navigator.vibrate is unavailable', () => {
    // Do not stub vibrate — jsdom default has no vibrate.
    // (Using delete reflects as if API is missing.)
    // @ts-expect-error - exercising the missing-API branch
    delete navigator.vibrate;
    expect(() => triggerHaptic([10])).not.toThrow();
    expect(triggerHaptic([10])).toBe(false);
  });

  it('calls navigator.vibrate with the given pattern when available', () => {
    const spy = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: spy,
      writable: true,
    });
    expect(triggerHaptic([20, 40, 20])).toBe(true);
    expect(spy).toHaveBeenCalledWith([20, 40, 20]);
  });

  it('catches throws from navigator.vibrate and returns false', () => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        throw new Error('blocked');
      },
      writable: true,
    });
    expect(() => triggerHaptic([10])).not.toThrow();
    expect(triggerHaptic([10])).toBe(false);
  });
});
