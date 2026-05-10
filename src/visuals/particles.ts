const DEFAULT_COUNT = 28;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function spawnSparkles(
  count: number = DEFAULT_COUNT,
  hostId: string = 'gasOverlay',
): number {
  if (prefersReducedMotion()) return 0;
  const host = document.getElementById(hostId);
  if (!host) return 0;
  const emojis = ['✨', '⭐', '🌟', '💫', '🎉'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random() * 90 + 5 + '%';
    s.style.top = Math.random() * 70 + 15 + '%';
    s.style.fontSize = 18 + Math.random() * 22 + 'px';
    s.style.setProperty('--dx', (Math.random() * 200 - 100).toFixed(0) + 'px');
    s.style.setProperty('--dy', (-100 - Math.random() * 200).toFixed(0) + 'px');
    s.style.animationDelay = (Math.random() * 0.4).toFixed(2) + 's';
    host.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
  return count;
}
