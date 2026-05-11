import { describe, it, expect } from 'vitest';
import { nameFart } from '../../src/scoring/fart-namer';
import type { FoodProperties } from '../../src/state/food';

/**
 * V8 T1.a — fart-namer
 *
 * Given a property vector, return a comedic name based on the
 * dominant axes + total intensity. Deterministic: same input → same name.
 */

const props = (
  wet: number, dry: number, stink: number, loud: number,
  musical: number, length: number, temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

describe('nameFart (V8 T1.a)', () => {
  it('returns a non-empty string for any valid input', () => {
    const cases: FoodProperties[] = [
      props(0, 0, 0, 0, 0, 0, 0),
      props(5, 5, 5, 5, 5, 5, 5),
      props(3, 0, 3, 2, 0, 3, 1),
      props(1, 1, 1, 1, 1, 1, 1),
      props(0, 0, 0, 5, 5, 0, 0),
    ];
    for (const c of cases) {
      const name = nameFart(c);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic — same input returns same name', () => {
    const p = props(3, 0, 3, 2, 0, 5, 1);
    expect(nameFart(p)).toBe(nameFart(p));
    expect(nameFart(p)).toBe(nameFart(p));
  });

  it('all-zero input returns a humble/quiet name', () => {
    const name = nameFart(props(0, 0, 0, 0, 0, 0, 0));
    expect(name).toMatch(/Mouse|Polite|Whisper|Squeak|Cough|Hush|Silent|Wee/i);
  });

  it('musical + length dominant → musical-family name', () => {
    const name = nameFart(props(0, 0, 0, 0, 5, 5, 0));
    expect(name).toMatch(/Aria|Sonata|Hymn|Vespers|Cantata|Opus|Symphony|Lullaby/i);
  });

  it('stink + wet dominant → swamp-family name', () => {
    const name = nameFart(props(5, 0, 5, 0, 0, 0, 0));
    expect(name).toMatch(/Bog|Swamp|Marsh|Sludge|Mire|Brine/i);
  });

  it('loud + stink dominant → blast-family name', () => {
    const name = nameFart(props(0, 0, 5, 5, 0, 0, 0));
    expect(name).toMatch(/Blast|Honk|Roar|Bellow|Bomb|Detonation|Salvo/i);
  });

  it('temp + stink dominant → fire-family name', () => {
    const name = nameFart(props(0, 0, 5, 0, 0, 0, 5));
    expect(name).toMatch(/Brimstone|Inferno|Cinder|Coal|Ember|Crucible|Furnace/i);
  });

  it('dry + loud dominant → snap-family name', () => {
    const name = nameFart(props(0, 5, 0, 5, 0, 0, 0));
    expect(name).toMatch(/Snap|Pop|Crack|Trumpet|Whip|Crackle/i);
  });

  it('high-intensity fart (sum >= 28) gets a big/cosmic modifier', () => {
    const name = nameFart(props(5, 5, 5, 5, 5, 5, 5));
    expect(name).toMatch(/Cosmic|Apocalyptic|Legendary|Mighty|Glorious|Eternal|Forbidden|Grand|Almighty/i);
  });

  it('low-intensity fart (sum <= 4) gets a tiny/polite modifier', () => {
    const name = nameFart(props(1, 0, 1, 0, 1, 0, 0));
    expect(name).toMatch(/Tiny|Polite|Modest|Wee|Little|Gentle|Quiet|Bashful/i);
  });

  it('different dominant pairs yield different names', () => {
    const musical = nameFart(props(0, 0, 0, 0, 5, 5, 0));
    const swamp = nameFart(props(5, 0, 5, 0, 0, 0, 0));
    const inferno = nameFart(props(0, 0, 5, 0, 0, 0, 5));
    const blast = nameFart(props(0, 0, 5, 5, 0, 0, 0));
    expect(new Set([musical, swamp, inferno, blast]).size).toBe(4);
  });

  it('starts with "The " for consistency with named-recipes style', () => {
    const name = nameFart(props(3, 0, 3, 2, 0, 5, 1));
    expect(name.startsWith('The ')).toBe(true);
  });
});
