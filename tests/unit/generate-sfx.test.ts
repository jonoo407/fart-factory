import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HARD_CAP, generateSfx, buildPostFxFilter, type Manifest } from '../../scripts/generate-sfx';
import { SEEDS, type Seed, type PostFx } from '../../scripts/sfx-seeds';

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

function makeTtsSeed(id: string, postFx?: PostFx): Seed {
  return {
    kind: 'tts',
    id,
    name: id,
    text: `line for ${id}`,
    voice_id: 'v0123456789',
    mood: 'voice',
    category: 'voice',
    ...(postFx ? { postFx } : {}),
  } as Seed;
}

function makeMusicSeed(id: string): Seed {
  return {
    kind: 'music',
    id,
    name: id,
    prompt: 'gentle warm instrumental loop for a kids game',
    music_length_ms: 25_000,
    mood: 'comedic',
    category: 'music',
  } as Seed;
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

// Sound overhaul v2: background music comes from the dedicated Music API —
// the SFX endpoint produced "annoying beeping on repeat", not music.
describe('music seeds call the ElevenLabs Music API', () => {
  let tmpDir: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let runFfmpeg: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'sfx-gen-'));
    fetchMock = vi.fn(async () => makeAudioResponse());
    vi.stubGlobal('fetch', fetchMock);
    runFfmpeg = vi.fn(async () => {});
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('POSTs /v1/music with prompt, length, and force_instrumental', async () => {
    await generateSfx({ seeds: [makeMusicSeed('music-test')], apiKey: 'k', outDir: tmpDir, runFfmpeg });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.elevenlabs.io/v1/music');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.prompt).toContain('instrumental');
    expect(body.music_length_ms).toBe(25_000);
    expect(body.force_instrumental).toBe(true);
  });

  it('post-processes each track into a seamless crossfaded loop', async () => {
    await generateSfx({ seeds: [makeMusicSeed('music-test')], apiKey: 'k', outDir: tmpDir, runFfmpeg });
    expect(runFfmpeg).toHaveBeenCalledTimes(1);
    const args = (runFfmpeg.mock.calls[0]![0] as string[]).join(' ');
    expect(args).toContain('acrossfade');
  });
});

// Baby/kid/ghost/alien voices: ElevenLabs has no premade baby voice, so TTS
// seeds carry a postFx (ffmpeg chain) applied right after download.
describe('TTS postFx pipeline', () => {
  let tmpDir: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let runFfmpeg: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'sfx-gen-'));
    fetchMock = vi.fn(async () => makeAudioResponse());
    vi.stubGlobal('fetch', fetchMock);
    runFfmpeg = vi.fn(async () => {});
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('buildPostFxFilter turns semitones into an asetrate/atempo chain (pitch up, same speed)', () => {
    const f = buildPostFxFilter({ semitones: 12 });
    expect(f).toContain('asetrate=44100*2.000000');
    expect(f).toContain('aresample=44100');
    expect(f).toContain('atempo=0.500000');
  });

  it('buildPostFxFilter appends extra filters after the pitch chain', () => {
    const f = buildPostFxFilter({ semitones: -2, filters: ['aecho=0.8:0.9:60:0.3'] });
    expect(f.endsWith('aecho=0.8:0.9:60:0.3')).toBe(true);
  });

  it('runs ffmpeg with the postFx chain for pitched voice seeds', async () => {
    await generateSfx({
      seeds: [makeTtsSeed('voice-x', { semitones: 7 })],
      apiKey: 'k',
      outDir: tmpDir,
      runFfmpeg,
    });
    expect(runFfmpeg).toHaveBeenCalledTimes(1);
    const args = (runFfmpeg.mock.calls[0]![0] as string[]).join(' ');
    expect(args).toContain('asetrate');
  });

  it('does NOT run ffmpeg for plain voice seeds', async () => {
    await generateSfx({ seeds: [makeTtsSeed('voice-x')], apiKey: 'k', outDir: tmpDir, runFfmpeg });
    expect(runFfmpeg).not.toHaveBeenCalled();
  });

  it('changing postFx busts the checksum cache (recast voices regenerate)', async () => {
    await generateSfx({ seeds: [makeTtsSeed('voice-x')], apiKey: 'k', outDir: tmpDir, runFfmpeg });
    fetchMock.mockClear();
    const second = await generateSfx({
      seeds: [makeTtsSeed('voice-x', { semitones: 7 })],
      apiKey: 'k',
      outDir: tmpDir,
      runFfmpeg,
    });
    expect(second.calls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an unchanged plain seed still cache-hits (no quota burn on the untouched cast)', async () => {
    await generateSfx({ seeds: [makeTtsSeed('voice-x')], apiKey: 'k', outDir: tmpDir, runFfmpeg });
    fetchMock.mockClear();
    const second = await generateSfx({ seeds: [makeTtsSeed('voice-x')], apiKey: 'k', outDir: tmpDir, runFfmpeg });
    expect(second.calls).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
