/**
 * Generate the SFX library by calling ElevenLabs once per seed in
 * scripts/sfx-seeds.ts and writing mp3s + manifest.json into public/sfx/.
 *
 * Runs ONLY via `npm run sfx:generate`. Never on dev/build/CI.
 *
 * Kid-safety: prompts AND text are STATIC (from sfx-seeds.ts) — no runtime
 * user input flows into the API.
 *
 * Two API surfaces, branched on seed.kind:
 *   - 'sfx' → POST /v1/sound-generation     (prompt + duration_seconds)
 *   - 'tts' → POST /v1/text-to-speech/{voice_id}  (text)
 *
 * Cost containment:
 * - HARD_CAP throws after N successful API calls.
 * - Checksum cache: unchanged (kind, prompt|text, duration, voice_id) → skip
 *   the call, reuse the existing mp3 + manifest entry.
 * - 4xx/429: skip the seed, mark `proceduralFallback: true` in the
 *   manifest, runtime substitutes procedural synthesis for that id.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { SEEDS, type Seed } from './sfx-seeds';

const KEY = process.env.ELEVENLABS_API_KEY ?? '';
if (!KEY) {
  console.error('ELEVENLABS_API_KEY missing in .env — aborting');
  process.exit(1);
}

const HARD_CAP = 80;
const SFX_ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';
const TTS_MODEL_ID = 'eleven_multilingual_v2';
const VERSION = 'v2';
const OUT_DIR = resolve('public/sfx');
const MANIFEST_PATH = resolve(OUT_DIR, 'manifest.json');

interface ManifestEntry {
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

interface Manifest {
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

async function loadExistingManifest(): Promise<Manifest | null> {
  if (!existsSync(MANIFEST_PATH)) return null;
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

async function callSfx(seed: Seed & { kind: 'sfx' }): Promise<Response> {
  return fetch(SFX_ENDPOINT, {
    method: 'POST',
    headers: {
      'xi-api-key': KEY,
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

async function callTts(seed: Seed & { kind: 'tts' }): Promise<Response> {
  return fetch(ttsEndpoint(seed.voice_id), {
    method: 'POST',
    headers: {
      'xi-api-key': KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: seed.text,
      model_id: TTS_MODEL_ID,
    }),
  });
}

await mkdir(OUT_DIR, { recursive: true });
const existing = await loadExistingManifest();
const existingById = new Map<string, ManifestEntry>(
  (existing?.entries ?? []).map((e) => [e.id, e]),
);

let calls = 0;
const entries: ManifestEntry[] = [];

for (const seed of SEEDS) {
  const checksum = checksumFor(seed);
  const file = `${seed.id}.mp3`;
  const filePath = resolve(OUT_DIR, file);

  // Cache hit?
  const prior = existingById.get(seed.id);
  if (prior && prior.checksum === checksum && existsSync(filePath)) {
    console.log(`cache hit:  ${seed.id} (${prior.bytes} bytes)`);
    entries.push(prior);
    continue;
  }

  if (++calls > HARD_CAP) {
    console.error(`HARD_CAP=${HARD_CAP} reached — aborting; re-run to continue.`);
    process.exit(2);
  }

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
    const res = seed.kind === 'sfx' ? await callSfx(seed) : await callTts(seed);
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

const manifest: Manifest = {
  version: VERSION,
  generatedAt: new Date().toISOString(),
  entries,
};
await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`manifest: ${MANIFEST_PATH} — ${entries.length} entries (${calls} new API calls)`);
