/**
 * Per-feature mini-intro framework. Per PR3.
 *
 * Each feature (kitchen, boss, daily-quest, …) gets ONE intro the first
 * time the player encounters it. Persistence per intro id in
 * fart_intro_seen_<id> so we never re-show.
 *
 * Ship with two intros up front (kitchen + boss). Add more as needed.
 */

const KEY_PREFIX = 'fart_intro_seen_';

export function hasSeenFeatureIntro(id: string): boolean {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${id}`) === 'true';
  } catch {
    return false;
  }
}

export function markFeatureIntroSeen(id: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${id}`, 'true');
  } catch {
    // ignore
  }
}

export interface FeatureIntroOptions {
  id: string;
  emoji: string;
  title: string;
  body: string;
  cta?: string;
}

export function showFeatureIntro(opts: FeatureIntroOptions): void {
  if (hasSeenFeatureIntro(opts.id)) return;
  markFeatureIntroSeen(opts.id);
  const overlay = document.createElement('div');
  overlay.className = 'feature-intro';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', `featureIntroTitle-${opts.id}`);
  overlay.innerHTML = `
    <div class="feature-intro-card">
      <div class="feature-intro-emoji" aria-hidden="true">${escapeText(opts.emoji)}</div>
      <h2 class="feature-intro-title" id="featureIntroTitle-${escapeText(opts.id)}">${escapeText(opts.title)}</h2>
      <p class="feature-intro-body">${escapeText(opts.body)}</p>
      <button type="button" class="feature-intro-close" id="featureIntroCloseBtn">${escapeText(opts.cta ?? 'Got it')}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeBtn = overlay.querySelector<HTMLButtonElement>('#featureIntroCloseBtn');
  const close = (): void => overlay.remove();
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) close();
  });
  setTimeout(() => closeBtn?.focus(), 50);
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/** Reset all feature-intro seen flags. Used by tests. */
export function resetAllFeatureIntros(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
