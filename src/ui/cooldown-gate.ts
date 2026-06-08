/**
 * A monotonic cooldown gate. `open()` returns true at most once per
 * `cooldownMs` window; calls inside the window return false.
 *
 * Why: WebAudio has no polyphony cap, so an unguarded repeat trigger schedules
 * a whole second sound chain that sums at the destination — a second Launch
 * while the first fart is still ringing, or a mashed belly-tap, produces the
 * "sounds play on top of each other" pile-up. Gating the trigger collapses a
 * burst to one sound. The clock is injectable so the logic is deterministic in
 * tests.
 */
export function createCooldownGate(
  cooldownMs: number,
  now: () => number = () => Date.now(),
): { open(): boolean } {
  let nextAllowed = 0;
  return {
    open(): boolean {
      const t = now();
      if (t < nextAllowed) return false;
      nextAllowed = t + cooldownMs;
      return true;
    },
  };
}
