/**
 * V8 T5 — Pantry grid builder.
 *
 * Pure HTML construction for the launch-screen pantry. The launch-screen
 * default is now SHOW_LOCKED=false — only the player's actual pantry is
 * visible. A "🔒 Show locked teasers" toggle in the launch screen lets
 * the player expand to the full catalog.
 *
 * Extracted as a pure helper so the filtering / sort / row-render logic
 * is unit-testable independently of DOM wiring (which lives in plate.ts).
 */

import type { Food } from '../state/food';
import { masteryLevel, type MasteryLevel } from '../scoring/food-mastery';

const RARITY_ORDER: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

function rarityClassFor(food: Food): string {
  return `rarity-${food.rarity}`;
}

/**
 * Compact mastery chip for the food card. Returns null below apprentice
 * (10 uses) — only show the chip once it's earned. The chip lives in the
 * top-right corner of the card.
 */
export function masteryChip(level: MasteryLevel): { emoji: string; label: string } | null {
  switch (level) {
    case 'apprentice': return { emoji: '⭐', label: 'Apprentice' };
    case 'adept':      return { emoji: '⭐⭐', label: 'Adept' };
    case 'master':     return { emoji: '⭐⭐⭐', label: 'Master' };
    case 'legendary':  return { emoji: '👑', label: 'Legendary' };
    case 'novice':
    default:           return null;
  }
}

export interface BuildFoodCardOpts {
  locked?: boolean;
  clickable?: boolean;
  /** Mastery uses (per-food launch count). Drives the chip. */
  masteryUses?: number;
}

export function buildFoodCard(food: Food, opts: BuildFoodCardOpts): string {
  const lockedClass = opts.locked ? 'food-card-locked' : '';
  const clickableClass = opts.clickable ? 'food-card-clickable' : '';
  const aria = opts.locked
    ? `aria-label="Locked: ${food.name} (${food.rarity})" disabled`
    : `aria-label="Add ${food.name} (costs ${food.bellyCost} belly)"`;
  const emoji = opts.locked ? '❓' : food.emoji;
  const name = opts.locked ? '???' : food.name;
  const cost = opts.locked ? '?' : String(food.bellyCost);
  const tag = opts.clickable ? 'button' : 'div';
  const type = tag === 'button' ? 'type="button"' : '';
  let chipHtml = '';
  if (!opts.locked && opts.masteryUses && opts.masteryUses > 0) {
    const chip = masteryChip(masteryLevel(opts.masteryUses));
    if (chip) {
      chipHtml = `<span class="mastery-chip mastery-chip-${masteryLevel(opts.masteryUses)}" aria-label="Mastery: ${chip.label}">${chip.emoji}</span>`;
    }
  }
  return `<${tag} ${type} class="food-card ${rarityClassFor(food)} ${lockedClass} ${clickableClass}" data-food="${food.id}" ${aria}>
    <span class="food-emoji">${emoji}</span>
    <span class="food-name">${name}</span>
    <span class="food-cost">🍽️ ${cost}</span>${chipHtml}
  </${tag}>`;
}

export function buildPantryGridHtml(
  foods: readonly Food[],
  unlocked: ReadonlySet<string>,
  showLocked: boolean,
  getMasteryUses: (id: string) => number = () => 0,
): { html: string; lockedCount: number } {
  const sorted = [...foods].sort((a, b) => {
    const au = unlocked.has(a.id) ? 0 : 1;
    const bu = unlocked.has(b.id) ? 0 : 1;
    if (au !== bu) return au - bu;
    const ar = RARITY_ORDER[a.rarity] ?? 99;
    const br = RARITY_ORDER[b.rarity] ?? 99;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
  const visible = showLocked ? sorted : sorted.filter((f) => unlocked.has(f.id));
  const html = visible
    .map((f) => buildFoodCard(f, {
      locked: !unlocked.has(f.id),
      clickable: unlocked.has(f.id),
      masteryUses: unlocked.has(f.id) ? getMasteryUses(f.id) : 0,
    }))
    .join('');
  const lockedCount = sorted.filter((f) => !unlocked.has(f.id)).length;
  return { html, lockedCount };
}
