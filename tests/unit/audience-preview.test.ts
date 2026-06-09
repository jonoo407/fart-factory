import { describe, it, expect, beforeEach } from 'vitest';
import { nextAudiencePreview } from '../../src/ui/audience-preview';
import { AUDIENCES } from '../../src/state/audience';

/**
 * Cleanup #2 — the intermission previews the UPCOMING crowd (idx + 1) and what
 * they crave, so the break is a real planning beat rather than dead time.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('nextAudiencePreview', () => {
  it('previews the NEXT encounter audience (idx + 1), not the current one', () => {
    const preview = nextAudiencePreview(0, AUDIENCES);
    expect(preview.audience.id).toBe(AUDIENCES[1]!.id);
    expect(preview.audience.id).not.toBe(AUDIENCES[0]!.id);
  });

  it('wraps around the pool', () => {
    const preview = nextAudiencePreview(AUDIENCES.length - 1, AUDIENCES);
    expect(preview.audience.id).toBe(AUDIENCES[0]!.id);
  });

  it('surfaces what they want as craving chips', () => {
    const preview = nextAudiencePreview(0, AUDIENCES);
    expect(preview.chips.length).toBeGreaterThan(0);
  });
});
