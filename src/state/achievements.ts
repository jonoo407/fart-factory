export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export interface LaunchContext {
  sliders: number[]; // [length, wetness, volume, stink, temp, musical]
  total: number;
  grade: string;
  hallSize: number;
  launchesThisSession: number;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-toot',
    name: 'First Toot',
    emoji: '👶',
    desc: "You launched your very first fart.",
  },
  {
    id: 's-tier',
    name: 'S-Tier Scientist',
    emoji: '🌟',
    desc: 'Achieved an S+ grade. Bow down.',
  },
  {
    id: 'stink-lord',
    name: 'Stink Lord',
    emoji: '☠️',
    desc: 'Maxed the stinkiness slider.',
  },
  {
    id: 'symphony',
    name: 'Symphony Conductor',
    emoji: '🎼',
    desc: 'Maxed the musical quality slider.',
  },
  {
    id: 'loud-and-proud',
    name: 'Loud and Proud',
    emoji: '📢',
    desc: 'Earned a total score of 50 or more.',
  },
  {
    id: 'hall-filler',
    name: 'Hall Filler',
    emoji: '🏆',
    desc: 'Filled all 5 Hall of Shame slots.',
  },
];

const STORAGE_KEY = 'fart_achievements';

export function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function saveUnlocked(set: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function evaluateLaunch(
  ctx: LaunchContext,
  alreadyUnlocked: Set<string>,
): string[] {
  const newly: string[] = [];
  const candidates: Array<[id: string, condition: boolean]> = [
    ['first-toot', ctx.launchesThisSession >= 1],
    ['s-tier', ctx.grade === 'S+'],
    ['stink-lord', ctx.sliders[3] === 10],
    ['symphony', ctx.sliders[5] === 10],
    ['loud-and-proud', ctx.total >= 50],
    ['hall-filler', ctx.hallSize >= 5],
  ];
  for (const [id, ok] of candidates) {
    if (ok && !alreadyUnlocked.has(id)) newly.push(id);
  }
  return newly;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
