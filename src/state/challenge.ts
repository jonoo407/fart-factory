export interface Challenge {
  name: string;
  emoji: string;
  hint: string;
  profile: number[]; // [length, wetness, volume, stinkiness, temp, musical]
}

// 12 named challenge profiles. Each profile lives in slider 1..10 space
// (same shape as readSliders() — [length, wetness, volume, stinkiness, temp, musical]).
// Names + hints are tone-adjacent. Profiles are intentionally varied so the
// optimal slider configuration differs per challenge — no single "max all" wins.
export const CHALLENGES: readonly Challenge[] = [
  { name: 'Swamp Beast',       emoji: '🐊', hint: 'Wet, stinky, medium length.',          profile: [6, 9, 5, 9, 7, 3] },
  { name: 'Silent Killer',     emoji: '🥷', hint: 'Quiet but utterly devastating.',       profile: [4, 5, 1, 10, 5, 4] },
  { name: 'Symphony Conductor',emoji: '🎼', hint: 'Long, musical, dry.',                  profile: [8, 3, 8, 5, 6, 10] },
  { name: 'Thunder Roll',      emoji: '⛈️',  hint: 'Loud, long, big rumble.',              profile: [10, 4, 10, 6, 6, 5] },
  { name: 'Mouse Squeak',      emoji: '🐭', hint: 'Tiny, brief, surprising.',             profile: [2, 2, 3, 3, 5, 8] },
  { name: 'Dragon Belch',      emoji: '🐉', hint: 'Hot, loud, brassy.',                   profile: [7, 6, 9, 7, 10, 4] },
  { name: 'Aristocrat',        emoji: '🎩', hint: 'Refined, dry, musical.',               profile: [6, 1, 4, 4, 6, 9] },
  { name: 'Champagne Pop',     emoji: '🍾', hint: 'Brief, fizzy, bright.',                profile: [1, 3, 7, 2, 6, 7] },
  { name: 'Volcano',           emoji: '🌋', hint: 'Hot, sustained, smelly.',              profile: [8, 5, 9, 8, 10, 5] },
  { name: 'Toddler Trumpet',   emoji: '🎺', hint: 'Short, loud, musical.',                profile: [3, 4, 8, 5, 5, 9] },
  { name: 'Skunk Whisper',     emoji: '🦨', hint: 'Wet, quiet, biohazard-grade.',         profile: [5, 6, 2, 10, 5, 3] },
  { name: 'Trombone Slide',    emoji: '🎷', hint: 'Long, mid-volume, melodic.',           profile: [8, 2, 6, 4, 6, 10] },
];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const ms = d.getTime() - start;
  return Math.floor(ms / 86_400_000);
}

export function getDailyChallenge(d: Date = new Date()): Challenge {
  const idx = dayOfYear(d) % CHALLENGES.length;
  return CHALLENGES[idx]!;
}

const MAX_DIFF = 6 * 9; // 6 sliders, max range 1..10 → max per-slider diff 9

export function computeMatch(actual: number[], target: number[]): number {
  let total = 0;
  for (let i = 0; i < 6; i++) {
    total += Math.abs((actual[i] ?? 0) - (target[i] ?? 0));
  }
  return Math.round((1 - total / MAX_DIFF) * 100);
}
