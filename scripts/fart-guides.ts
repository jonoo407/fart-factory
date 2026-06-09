/**
 * Reproduction guides — run curated plates through the REAL selector and print
 * the fart each produces, so the guides match the game exactly.
 *   npx tsx scripts/fart-guides.ts
 */
import { computeFartFromPlate } from '../src/scoring/fart-recipe';
import { selectFartCellId } from '../src/audio/fart-select';
import { getFood } from '../src/state/food';

const PLATES: [string, string[]][] = [
  ['1 Bean (a quick toot)', ['beans']],
  ['2 Beans', ['beans', 'beans']],
  ['3 Beans', ['beans', 'beans', 'beans']],
  ['4 Beans (long rumble)', ['beans', 'beans', 'beans', 'beans']],
  ['4 Cabbage (epic)', ['cabbage', 'cabbage', 'cabbage', 'cabbage']],
  ['4 Garlic (dry + hot)', ['garlic', 'garlic', 'garlic', 'garlic']],
  ['4 Onion', ['onion', 'onion', 'onion', 'onion']],
  ['4 Broccoli (musical)', ['broccoli', 'broccoli', 'broccoli', 'broccoli']],
  ['2 Zap Pea (loud + musical + hot)', ['zap-pea', 'zap-pea']],
  ['4 Zap Pea', ['zap-pea', 'zap-pea', 'zap-pea', 'zap-pea']],
  ['4 Cracker Crumb (long, dry, quiet)', ['crumb', 'crumb', 'crumb', 'crumb']],
  ['2 Hot Pepper (short + sputter)', ['hot-pepper', 'hot-pepper']],
  ['4 Hot Pepper', ['hot-pepper', 'hot-pepper', 'hot-pepper', 'hot-pepper']],
  ['Beans + Cheese + Cabbage + Garlic', ['beans', 'cheese', 'cabbage', 'garlic']],
  ['4 Sardines (wet)', ['sardines', 'sardines', 'sardines', 'sardines']],
];

function desc(ids: string[]): string {
  const p = computeFartFromPlate(ids).props;
  return `len${p.length} wet${p.wet}/dry${p.dry} loud${p.loud} mus${p.musical} temp${p.temp}`;
}

console.log('Plate'.padEnd(36), 'clip'.padEnd(34), 'raw props');
for (const [label, ids] of PLATES) {
  if (!ids.every((id) => getFood(id))) { console.log(`${label.padEnd(36)} (unknown food — skipped)`); continue; }
  const cell = selectFartCellId(computeFartFromPlate(ids).props);
  console.log(`${label.padEnd(36)} ${cell.padEnd(34)} ${desc(ids)}`);
}
