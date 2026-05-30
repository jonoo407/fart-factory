/**
 * Generate the SFX library by calling ElevenLabs once per seed in
 * scripts/sfx-seeds.ts and writing mp3s + manifest.json into public/sfx/.
 *
 * Runs ONLY via `npm run sfx:generate`. Never on dev/build/CI. The generation
 * logic lives in the exported `generateSfx()` so it is unit-testable with a
 * mocked fetch; the module only touches the network / process when invoked
 * directly as a script (see the `isMain` guard at the bottom).
 *
 * Kid-safety: prompts AND text are STATIC (from sfx-seeds.ts) — no runtime
 * user input flows into the API.
 *
 * Two API surfaces, branched on seed.kind:
 *   - 'sfx' → POST /v1/sound-generation     (prompt + duration_seconds)
 *   - 'tts' → POST /v1/text-to-speech/{voice_id}  (text)
 *
 * Cost containment:
 * - HARD_CAP aborts after N successful API calls. Derived from SEEDS.length so
 *   it can never silently fall behind the library (see HARD_CAP below).
 * - Checksum cache: unchanged (kind, prompt|text, duration, voice_id) → skip
 *   the call, reuse the existing mp3 + manifest entry.
 * - 4xx/429: skip the seed, mark `proceduralFallback: true` in the
 *   manifest, runtime substitutes procedural synthesis for that id.
 */
import { createHash } from 'node:crypto';
import { writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SEEDS, type Seed } from './sfx-seeds';

const SFX_ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';
const TTS_MODEL_ID = 'eleven_multilingual_v2';
const VERSION = 'v2';
const DEFAULT_OUT_DIR = resolve('public/sfx');

/**
 * Cost backstop: abort a single run after this many *new* (uncached) API
 * calls. DERIVED from the seed count — never below it — so adding seeds can
 * never silently push a from-scratch run past the cap. A fixed cap (was 80)
 * against a from-scratch regen of the whole library (93 seeds, after the v1→v2
 * checksum change invalidated the cache) created a trap: the run aborted
 * mid-loop every time and, with progress not persisted, never converged. The
 * +25 headroom keeps this a runaway guard, not a tight fit.
 * Asserted in tests/unit/generate-sfx.test.ts (HARD_CAP >= SEEDS.length).
 */
export const HARD_CAP = Math.max(120, SEEDS.length + 25);

export interface ManifestEntry {
  id: string;
  name: string;
  /** SFX seeds → prompt text. TTS seeds → spoken text. */
  prompt: string;
  durationMs: number;
  mood: string;
  file: string;
  bytes: number;
  checksum: string;
  /** Set on TTS entries — the ElevenLabs voice id used. */
  voiceId?: string;
  /** Marker so the runtime knows whether to expect SFX vs TTS semantics. */
  kind?: 'sfx' | 'tts';
  proceduralFallback?: boolean;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  entries: ManifestEntry[];
}

function checksumFor(seed: Seed): string {
  const parts =
    seed.kind === 'sfx'
      ? `${VERSION}|sfx|${seed.prompt}|${seed.duration_seconds}|${seed.mood}`
      : `${VERSION}|tts|${seed.text}|${seed.voice_id}`;
  return createHash('sha256').update(parts).digest('hex').slice(0, 12);
}

function ttsEndpoint(voiceId: string): string {
  return `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
}

/** Approx duration for TTS (we don't have ffprobe). ~12 chars/sec gives
 *  a usable estimate for the manifest; runtime decodes the actual buffer. */
function estimateTtsDurationMs(text: string): number {
  const chars = text.length;
  return Math.max(1000, Math.round((chars / 12) * 1000));
}

async function loadExistingManifest(manifestPath: string): Promise<Manifest | null> {
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

async function callSfx(seed: Seed & { kind: 'sfx' }, apiKey: string): Promise<Response> {
  return fetch(SFX_ENDPOINT, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: seed.prompt,
      duration_seconds: seed.duration_seconds,
      prompt_influence: 0.7,
    }),
  });
}

async function callTts(seed: Seed & { kind: 'tts' }, apiKey: string): Promise<Response> {
  return fetch(ttsEndpoint(seed.voice_id), {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: seed.text,
      model_id: TTS_MODEL_ID,
    }),
  });
}

export interface GenerateOptions {
  /** Seeds to generate. Defaults to the full SEEDS library. */
  seeds?: readonly Seed[];
  /** ElevenLabs key. Defaults to ELEVENLABS_API_KEY from the environment. */
  apiKey?: string;
  /** Output directory for mp3s + manifest.json. Defaults to public/sfx/. */
  outDir?: string;
  /** Max new API calls before aborting. Defaults to HARD_CAP. */
  hardCap?: number;
}

export interface GenerateResult {
  entries: ManifestEntry[];
  /** Number of new (uncached) API calls actually made. */
  calls: number;
  /** True if the run stopped early because hardCap was reached. */
  capped: boolean;
  manifestPath: string;
}

export async function generateSfx(opts: GenerateOptions = {}): Promise<GenerateResult> {
  const seeds = opts.seeds ?? SEEDS;
  const apiKey = opts.apiKey ?? process.env.ELEVENLABS_API_KEY ?? '';
  const outDir = opts.outDir ?? DEFAULT_OUT_DIR;
  const hardCap = opts.hardCap ?? HARD_CAP;
  const manifestPath = resolve(outDir, 'manifest.json');

  await mkdir(outDir, { recursive: true });
  const existing = await loadExistingManifest(manifestPath);
  const existingById = new Map<string, ManifestEntry>(
    (existing?.entries ?? []).map((e) => [e.id, e]),
  );

  let calls = 0;
  let capped = false;
  const entries: ManifestEntry[] = [];

  try {
    for (const seed of seeds) {
      const checksum = checksumFor(seed);
      const file = `${seed.id}.mp3`;
      const filePath = resolve(outDir, file);

      // Cache hit?
      const prior = existingById.get(seed.id);
      if (prior && prior.checksum === checksum && existsSync(filePath)) {
        console.log(`cache hit:  ${seed.id} (${prior.bytes} bytes)`);
        entries.push(prior);
        continue;
      }

      if (calls >= hardCap) {
        capped = true;
        console.error(
          `HARD_CAP=${hardCap} reached — stopping. Partial progress is saved; re-run to continue (cached seeds are skipped).`,
        );
        break;
      }
      calls++;

      const baseEntry: Omit<ManifestEntry, 'bytes'> = {
        id: seed.id,
        name: seed.name,
        prompt: seed.kind === 'sfx' ? seed.prompt : seed.text,
        durationMs:
          seed.kind === 'sfx'
            ? Math.round(seed.duration_seconds * 1000)
            : estimateTtsDurationMs(seed.text),
        mood: seed.mood,
        file,
        checksum,
        kind: seed.kind,
        ...(seed.kind === 'tts' ? { voiceId: seed.voice_id } : {}),
      };

      console.log(`generating: ${seed.id} (${seed.kind})…`);
      try {
        const res = seed.kind === 'sfx' ? await callSfx(seed, apiKey) : await callTts(seed, apiKey);
        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`  skip ${seed.id}: ${res.status} ${errBody.slice(0, 200)}`);
          entries.push({ ...baseEntry, bytes: 0, proceduralFallback: true });
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(filePath, buf);
        const stats = await stat(filePath);
        entries.push({ ...baseEntry, bytes: stats.size });
        console.log(`  wrote ${file} (${stats.size} bytes)`);
      } catch (err) {
        console.warn(`  skip ${seed.id}: ${(err as Error).message}`);
        entries.push({ ...baseEntry, bytes: 0, proceduralFallback: true });
      }
    }
  } finally {
    // Persist progress UNCONDITIONALLY — on normal completion, on the cap
    // `break` above, and on any unexpected throw. Without this, a run that
    // exits before the post-loop write left the manifest stale, so the next
    // run got zero cache hits, regenerated from scratch, and aborted at the
    // same point — burning paid API calls forever without converging.
    const manifest: Manifest = {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      entries,
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  return { entries, calls, capped, manifestPath };
}

// ---- CLI entry point (only when run directly via `npm run sfx:generate`) ----
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isMain = invokedPath !== '' && import.meta.url === pathToFileURL(invokedPath).href;

if (isMain) {
  await import('dotenv/config');
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY missing in .env — aborting');
    process.exit(1);
  }
  const result = await generateSfx({ apiKey });
  console.log(
    `manifest: ${result.manifestPath} — ${result.entries.length} entries (${result.calls} new API calls)`,
  );
  if (result.capped) {
    process.exit(2);
  }
}
