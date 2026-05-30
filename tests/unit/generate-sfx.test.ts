import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HARD_CAP, generateSfx, type Manifest } from '../../scripts/generate-sfx';
import { SEEDS, type Seed } from '../../scripts/sfx-seeds';

// ---- helpers ----------------------------------------------------------------

function makeSfxSeeds(ids: string[]): Seed[] {
  return ids.map((id) => ({
    kind: 'sfx',
    id,
    name: id,
    mood: 'comedic',
    duration_seconds: 1,
    prompt: `prompt for ${id}`,
    category: 'fart',
  }));
}

/** A fake ElevenLabs OK response carrying a few bytes of "audio". */
function makeAudioResponse(): Response {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    text: async () => '',
  } as unknown as Response;
}

async function readManifest(dir: string): Promise<Manifest> {
  const raw = await readFile(join(dir, 'manifest.json'), 'utf8');
  return JSON.parse(raw) as Manifest;
}

// ---- tests ------------------------------------------------------------------

describe('HARD_CAP', () => {
  it('comfortably exceeds the seed-library size so a from-scratch run can converge', () => {
    // A fixed cap below SEEDS.length is the never-converge trap: a from-scratch
    // regen needs one call per seed, aborts at the cap every time, and (without
    // durable progress) re-runs make no headway.
    expect(HARD_CAP).toBeGreaterThanOrEqual(SEEDS.length);
  });
});

describe('generateSfx cap handling', () => {
  let tmpDir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'sfx-gen-'));
    // Mock fetch so NO real ElevenLabs call (and NO quota burn) ever happens.
    fetchMock = vi.fn(async () => makeAudioResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('persists a partial manifest when the cap is hit mid-run', async () => {
    const seeds = makeSfxSeeds(['a', 'b', 'c', 'd', 'e']); // 5 uncached seeds
    const result = await generateSfx({ seeds, apiKey: 'test', outDir: tmpDir, hardCap: 3 });

    expect(result.capped).toBe(true);
    expect(result.calls).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3); // never spends past the cap

    // The crux of the bug fix: progress generated before the cap MUST be
    // written to disk, so a re-run can resume from the checksum cache instead
    // of regenerating from scratch and aborting at the same point forever.
    const manifest = await readManifest(tmpDir);
    expect(manifest.entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('a capped run resumes from cache on re-run and converges', async () => {
    const seeds = makeSfxSeeds(['a', 'b', 'c', 'd', 'e']);

    // Run 1: cap at 3 → a, b, c generated and persisted.
    const first = await generateSfx({ seeds, apiKey: 'test', outDir: tmpDir, hardCap: 3 });
    expect(first.capped).toBe(true);
    fetchMock.mockClear();

    // Run 2: same dir + same cap → a, b, c are cache hits (0 calls), only the
    // remaining d, e hit the API, so the run completes under the cap.
    const second = await generateSfx({ seeds, apiKey: 'test', outDir: tmpDir, hardCap: 3 });
    expect(second.capped).toBe(false);
    expect(second.calls).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const manifest = await readManifest(tmpDir);
    expect(manifest.entries.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
