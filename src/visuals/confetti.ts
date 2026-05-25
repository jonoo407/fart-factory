/**
 * Confetti burst — DOM-based emoji confetti for the PERFECT launch
 * cinematic. Spawns nodes inside #gasOverlay (already pointer-events:none,
 * full-viewport, z-indexed above the play area).
 *
 * Respects prefers-reduced-motion: reduce → no-op.
 */

const EMOJI = ['🎉', '🎊', '✨', '⭐', '💫', '🌟', '💛', '🟡'];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function spawnConfetti(count = 18): void {
  if (prefersReducedMotion()) return;
  const host = document.getElementById('gasOverlay');
  if (!host) return;
  for (let i = 0; i < count; i++) {
    const node = document.createElement('span');
    const startX = 10 + Math.random() * 80; // 10%–90% viewport width
    const driftX = (Math.random() - 0.5) * 40; // -20%..+20%
    const rotate = Math.floor(Math.random() * 720 - 360);
    const delayMs = Math.floor(Math.random() * 200);
    const durationMs = 1400 + Math.floor(Math.random() * 700);
    node.className = 'confetti-piece';
    node.style.setProperty('--cx', `${startX}vw`);
    node.style.setProperty('--cdx', `${driftX}vw`);
    node.style.setProperty('--crot', `${rotate}deg`);
    node.style.animationDelay = `${delayMs}ms`;
    node.style.animationDuration = `${durationMs}ms`;
    node.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)] ?? '🎉';
    host.appendChild(node);
    const total = delayMs + durationMs + 100;
    setTimeout(() => node.remove(), total);
  }
}
