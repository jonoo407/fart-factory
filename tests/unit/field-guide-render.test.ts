import { describe, it, expect } from 'vitest';
import { renderFieldGuideEntryHtml } from '../../src/ui/field-guide';
import { getFood } from '../../src/state/food';
import type { AxisName } from '../../src/state/axis-discovery';

const allAxes: AxisName[] = ['wet', 'dry', 'stink', 'loud', 'musical', 'length', 'temp'];
const defaultAxes: AxisName[] = ['wet', 'loud', 'stink'];

describe('renderFieldGuideEntryHtml (V8 T4 — entry card)', () => {
  it('includes the food name + emoji', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 0, defaultAxes);
    expect(html).toContain(food.name);
    expect(html).toContain(food.emoji);
  });

  it('mystery (0 uses) shows no bars', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 0, allAxes);
    expect(html).not.toMatch(/data-axis=/);
  });

  it('mystery shows "Mystery" band badge', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 0, allAxes);
    expect(html).toMatch(/Mystery/i);
  });

  it('hunch (1 use) shows exactly 1 bar (if discovered)', () => {
    const food = getFood('beans')!;
    // beans top axis is wet/stink/length tied at 3 → 'length' wins alpha tie-break.
    // With all axes discovered, the bar shown should be `length`.
    const html = renderFieldGuideEntryHtml(food, 1, allAxes);
    const matches = html.match(/data-axis="/g) ?? [];
    expect(matches.length).toBe(1);
    expect(html).toMatch(/data-axis="length"/);
  });

  it('apprentice (10 uses) shows 3 bars', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 10, allAxes);
    const matches = html.match(/data-axis="/g) ?? [];
    expect(matches.length).toBe(3);
  });

  it('master (50 uses) shows all 7 bars', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 50, allAxes);
    const matches = html.match(/data-axis="/g) ?? [];
    expect(matches.length).toBe(7);
  });

  it('bars are FILTERED by discovered axes', () => {
    const food = getFood('beans')!;
    // beans top-3 at master: length, stink, wet. With only `wet` and `stink`
    // discovered, the entry shows the intersection.
    const html = renderFieldGuideEntryHtml(food, 10, ['wet', 'stink']);
    expect(html).toMatch(/data-axis="wet"/);
    expect(html).toMatch(/data-axis="stink"/);
    expect(html).not.toMatch(/data-axis="length"/);
    expect(html).not.toMatch(/data-axis="musical"/);
  });

  it('shows the use count', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 7, allAxes);
    expect(html).toMatch(/7/);
  });

  it('includes faux-scientific text', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 0, allAxes);
    expect(html).toMatch(/untested|study|trial/i);
  });

  it('master entry text uses the food description', () => {
    const food = getFood('beans')!;
    // beans.description = 'The classic. Wet and stinky.'
    const html = renderFieldGuideEntryHtml(food, 50, allAxes);
    expect(html.toLowerCase()).toContain('classic');
  });

  it('tags rarity for CSS via class', () => {
    const food = getFood('beans')!;
    const html = renderFieldGuideEntryHtml(food, 0, allAxes);
    expect(html).toMatch(/rarity-common/);
  });
});
