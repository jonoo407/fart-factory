/**
 * Generate the SFX library by calling ElevenLabs once per seed in
 * scripts/sfx-seeds.ts and writing mp3s + manifest.json into public/sfx/.
 *
 * Runs ONLY via `npm run sfx:generate`. Never on dev/build/CI.
 *
 * Kid-safety: prompts are STATIC (from sfx-seeds.ts) — no runtime
 * user input flows into the API.
 *
 * Cost containment:
 * - HARD_CAP throws after N successful API calls.
 * - Checksum cache: unchanged (prompt, duration, version) → skip the call,
 *   reuse the existing mp3 + manifest entry.
 * - 4xx/429: skip the seed, mark `procedural-fallback: true` in the
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

const HARD_CAP = 30;
const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';
const VERSION = 'v1';
const OUT_DIR = resolve('public/sfx');
const MANIFEST_PATH = resolve(OUT_DIR, 'manifest.json');

interface ManifestEntry {
  id: string;
  name: string;
  prompt: string;
  durationMs: number;
  mood: string;
  file: string;
  bytes: number;
  checksum: string;
  proceduralFallback?: boolean;
}

interface Manifest {
  version: string;
  generatedAt: string;
  entries: ManifestEntry[];
}

function checksumFor(seed: Seed): string {
  return createHash('sha256')
    .update(`${VERSION}|${seed.prompt}|${seed.duration_seconds}|${seed.mood}`)
    .digest('hex')
    .slice(0, 12);
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
    console.error(`HARD_CAP=${HARD_CAP} reached — aborting`);
    process.exit(2);
  }

  console.log(`generating: ${seed.id} (${seed.duration_seconds}s)…`);
  try {
    const res = await fetch(ENDPOINT, {
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
    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`  skip ${seed.id}: ${res.status} ${errBody.slice(0, 200)}`);
      entries.push({
        id: seed.id,
        name: seed.name,
        prompt: seed.prompt,
        durationMs: Math.round(seed.duration_seconds * 1000),
        mood: seed.mood,
        file,
        bytes: 0,
        checksum,
        proceduralFallback: true,
      });
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(filePath, buf);
    const stats = await stat(filePath);
    entries.push({
      id: seed.id,
      name: seed.name,
      prompt: seed.prompt,
      durationMs: Math.round(seed.duration_seconds * 1000),
      mood: seed.mood,
      file,
      bytes: stats.size,
      checksum,
    });
    console.log(`  wrote ${file} (${stats.size} bytes)`);
  } catch (err) {
    console.warn(`  skip ${seed.id}: ${(err as Error).message}`);
    entries.push({
      id: seed.id,
      name: seed.name,
      prompt: seed.prompt,
      durationMs: Math.round(seed.duration_seconds * 1000),
      mood: seed.mood,
      file,
      bytes: 0,
      checksum,
      proceduralFallback: true,
    });
  }
}

const manifest: Manifest = {
  version: VERSION,
  generatedAt: new Date().toISOString(),
  entries,
};
await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`manifest: ${MANIFEST_PATH} — ${entries.length} entries (${calls} new API calls)`);
