/**
 * PERFECT (≥95% match) cinematic — pause input, fire confetti + sting,
 * then yield to the normal result-panel render.
 *
 * Symmetric callers: onStoryLaunch awaits this before renderStoryResult
 * so the player feels the pop before reading the numbers.
 */

import { spawnConfetti } from '../visuals/confetti';
import { playCelebrationSting } from '../audio/procedural';

const HOLD_MS = 1200;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function playPerfectCinematic(): Promise<void> {
  const launchBtn = document.getElementById('storyLaunchBtn') as HTMLButtonElement | null;
  // Disable input briefly so the celebration lands before the next tap.
  if (launchBtn) launchBtn.disabled = true;
  spawnConfetti(18);
  void playCelebrationSting();
  const hold = prefersReducedMotion() ? 0 : HOLD_MS;
  return new Promise((resolve) => {
    setTimeout(() => {
      if (launchBtn) launchBtn.disabled = false;
      resolve();
    }, hold);
  });
}
