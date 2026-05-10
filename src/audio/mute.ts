const KEY = 'fart_mute';

export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return false;
    const parsed = JSON.parse(raw);
    return parsed === true;
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(KEY, JSON.stringify(muted));
}
