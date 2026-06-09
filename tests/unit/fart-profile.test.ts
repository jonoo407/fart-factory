import { describe, it, expect } from 'vitest';
import { renderFartProfileHtml } from '../../src/ui/fart-profile';
import type { FoodProperties } from '../../src/state/food';
import type { AxisName } from '../../src/state/axis-discovery';

const props = (
  wet: number, dry: number, stink: number, loud: number,
  musical: number, length: number, temp: number,
): FoodProperties => ({ wet, dry, stink, loud, musical, length, temp });

/**
 * V8 T1.c — FartProfileCard pure render
 *
 * Given a fart's property vector + the discovered-axis list, returns HTML
 * containing:
 *   - The named fart (from nameFart)
 *   - A bar for EACH DISCOVERED AXIS ONLY (Scheme 1 progressive reveal)
 *   - The numeric value (0-5) on each bar
 */

describe('renderFartProfileHtml (V8 T1.c)', () => {
  it('returns a non-empty HTML string', () => {
    const html = renderFartProfileHtml(props(3, 0, 3, 2, 0, 0, 0), ['wet', 'loud', 'stink']);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(20);
  });

  it('includes the named fart from nameFart', () => {
    const html = renderFartProfileHtml(props(3, 0, 3, 2, 0, 0, 0), ['wet', 'loud', 'stink']);
    // The name always starts with "The "; we don't lock to a specific
    // template name here.
    expect(html).toMatch(/The [A-Z][a-zA-Z ]+/);
  });

  it('includes the 🚀 YOUR FART label', () => {
    const html = renderFartProfileHtml(props(3, 0, 3, 2, 0, 0, 0), ['wet', 'loud', 'stink']);
    expect(html).toMatch(/YOUR FART/);
  });

  it('renders a bar only for axes in the discovered list (default 3)', () => {
    const html = renderFartProfileHtml(
      props(3, 4, 3, 2, 5, 4, 2),
      ['wet', 'loud', 'stink'],
    );
    // Discovered axes present
    expect(html).toMatch(/data-axis="wet"/);
    expect(html).toMatch(/data-axis="loud"/);
    expect(html).toMatch(/data-axis="stink"/);
    // Undiscovered axes absent
    expect(html).not.toMatch(/data-axis="dry"/);
    expect(html).not.toMatch(/data-axis="musical"/);
    expect(html).not.toMatch(/data-axis="length"/);
    expect(html).not.toMatch(/data-axis="temp"/);
  });

  it('renders all 7 bars when every axis is discovered', () => {
    const allAxes: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
    const html = renderFartProfileHtml(props(1, 2, 3, 4, 5, 4, 3), allAxes);
    for (const a of allAxes) {
      expect(html).toMatch(new RegExp(`data-axis="${a}"`));
    }
  });

  it('encodes the value 0-5 on each bar via data-value', () => {
    const html = renderFartProfileHtml(
      props(3, 0, 5, 2, 0, 0, 0),
      ['wet', 'loud', 'stink'],
    );
    expect(html).toMatch(/data-axis="wet"[^>]*data-value="3"/);
    expect(html).toMatch(/data-axis="stink"[^>]*data-value="5"/);
    expect(html).toMatch(/data-axis="loud"[^>]*data-value="2"/);
  });

  it('with empty discovered list, still shows the named-fart heading', () => {
    const html = renderFartProfileHtml(props(0, 0, 0, 0, 0, 0, 0), []);
    expect(html).toMatch(/YOUR FART/);
    expect(html).toMatch(/The /); // a name is always shown
    // ...and no bars
    expect(html).not.toMatch(/data-axis=/);
  });
});

// The plate/fart props are SUMMED (a 4-food plate reaches ~0-20), no longer
// clamped to 5. The fart card must show the TRUE magnitude and fill its bars on
// the AXIS_CAP=8 scale the scorer uses — not pin everything to 5/100%.
describe('renderFartProfileHtml — true magnitude on the AXIS_CAP scale', () => {
  const allAxes: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];

  it('prints a high plate axis as its TRUE value, not capped at 5', () => {
    const html = renderFartProfileHtml(props(0, 0, 0, 0, 0, 14, 0), allAxes);
    expect(html).toMatch(/data-axis="length"[^>]*data-value="14"/);
  });

  it('fills the bar on an AXIS_CAP=8 scale (4 → 50%, ≥8 saturates at 100%)', () => {
    const html = renderFartProfileHtml(props(4, 0, 0, 0, 0, 12, 0), allAxes);
    expect(html).toMatch(/data-axis="wet"[\s\S]*?width:50%/);     // 4/8
    expect(html).toMatch(/data-axis="length"[\s\S]*?width:100%/); // 12/8 → clamped
  });
});
