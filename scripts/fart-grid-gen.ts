/**
 * Generate the fart bank from src/audio/fart-grid.ts using the LOCKED prompt
 * formula (validated over pilots + a 48-clip QC round — see memory:
 * audio-fart-rebuild).
 *
 * Writes to public/sfx-grid/ (its own manifest). The real public/sfx bank is
 * untouched until QC passes. Audition at /fart-factory/fart-audition-grid.html.
 *
 *   npx tsx scripts/fart-grid-gen.ts                 # all 96
 *   npx tsx scripts/fart-grid-gen.ts --new           # only cells whose clip is missing
 *   npx tsx scripts/fart-grid-gen.ts g-med-wet-...   # only the listed ids (dud re-roll)
 *   npx tsx scripts/fart-grid-gen.ts --new g-med-wet-small-plain   # missing ∪ listed
 *
 * Needs ELEVENLABS_API_KEY in .env.
 *
 * Prompt learnings baked into promptFor():
 *  - never name an instrument/animal/object (renders the literal thing)
 *  - dry = buzzy lip-flutter raspberry, never a papery "rip"
 *  - SIZE is folded INLINE into the noun phrase, never a standalone clause
 *    (a separate size clause over-specifies + muddies wet/mixed)
 *  - never "squeaky" (→ spring); use "little high-pitched"
 *  - long uses "drawn-out … trails off", not "keeps going" (burp-drift)
 *  - epic wet/mixed MUST fade out + "no mechanical buzzing"; epic dry is "continuous unbroken"
 *  - the tooty/musical clause goes AFTER the raspberry descriptor
 */
import 'dotenv/config';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { generateSfx } from './generate-sfx';
import { FART_GRID, type FartCell, type Texture, type Size } from '../src/audio/fart-grid';
import type { Seed } from './sfx-seeds';

const TEX: Record<Texture, { adj: string; rasp: string }> = {
  wet: { adj: 'wet juicy bubbly', rasp: 'loose flubbering mouth raspberry' },
  mixed: { adj: 'juicy flubbering', rasp: 'wet raspberry with a buzzy fluttering edge' },
  dry: { adj: 'dry buzzy', rasp: 'fluttering lip raspberry' },
};
const SIZE_INLINE: Record<Size, string> = { small: 'little high-pitched', big: 'big deep low-pitched' };
const TAIL = ', comedic, clean studio recording, no music';

// SPUTTER formula — the first sputter batch leaned on "deep low-pitched / heavy
// bassy / putters", which ElevenLabs rendered as a low "deep-voiced burp /
// motorboat" the player rejected ("so much bass a butt never sounds like that").
// Sputter is now a LIGHT, poppy run of little toots with NO bass/low language.
const SPUTTER_SIZE: Record<Size, string> = { small: 'small light', big: 'big full' };
const SPUTTER_TEX: Record<Texture, string> = { wet: 'wet juicy', mixed: 'wet buzzy', dry: 'dry buzzy' };
const SPUTTER_TAIL = ', light and poppy, not a deep burp, no heavy bass, comedic, clean studio recording, no music';

/** Compose the prompt for a grid cell from the locked fragments. */
export function promptFor(cell: FartCell): string {
  const tex = TEX[cell.texture];
  const sizeWord = SIZE_INLINE[cell.size];
  const bass = cell.size === 'big' ? 'heavy bassy ' : '';
  const raspBase = `${bass}${tex.rasp}`;
  const mus = cell.musical === 'musical'
    ? ', tooty and pitched so the raspberry rises and falls like it is almost humming a tune'
    : '';

  // SPUTTER — a light, quick run of poppy little fart toots. Deliberately NO
  // deep/low/bass language (that produced the rejected deep-burp / motorboat).
  if (cell.energy === 'sputter') {
    const sz = SPUTTER_SIZE[cell.size];
    const run = `a quick run of little poppy ${SPUTTER_TEX[cell.texture]} raspberry toots one right after another, putt putt putt`;
    if (cell.length === 'epic') {
      return `a long ${sz} cartoon fart, ${run}, that gradually fades out into a soft breathy puff${mus}${SPUTTER_TAIL}`;
    }
    const sLead = cell.length === 'short' ? 'a quick short' : cell.length === 'med' ? 'a medium' : 'a long';
    return `${sLead} ${sz} cartoon fart, ${run}${mus}${SPUTTER_TAIL}`;
  }

  // CLEAN path (all 48 clean cells passed QC — unchanged).
  // EPIC dry — "continuous unbroken" reads long; dry stays clean (no fade needed).
  if (cell.length === 'epic' && cell.texture === 'dry') {
    return `an enormous continuous unbroken ${sizeWord} dry buzzy cartoon fart that goes on and on without stopping for a long time, sustained ${raspBase}${mus}${TAIL}`;
  }
  // EPIC wet/mixed — MUST fade out (long wet "goes on" drifts to a burp + mechanical tail).
  if (cell.length === 'epic') {
    return `a long ${sizeWord} ${tex.adj} cartoon fart that rips loosely and then gradually fades out and dies away into a soft breathy puff, ${raspBase}${mus}${TAIL}, no mechanical buzzing`;
  }
  const lead = cell.length === 'short' ? 'a quick short' : cell.length === 'med' ? 'a medium' : 'a long drawn-out';
  const rasp = cell.length === 'long' ? `a sustained ${raspBase} that trails off` : raspBase;
  return `${lead} ${sizeWord} ${tex.adj} cartoon fart, ${rasp}${mus}${TAIL}`;
}

/**
 * Per-cell overrides — a cell whose default-formula clip failed QC gets a
 * hand-vetted alternate take here (wins over promptFor). g-med-wet-small-plain
 * survived two formula attempts as a dud, so it gets a deliberately different
 * take (drop "high-pitched", lean soft) rather than another same-ish re-roll.
 */
const OVERRIDES: Record<string, string> = {
  'g-med-wet-small-plain': 'a medium soft wet juicy bubbly cartoon fart, a gentle loose flubbering mouth raspberry, comedic, clean studio recording, no music',
  // sputter round 2 duds: "toots"/"buzzy" read as a dry kazoo/horn — drop them,
  // push wet/flubbery hard, add an anti-kazoo guard.
  'g-med-wet-big-musical-sputter': 'a medium big wet juicy bubbly cartoon fart, a quick run of little wet squelchy flubbering raspberry bursts one right after another, putt putt putt, juicy and sloppy, tooty and pitched so it rises and falls like it is almost humming a tune, light and poppy, not a deep burp, no heavy bass, comedic, clean studio recording, no music',
  'g-epic-mixed-small-plain-sputter': 'a long small light wet juicy cartoon fart, a quick run of little wet flubbering raspberry bursts one right after another, putt putt putt, that gradually fades out into a soft breathy puff, light and poppy, not a deep burp, no heavy bass, not a kazoo, not a horn, comedic, clean studio recording, no music',
};

const outDir = resolve('public/sfx-grid');

const argv = process.argv.slice(2);
const wantNew = argv.includes('--new');
const explicit = new Set(argv.filter((a) => !a.startsWith('--')));

let cells: readonly FartCell[];
if (wantNew || explicit.size) {
  cells = FART_GRID.filter(
    (c) => explicit.has(c.id) || (wantNew && !existsSync(resolve(outDir, `${c.id}.mp3`))),
  );
} else {
  cells = FART_GRID;
}

const seeds: Seed[] = cells.map((c) => ({
  kind: 'sfx',
  id: c.id,
  name: c.id,
  prompt: OVERRIDES[c.id] ?? promptFor(c),
  duration_seconds: c.durationSeconds,
  mood: 'comedic',
  category: 'fart',
}));

if (!(process.env.ELEVENLABS_API_KEY ?? '')) {
  console.error('ELEVENLABS_API_KEY missing in .env — aborting (no cost).');
  process.exit(1);
}
console.log(`Generating ${seeds.length} clip(s) → ${outDir}`);
const result = await generateSfx({ seeds, outDir, hardCap: seeds.length });
console.log(`\nGrid gen done — ${result.entries.length} clips, ${result.calls} API calls.`);
console.log('Audition: http://localhost:5173/fart-factory/fart-audition-grid.html');
