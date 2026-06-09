/**
 * Hidden plate-combo Easter eggs. Per PLAN_v7 T4.1 + PR4 expansion.
 *
 * Detects specific "stupid" or "clever" plates and rewards them. The
 * kid-discovery moments. Triggers AFTER match math but before the result
 * panel renders. Only the first matching combo (top-of-file order = most
 * specific first) fires per launch.
 */

import { getFood, type FoodProperties } from '../state/food';

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

/**
 * Optional context the detector can read. Plate-only combos ignore this;
 * context-aware combos (per-area, per-audience, mastery, streak) read it.
 * All fields optional so existing callers that only pass ids still work.
 */
export interface ComboContext {
  audienceId?: string;
  areaId?: string;
  /** Lookup mastery uses per food id (defaults to 0). */
  getMasteryUses?: (id: string) => number;
  /** Streak entering this launch. */
  streak?: number;
  /** Match% (used by streak-finisher / similar). */
  matchPct?: number;
}

const DAIRY_IDS = new Set(['cheese', 'aged-stilton', 'casu-marzu', 'kviek-yogurt', 'natto']);

const AXES: ReadonlyArray<keyof FoodProperties> = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

function dominantAxis(props: FoodProperties): keyof FoodProperties {
  let best: keyof FoodProperties = 'wet';
  let bestVal = -1;
  for (const a of AXES) {
    if (props[a] > bestVal) {
      bestVal = props[a];
      best = a;
    }
  }
  return best;
}

function sumAxis(ids: string[], axis: keyof FoodProperties): number {
  let total = 0;
  for (const id of ids) {
    const f = getFood(id);
    if (f) total += f.properties[axis];
  }
  return total;
}

function uniqueRarities(ids: string[]): Set<string> {
  const set = new Set<string>();
  for (const id of ids) {
    const f = getFood(id);
    if (f) set.add(f.rarity);
  }
  return set;
}

export function detectHiddenCombo(ids: string[], ctx: ComboContext = {}): HiddenCombo | null {
  if (ids.length === 0) return null;

  // ===== Most specific first =====

  // GRANNY-DAIRY-TEA — Granny audience + 4+ dairy items.
  if (ctx.audienceId === 'granny-edna') {
    const dairyCount = ids.filter((id) => DAIRY_IDS.has(id)).length;
    if (dairyCount >= 4) {
      return {
        id: 'granny-dairy-tea',
        name: '🫖 GRANNY\'S DAIRY TEA',
        emoji: '🫖',
        flavor: 'Granny recognizes the dairy. She winks. She has SEEN things.',
        bonusGold: 35,
        bonusNotes: 10,
        guaranteedDrop: true,
        guaranteedPerfect: false,
      };
    }
  }

  // VOLCANIC-REVELRY — Volcano Rim + 3+ hot foods (temp ≥ 4).
  if (ctx.areaId === 'volcano-rim') {
    const hot = ids.filter((id) => (getFood(id)?.properties.temp ?? 0) >= 4).length;
    if (hot >= 3) {
      return {
        id: 'volcanic-revelry',
        name: '🌋 VOLCANIC REVELRY',
        emoji: '🌋',
        flavor: 'The magma god approves of your offering. The mountain rumbles in time with your fart.',
        bonusGold: 30,
        bonusNotes: 8,
        guaranteedDrop: false,
        guaranteedPerfect: false,
      };
    }
  }

  // LIBRARY-QUIET — Library area + summed loud ≤ 4.
  if (ctx.areaId === 'library' && ids.length >= 3) {
    if (sumAxis(ids, 'loud') <= 4) {
      return {
        id: 'library-quiet',
        name: '🤫 LIBRARY WHISPER',
        emoji: '📚',
        flavor: 'A perfectly silent recital. The librarians lower their glasses in approval.',
        bonusGold: 20,
        bonusNotes: 12,
        guaranteedDrop: false,
        guaranteedPerfect: false,
      };
    }
  }

  // COSMIC-LONELINESS — single legendary on plate, cosmic-region area.
  if (
    ids.length === 1 &&
    getFood(ids[0]!)?.rarity === 'legendary' &&
    ctx.areaId &&
    ['space', 'cloud-kingdom', 'alien-bar', 'quantum-lab'].includes(ctx.areaId)
  ) {
    return {
      id: 'cosmic-loneliness',
      name: '🌌 COSMIC LONELINESS',
      emoji: '🌌',
      flavor: 'One legendary food. The vastness of space. Profound.',
      bonusGold: 25,
      bonusNotes: 15,
      guaranteedDrop: true,
      guaranteedPerfect: false,
    };
  }

  // CHEESEPOCALYPSE — 4+ dairy foods.
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

  // BENDER — same food repeated 4+ times.
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

  // LEGENDARY ALIGNMENT — ≥3 legendary foods, all legendary.
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

  // MASTERED-PLATE — every food on plate is mastery ≥ adept (25 uses).
  if (ids.length >= 3 && ctx.getMasteryUses) {
    const getUses = ctx.getMasteryUses;
    if (ids.every((id) => getUses(id) >= 25)) {
      return {
        id: 'mastered-plate',
        name: '🎓 MASTERED PLATE',
        emoji: '🎓',
        flavor: 'Every food is one you have practiced. The plate moves like muscle memory.',
        bonusGold: 22,
        bonusNotes: 12,
        guaranteedDrop: false,
        guaranteedPerfect: false,
      };
    }
  }

  // RAINBOW-PLATE — 4 foods, each a different rarity.
  if (ids.length === 4 && uniqueRarities(ids).size === 4) {
    return {
      id: 'rainbow-plate',
      name: '🌈 RAINBOW PLATE',
      emoji: '🌈',
      flavor: 'A food from four different rarities. The audience does not know what to do.',
      bonusGold: 28,
      bonusNotes: 14,
      guaranteedDrop: true,
      guaranteedPerfect: false,
    };
  }

  // ALL-SPICY-QUARTET — 4+ foods, each temp ≥ 4.
  if (ids.length >= 4 && ids.every((id) => (getFood(id)?.properties.temp ?? 0) >= 4)) {
    return {
      id: 'all-spicy-quartet',
      name: '🌶️ FOUR-ALARM PLATE',
      emoji: '🌶️',
      flavor: 'Every food is HOT. You are sweating. The audience is sweating.',
      bonusGold: 22,
      bonusNotes: 8,
      guaranteedDrop: false,
      guaranteedPerfect: false,
    };
  }

  // SWAMP-OVERLOAD — 4+ foods, each wet ≥ 4.
  if (ids.length >= 4 && ids.every((id) => (getFood(id)?.properties.wet ?? 0) >= 4)) {
    return {
      id: 'swamp-overload',
      name: '🐊 SWAMP OVERLOAD',
      emoji: '🐊',
      flavor: 'Soggy. Damp. Squelching. The audience steps back, slowly.',
      bonusGold: 20,
      bonusNotes: 10,
      guaranteedDrop: false,
      guaranteedPerfect: false,
    };
  }

  // DRY-BONE — 4+ foods, each dry ≥ 2. The original threshold (≥ 4) was
  // undiscoverable: no food in the catalog has dry > 3, and a 4×pan-pipe-pea
  // plate (the only all-dry-3 option) is intercepted by BENDER above. dry ≥ 2
  // keeps it rare (a deliberate all-dry varied plate) but actually findable.
  if (ids.length >= 4 && ids.every((id) => (getFood(id)?.properties.dry ?? 0) >= 2)) {
    return {
      id: 'dry-bone',
      name: '🦴 DRY-BONE PLATE',
      emoji: '🦴',
      flavor: 'A desert wind passes through the room. Lips are chapped. Mouths are dust.',
      bonusGold: 20,
      bonusNotes: 10,
      guaranteedDrop: false,
      guaranteedPerfect: false,
    };
  }

  // BOSS-FAVORITE-STACK — 3+ foods whose dominant axis matches.
  if (ids.length >= 3) {
    const dominants = ids.map((id) => {
      const f = getFood(id);
      return f ? dominantAxis(f.properties) : null;
    });
    const first = dominants[0];
    if (first && dominants.every((d) => d === first)) {
      return {
        id: 'aligned-axes',
        name: '🎯 ALIGNED AXES',
        emoji: '🎯',
        flavor: `Every food on the plate leans the same direction: ${first.toUpperCase()}. Pure focus.`,
        bonusGold: 18,
        bonusNotes: 10,
        guaranteedDrop: false,
        guaranteedPerfect: false,
      };
    }
  }

  // STREAK-FINISHER — ≥5 streak coming in.
  if ((ctx.streak ?? 0) >= 5) {
    return {
      id: 'streak-finisher',
      name: '🔥 STREAK FINISHER',
      emoji: '🔥',
      flavor: 'Five in a row. Whatever you just plated, the audience is already on your side.',
      bonusGold: 24,
      bonusNotes: 6,
      guaranteedDrop: false,
      guaranteedPerfect: false,
    };
  }

  return null;
}

/**
 * Stable catalog of all combo metadata for notebook rendering. Source of
 * truth for the silhouette list — order matches detection precedence above.
 */
export const HIDDEN_COMBO_CATALOG: ReadonlyArray<{
  id: string;
  name: string;
  emoji: string;
  hint: string;
}> = [
  { id: 'granny-dairy-tea',    name: '🫖 GRANNY\'S DAIRY TEA',    emoji: '🫖', hint: 'A specific audience appreciates a certain food group.' },
  { id: 'volcanic-revelry',    name: '🌋 VOLCANIC REVELRY',       emoji: '🌋', hint: 'Some places want their food hot.' },
  { id: 'library-quiet',       name: '🤫 LIBRARY WHISPER',        emoji: '📚', hint: 'A quiet plate in a quiet place.' },
  { id: 'cosmic-loneliness',   name: '🌌 COSMIC LONELINESS',      emoji: '🌌', hint: 'One food, alone, in deep space.' },
  { id: 'cheesepocalypse',     name: '🧀 CHEESEPOCALYPSE',        emoji: '🧀', hint: 'Four of the same food group can break reality.' },
  { id: 'bender',              name: '🍻 BENDER',                 emoji: '🍻', hint: 'Commit. Four times.' },
  { id: 'legendary-alignment', name: '👑 LEGENDARY ALIGNMENT',    emoji: '👑', hint: 'Stack three legendary foods.' },
  { id: 'mastered-plate',      name: '🎓 MASTERED PLATE',         emoji: '🎓', hint: 'Practice every food on the plate.' },
  { id: 'rainbow-plate',       name: '🌈 RAINBOW PLATE',          emoji: '🌈', hint: 'A different rarity in each plate slot.' },
  { id: 'all-spicy-quartet',   name: '🌶️ FOUR-ALARM PLATE',       emoji: '🌶️', hint: 'Four foods that all run hot.' },
  { id: 'swamp-overload',      name: '🐊 SWAMP OVERLOAD',         emoji: '🐊', hint: 'Four foods that all run wet.' },
  { id: 'dry-bone',            name: '🦴 DRY-BONE PLATE',         emoji: '🦴', hint: 'Four foods that all run dry.' },
  { id: 'aligned-axes',        name: '🎯 ALIGNED AXES',           emoji: '🎯', hint: 'Three foods that share their strongest property.' },
  { id: 'streak-finisher',     name: '🔥 STREAK FINISHER',        emoji: '🔥', hint: 'Earned mid-streak — keep the momentum.' },
];

