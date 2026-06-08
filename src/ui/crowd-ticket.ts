/**
 * PLAN v9 P4 / 04 §2 — the crowd ticket's "They're craving" chips. Derived
 * from the audience's cravings + restrictions via deriveWants, shown as
 * want / 🚫 no chips by AXIS LABEL only (never raw integers, doc 06 §3). Clue
 * density scales with difficultyTier so bosses stay cryptic.
 */
import { deriveWants, type Audience, type DifficultyTier } from '../state/audience';
import type { FoodProperties } from '../state/food';
import { axisEmoji } from './axis-emoji';

type AxisName = keyof FoodProperties;

export const AXIS_LABEL: Record<AxisName, string> = {
  wet: 'Wet',
  dry: 'Dry',
  stink: 'Stink',
  loud: 'Loud',
  musical: 'Tooty',
  length: 'Length',
  temp: 'Heat',
};

export interface CravingChip {
  axis: AxisName;
  type: 'want' | 'no';
}

function densityFor(aud: Audience): number {
  switch (aud.difficultyTier) {
    case 'easy': return 3;
    case 'medium': return 2;
    case 'hard': return 1;
    case 'boss': return 1;
  }
}

const DIFF_PIP_COUNT: Record<DifficultyTier, number> = { easy: 1, medium: 2, hard: 3, boss: 4 };

/** Difficulty as ●●○○ (filled = how cryptic the crowd is), 4 pips total. */
export function diffPips(tier: DifficultyTier): string {
  const n = DIFF_PIP_COUNT[tier];
  return '●'.repeat(n) + '○'.repeat(4 - n);
}

export function deriveCravingChips(aud: Audience): CravingChip[] {
  const wants = deriveWants(aud);
  const chips: CravingChip[] = [];
  // Hated axes always show as 🚫 no chips (a "no-X" rule is a strong tell).
  for (const w of wants) if (w.hate) chips.push({ axis: w.axis, type: 'no' });
  // The strongest positive cravings, capped by clue density.
  const positives = wants
    .filter((w) => !w.hate)
    .sort((a, b) => b.target - a.target)
    .slice(0, densityFor(aud));
  for (const w of positives) chips.push({ axis: w.axis, type: 'want' });
  return chips;
}

export function renderCravingChipsHtml(aud: Audience): string {
  const chips = deriveCravingChips(aud)
    .map(
      (c) =>
        `<span class="craving-chip ${c.type}">${c.type === 'no' ? '🚫 ' : ''}${axisEmoji(c.axis)} ${AXIS_LABEL[c.axis]}</span>`,
    )
    .join('');
  return `<div class="craving-label">They’re craving</div><div class="craving-chips">${chips}</div>`;
}
