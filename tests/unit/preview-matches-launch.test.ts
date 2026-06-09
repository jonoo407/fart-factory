import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/audio/procedural', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/procedural')>();
  return { ...actual, playFart: vi.fn(() => 0) };
});

import { resolveLaunchProps } from '../../src/ui/plate';
import { getFood } from '../../src/state/food';

// The 🔮 PREDICTION preview and the actual launch now both resolve through
// resolveLaunchProps, so the preview can't disagree with the launched fart. The
// most impactful divergence was the AREA modifier: the live area is permanently
// Backyard ('outside'), which halves wet/stink and boosts loud x1.5.
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('fart_pantry', JSON.stringify(['beans', 'cheese', 'onion', 'egg', 'garlic', 'cabbage']));
});

describe('resolveLaunchProps applies the area modifier (preview == launch)', () => {
  it('halves wet/stink and boosts loud at Backyard (not the raw sum)', () => {
    const beans = getFood('beans')!; // wet 3, stink 3, loud 2 (raw)
    const { props } = resolveLaunchProps(['beans']);
    // Backyard ('outside'): wet x0.5, stink x0.5, loud x1.5
    expect(props.wet).toBeCloseTo(beans.properties.wet * 0.5, 5);
    expect(props.stink).toBeCloseTo(beans.properties.stink * 0.5, 5);
    expect(props.loud).toBeCloseTo(beans.properties.loud * 1.5, 5);
    // and it is NOT the raw value
    expect(props.wet).not.toBe(beans.properties.wet);
  });
});
