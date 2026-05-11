/**
 * Audience reaction particles. Per PLAN_v7 T1.3.
 *
 * Spawns 8-12 emoji particles when the audience reaction tier resolves.
 * Each tier has its own emoji set + animation direction:
 *  - loved: 😍❤️🎉 floating upward
 *  - liked: 🙂✨ gentle drift
 *  - meh: (none, deliberate)
 *  - disliked: 🤢💦 dripping downward
 *  - evacuated: 💀🏃 scatter outward
 *
 * CSS-only animation. Respects prefers-reduced-motion via the global rule.
 */

type Tier = 'loved' | 'liked' | 'meh' | 'disliked' | 'evacuated';

const EMOJI_BY_TIER: Record<Tier, string[]> = {
  loved:     ['😍', '❤️', '🎉', '✨', '😍'],
  liked:     ['🙂', '✨', '👌'],
  meh:       [],
  disliked:  ['🤢', '💦', '😖'],
  evacuated: ['💀', '🏃', '💨'],
};

const DIRECTION_BY_TIER: Record<Tier, 'up' | 'down' | 'scatter' | 'drift' | 'none'> = {
  loved:     'up',
  liked:     'drift',
  meh:       'none',
  disliked:  'down',
  evacuated: 'scatter',
};

function spawnFromContainer(): HTMLElement | null {
  const container = document.querySelector<HTMLElement>('.audience-wrap');
  return container;
}

export function spawnReactionParticles(tier: Tier): void {
  if (tier === 'meh') return;
  const container = spawnFromContainer();
  if (!container) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const emojis = EMOJI_BY_TIER[tier];
  const direction = DIRECTION_BY_TIER[tier];
  const count = tier === 'evacuated' ? 12 : 8;
  const containerRect = container.getBoundingClientRect();

  for (let i = 0; i < count; i++) {
    const node = document.createElement('div');
    const emoji = emojis[i % emojis.length]!;
    node.textContent = emoji;
    node.className = `reaction-particle reaction-particle-${direction}`;
    // Random horizontal start position across the audience-wrap.
    const x = Math.random() * containerRect.width;
    node.style.left = `${x}px`;
    node.style.top = `${containerRect.height / 2}px`;
    // Stagger animation delays for a natural burst.
    node.style.animationDelay = `${Math.random() * 0.3}s`;
    // For scatter / drift, randomize horizontal end offset.
    const dx = (Math.random() - 0.5) * 80;
    node.style.setProperty('--dx', `${dx}px`);
    container.appendChild(node);
    setTimeout(() => node.remove(), 1800);
  }
}
