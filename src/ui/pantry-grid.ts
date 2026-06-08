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

import type { Food, FoodProperties } from '../state/food';
import { masteryLevel, type MasteryLevel } from '../scoring/food-mastery';
import { axisEmoji } from './axis-emoji';

type AxisName = keyof FoodProperties;
const PAX_ORDER: readonly AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

/**
 * PLAN v9 P3 / 01 §6.2 — the inline learned-axis strip. Shows discovered axes
 * (emoji + true value), `·` for each still-hidden non-zero axis, and a ✨ on a
 * never-launched food, so the player reads a food's known properties without
 * opening the Field Guide.
 */
function paxStripHtml(food: Food, revealed: ReadonlySet<AxisName>, uses: number): string {
  const nonzero = PAX_ORDER.filter((ax) => food.properties[ax] > 0);
  const known = nonzero.filter((ax) => revealed.has(ax));
  const hidden = nonzero.length - known.length;
  const newDot = uses === 0 ? '<span class="pax-new">✨</span>' : '';
  const items = known.map((ax) => `<span class="pax-i">${axisEmoji(ax)}<b>${food.properties[ax]}</b></span>`).join('');
  const dots = hidden > 0 ? `<span class="pax-q">${'·'.repeat(hidden)}</span>` : '';
  return `<span class="pax">${newDot}${items}${dots}</span>`;
}

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
  /** PLAN v9 P3 — per-food revealed axes for the inline learned-axis strip. */
  revealedAxes?: readonly AxisName[];
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
  const paxHtml = opts.locked
    ? ''
    : paxStripHtml(food, new Set(opts.revealedAxes ?? []), opts.masteryUses ?? 0);
  // PLAN v9 UI-overhaul Phase 4 — a small rarity dot in the tile's top-right.
  const rarDot = opts.locked ? '' : '<span class="rar" aria-hidden="true"></span>';
  return `<${tag} ${type} class="food-card ${rarityClassFor(food)} ${lockedClass} ${clickableClass}" data-food="${food.id}" ${aria}>
    ${rarDot}<span class="food-emoji">${emoji}</span>
    <span class="food-name">${name}</span>
    <span class="food-cost">🍽️ ${cost}</span>${chipHtml}${paxHtml}
  </${tag}>`;
}

export function buildPantryGridHtml(
  foods: readonly Food[],
  unlocked: ReadonlySet<string>,
  showLocked: boolean,
  getMasteryUses: (id: string) => number = () => 0,
  getRevealedAxes: (id: string) => readonly AxisName[] = () => [],
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
      revealedAxes: unlocked.has(f.id) ? getRevealedAxes(f.id) : [],
    }))
    .join('');
  const lockedCount = sorted.filter((f) => !unlocked.has(f.id)).length;
  return { html, lockedCount };
}
