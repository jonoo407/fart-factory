import type { Achievement } from '../state/achievements';

const HOST_ID = 'achievementHost';
const DURATION_MS = 4000;

function ensureHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (host) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.className = 'achievement-host';
  document.body.appendChild(host);
  return host;
}

export function showAchievementToast(a: Achievement): void {
  const host = ensureHost();
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="ach-emoji" aria-hidden="true">${escapeText(a.emoji)}</span>
    <div class="ach-body">
      <div class="ach-name">Achievement unlocked: ${escapeText(a.name)}</div>
      <div class="ach-desc">${escapeText(a.desc)}</div>
    </div>
  `;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), DURATION_MS);
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
