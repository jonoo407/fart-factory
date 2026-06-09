/**
 * The fart bank grid — the SINGLE SOURCE OF TRUTH for the rebuilt launch fart.
 *
 * Replaces the old live-layered stem assembly (base rip + kazoo melody + sizzle
 * + haze drone) which didn't sound like a fart and had no audible variety
 * (91.6% of all recipes produced one base sound). See memory: audio-fart-rebuild.
 *
 * Model: 96 real ElevenLabs fart clips on a deliberate grid. Each cell is one
 * point in {length × texture × size × musical × energy}. At launch we hard-match
 * the length bucket, set gain from loudness, then nearest-neighbor on the
 * remaining fingerprint axes — so length & loud always read right, and every
 * clip is the winning pick for some recipe region (coverage is a tested property).
 *
 * `stink` deliberately does NOT bend the fart timbre — it's conveyed by the crowd
 * reaction. `energy` (clean ↔ sputtery) maps to heat/temp.
 *
 * id scheme: the `clean` half keeps the original 4-part id (g-len-tex-size-mus)
 * so the first-generation 48 clips are reused untouched; the `sputter` half adds
 * a `-sputter` suffix. The generator (scripts/fart-grid-gen.ts) imports this list
 * and attaches the locked prompt formula; the runtime selector imports the
 * fingerprints.
 */

export type LengthBucket = 'short' | 'med' | 'long' | 'epic';
export type Texture = 'wet' | 'mixed' | 'dry';
export type Size = 'small' | 'big';
export type Musical = 'plain' | 'musical';
export type Energy = 'clean' | 'sputter';

export interface FartCell {
  /** Stable id == clip filename stem, e.g. `g-med-wet-small-plain` or `...-sputter`. */
  id: string;
  length: LengthBucket;
  texture: Texture;
  size: Size;
  musical: Musical;
  energy: Energy;
  /** Normalized 0..1 fingerprint for nearest-neighbor selection. */
  fp: { texture: number; size: number; musical: number; energy: number };
  /** Generation duration hint (seconds). */
  durationSeconds: number;
}

export const LENGTHS: readonly LengthBucket[] = ['short', 'med', 'long', 'epic'];
export const TEXTURES: readonly Texture[] = ['wet', 'mixed', 'dry'];
export const SIZES: readonly Size[] = ['small', 'big'];
export const MUSICALS: readonly Musical[] = ['plain', 'musical'];
export const ENERGIES: readonly Energy[] = ['clean', 'sputter'];

/** texture fingerprint: 0 = fully wet, 1 = fully dry. */
export const TEXTURE_FP: Record<Texture, number> = { wet: 0.1, mixed: 0.5, dry: 0.9 };
/** size fingerprint: maps to normalized loudness/bigness. */
export const SIZE_FP: Record<Size, number> = { small: 0.2, big: 0.85 };
/** musical fingerprint: maps to normalized musical axis. */
export const MUSICAL_FP: Record<Musical, number> = { plain: 0.1, musical: 0.9 };
/** energy fingerprint: maps to normalized heat/temp axis. */
export const ENERGY_FP: Record<Energy, number> = { clean: 0.15, sputter: 0.85 };
/** generation duration per length bucket (seconds). */
export const LENGTH_DURATION: Record<LengthBucket, number> = { short: 0.6, med: 1.1, long: 2.3, epic: 4.2 };

function cellId(length: LengthBucket, texture: Texture, size: Size, musical: Musical, energy: Energy): string {
  const base = `g-${length}-${texture}-${size}-${musical}`;
  return energy === 'sputter' ? `${base}-sputter` : base;
}

function buildGrid(): FartCell[] {
  const cells: FartCell[] = [];
  for (const length of LENGTHS) {
    for (const texture of TEXTURES) {
      for (const size of SIZES) {
        for (const musical of MUSICALS) {
          for (const energy of ENERGIES) {
            cells.push({
              id: cellId(length, texture, size, musical, energy),
              length,
              texture,
              size,
              musical,
              energy,
              fp: {
                texture: TEXTURE_FP[texture],
                size: SIZE_FP[size],
                musical: MUSICAL_FP[musical],
                energy: ENERGY_FP[energy],
              },
              durationSeconds: LENGTH_DURATION[length],
            });
          }
        }
      }
    }
  }
  return cells;
}

export const FART_GRID: readonly FartCell[] = buildGrid();
