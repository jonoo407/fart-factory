export interface HallEntry {
  score: number;
  grade: string;
  date: string;
  id: number;
}

const STORAGE_KEY = 'fart_hall';
const MAX_ENTRIES = 5;

export function loadHall(): HallEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHall(hall: HallEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hall));
}

export function addToHall(score: number, grade: string): void {
  const hall = loadHall();
  hall.push({ score, grade, date: new Date().toLocaleDateString(), id: Date.now() });
  hall.sort((a, b) => b.score - a.score);
  if (hall.length > MAX_ENTRIES) hall.length = MAX_ENTRIES;
  saveHall(hall);
  renderHall();
}

export function renderHall(): void {
  const hall = loadHall();
  const el = document.getElementById('hallList');
  if (!el) return;
  if (!hall.length) {
    el.innerHTML = '<div class="hall-empty">No legendary farts yet... Launch one!</div>';
    return;
  }
  const ranks = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  el.innerHTML = hall
    .map(
      (h, i) =>
        `<div class="hall-entry"><span>${ranks[i]} ${escapeHtml(h.grade)}</span><span>Score: ${h.score}</span><span>${escapeHtml(h.date)}</span></div>`,
    )
    .join('');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
