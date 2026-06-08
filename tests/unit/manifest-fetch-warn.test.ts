import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadManifest, _resetManifestCache } from '../../src/audio/sample-player';

// A manifest fetch failure (404 from a wrong base path, network error) used to
// be swallowed silently — the game dropped to the quieter procedural fallback
// with no console trace, making "no fart" hard to diagnose. loadManifest must
// resolve to null AND warn so the failure is visible.

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  _resetManifestCache();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.unstubAllGlobals();
});

describe('loadManifest surfaces fetch failures instead of failing silently', () => {
  it('returns null and warns when the fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const m = await loadManifest();
    expect(m).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null and warns on a non-ok (e.g. 404) response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    const m = await loadManifest();
    expect(m).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
