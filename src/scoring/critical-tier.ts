/**
 * Critical tier classification. Per PLAN_v7 T1.2.
 *
 * Adds extreme-outcome categorization so the result UI can celebrate
 * a PERFECT (≥95%) and lean into the comedy of a DISASTER (≤15% AND
 * ≥2 violations).
 */

export type MatchResult = { pct: number; violations: string[] };

export type CriticalTier = 'perfect' | 'great' | 'ok' | 'bad' | 'disaster';

export function classifyCriticalTier(m: MatchResult): CriticalTier {
  if (m.pct >= 95) return 'perfect';
  if (m.pct >= 75) return 'great';
  if (m.pct <= 15 && m.violations.length >= 2) return 'disaster';
  if (m.pct < 30) return 'bad';
  return 'ok';
}

/** Bonus gold awarded on top of the base match reward. */
export function criticalGoldBonus(tier: CriticalTier): number {
  switch (tier) {
    case 'perfect': return 5;
    case 'great':   return 2;
    default:        return 0;
  }
}

/** Bonus notes awarded as a comedy-consolation prize on DISASTER. */
export function criticalNotesBonus(tier: CriticalTier): number {
  return tier === 'disaster' ? 5 : 0;
}

export function tierLabel(tier: CriticalTier): string {
  switch (tier) {
    case 'perfect':  return '💯 PERFECT!';
    case 'great':    return '🔥 GREAT!';
    case 'disaster': return '💥 DISASTER!';
    case 'bad':      return '😬 Rough one.';
    case 'ok':       return '';
  }
}
