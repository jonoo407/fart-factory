/**
 * Trigger a haptic vibration on mobile devices.
 * Returns true if the platform accepted the request, false otherwise
 * (no API, blocked by browser policy, or throws).
 */
export function triggerHaptic(pattern: number | readonly number[]): boolean {
  const v = (
    navigator as unknown as {
      vibrate?: (p: number | number[]) => boolean;
    }
  ).vibrate;
  if (typeof v !== 'function') return false;
  try {
    const arg = Array.isArray(pattern) ? [...pattern] : (pattern as number);
    return v.call(navigator, arg) === true;
  } catch {
    return false;
  }
}

/** Pattern presets so call sites don't carry magic numbers. */
export const HAPTICS = {
  launch: [12, 30, 12],
  combo: [25, 50, 25, 50, 60],
  achievement: [40],
} as const;
