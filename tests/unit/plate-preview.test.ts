import { describe, it, expect } from 'vitest';
import { renderPlatePreviewHtml } from '../../src/ui/plate-preview';
import type { FoodProperties } from '../../src/state/food';
import type { AxisName } from '../../src/state/axis-discovery';

const props = (
  wet: number, dry: number, stink: number, loud: number,
  musical: number, length: number, temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

/**
 * V8 T2 — Plate property preview (mastery-aware).
 *
 * The "🔮 PREDICTION" card above the plate slots shows the running fart
 * property total as foods are added. Has two confidence states:
 * - confident: every food on the plate is Apprentice+ mastery (≥10 uses)
 * - uncertain: at least one food is Novice mastery (<10 uses), so the
 *   number on the bar isn't fully trustworthy.
 *
 * Like the Fart Profile, bars render only for axes the player has
 * already DISCOVERED (Scheme 1 progressive reveal).
 */

describe('renderPlatePreviewHtml (V8 T2)', () => {
  it('returns a non-empty HTML string', () => {
    const html = renderPlatePreviewHtml(
      props(3, 0, 3, 2, 0, 0, 0),
      ['wet', 'loud', 'stink'],
      false,
    );
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(20);
  });

  it('includes the 🔮 PREDICTION header', () => {
    const html = renderPlatePreviewHtml(props(0, 0, 0, 0, 0, 0, 0), [], false);
    expect(html).toMatch(/🔮/);
    expect(html).toMatch(/PREDICTION/);
  });

  it('uncertain=true adds an "UNCERTAIN" cue', () => {
    const html = renderPlatePreviewHtml(
      props(3, 0, 3, 2, 0, 0, 0),
      ['wet', 'loud', 'stink'],
      true,
    );
    expect(html).toMatch(/UNCERTAIN/i);
  });

  it('uncertain=false omits the uncertainty cue', () => {
    const html = renderPlatePreviewHtml(
      props(3, 0, 3, 2, 0, 0, 0),
      ['wet', 'loud', 'stink'],
      false,
    );
    expect(html).not.toMatch(/UNCERTAIN/i);
  });

  it('applies a CSS marker for uncertain state', () => {
    const uncertainHtml = renderPlatePreviewHtml(props(1, 0, 1, 0, 0, 0, 0), ['wet', 'stink'], true);
    const confidentHtml = renderPlatePreviewHtml(props(1, 0, 1, 0, 0, 0, 0), ['wet', 'stink'], false);
    expect(uncertainHtml).toMatch(/plate-preview-uncertain/);
    expect(confidentHtml).toMatch(/plate-preview-confident/);
  });

  it('renders bars only for discovered axes', () => {
    const html = renderPlatePreviewHtml(
      props(3, 4, 3, 2, 5, 4, 2),
      ['wet', 'loud', 'stink'],
      false,
    );
    expect(html).toMatch(/data-axis="wet"/);
    expect(html).toMatch(/data-axis="loud"/);
    expect(html).toMatch(/data-axis="stink"/);
    expect(html).not.toMatch(/data-axis="musical"/);
    expect(html).not.toMatch(/data-axis="length"/);
  });

  it('renders all 7 bars when every axis is discovered', () => {
    const allAxes: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
    const html = renderPlatePreviewHtml(props(1, 2, 3, 4, 5, 4, 3), allAxes, false);
    for (const a of allAxes) {
      expect(html).toMatch(new RegExp(`data-axis="${a}"`));
    }
  });

  it('encodes property value on each bar', () => {
    const html = renderPlatePreviewHtml(
      props(3, 0, 5, 2, 0, 0, 0),
      ['wet', 'loud', 'stink'],
      false,
    );
    expect(html).toMatch(/data-axis="stink"[^>]*data-value="5"/);
  });
});
