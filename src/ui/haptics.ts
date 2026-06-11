import { loadHapticsEnabled } from '../audio/audio-settings';

/**
 * Trigger a haptic vibration on mobile devices.
 * Returns true if the platform accepted the request, false otherwise
 * (no API, blocked by browser policy, disabled by the user, or throws).
 * PLAN v9 P6 — respects the user's Rumble toggle (02 §7).
 */
export function triggerHaptic(pattern: number | readonly number[]): boolean {
  if (!loadHapticsEnabled()) return false;
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
  /** Live Crowd Read — soft tick when the crowd's mood tier shifts. */
  moodShift: [10],
} as const;
