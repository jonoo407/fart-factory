/**
 * Hidden plate-combo Easter eggs. Per PLAN_v7 T4.1.
 *
 * Detects specific "stupid" plates and rewards them. The kid-discovery
 * moments. Triggers AFTER match math but before the result panel renders.
 */

import { getFood } from '../state/food';

export interface HiddenCombo {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  bonusGold: number;
  bonusNotes: number;
  guaranteedDrop: boolean;
  guaranteedPerfect: boolean;
}

const DAIRY_IDS = new Set(['cheese', 'aged-stilton', 'casu-marzu', 'kviek-yogurt', 'natto']);

export function detectHiddenCombo(ids: string[]): HiddenCombo | null {
  if (ids.length === 0) return null;
  // CHEESEPOCALYPSE — 4 dairy foods on plate.
  const dairyCount = ids.filter((id) => DAIRY_IDS.has(id)).length;
  if (dairyCount >= 4) {
    return {
      id: 'cheesepocalypse',
      name: '🧀 CHEESEPOCALYPSE',
      emoji: '🧀',
      flavor: 'You ate FOUR dairy items. The world tilts. Cheese rains from above.',
      bonusGold: 25,
      bonusNotes: 0,
      guaranteedDrop: true,
      guaranteedPerfect: false,
    };
  }

  // BENDER — single food repeated 4+ times.
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [, n] of counts) {
    if (n >= 4) {
      return {
        id: 'bender',
        name: '🍻 BENDER',
        emoji: '🍻',
        flavor: 'Four of the same food?? You have committed. The audience applauds your discipline.',
        bonusGold: 15,
        bonusNotes: 10,
        guaranteedDrop: false,
        guaranteedPerfect: false,
      };
    }
  }

  // LEGENDARY ALIGNMENT — all legendary foods, ≥3 of them.
  if (ids.length >= 3 && ids.every((id) => getFood(id)?.rarity === 'legendary')) {
    return {
      id: 'legendary-alignment',
      name: '👑 LEGENDARY ALIGNMENT',
      emoji: '👑',
      flavor: 'Three legendary foods aligned. The universe SHIFTS to accommodate your fart.',
      bonusGold: 50,
      bonusNotes: 25,
      guaranteedDrop: true,
      guaranteedPerfect: true,
    };
  }

  return null;
}
