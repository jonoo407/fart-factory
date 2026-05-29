/**
 * Event-driven SFX playback for contextual cues (P3).
 *
 * Distinct from the procedural fart-launch path: these are short,
 * named cues fired at specific game events (audience reaction, food
 * eating, legendary launch, boss claim).
 *
 * Calls are completely safe before the manifest is loaded OR when the
 * id is not in the manifest (which is the current state — operator
 * hasn't run sfx:generate for Phase K). The fallback is silence —
 * nothing crashes, no console error.
 *
 * Audio rubric coverage:
 * - A11 single-AudioContext invariant: reuses getAudioContext() from
 *   procedural.ts.
 * - A3 decode failure: routes to silence (sample-player's playSample
 *   already returns 0 on failure).
 * - Lifecycle: respects loadMuted() via playSample's own check.
 */

import { getAudioContext } from './procedural';
import { loadManifest, playSample } from './sample-player';
import { loadMuted } from './mute';

/**
 * Fire a one-shot SFX by id at slight reduced volume (these are
 * contextual cues, not the headline fart sound — they shouldn't crowd
 * the procedural payload).
 */
export async function playEventSfx(id: string, volumeSlider = 5): Promise<void> {
  if (loadMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return; // Pre-launch — no context yet; cue silently lost.
  const manifest = await loadManifest();
  if (!manifest) return;
  // playSample returns 0 silently if id isn't in manifest.
  await playSample(ctx, manifest, id, 0, volumeSlider);
}

/**
 * Pick one of several candidate ids at random (for eating sounds —
 * variety). Returns silently if none match the manifest.
 */
export async function playEventSfxOneOf(ids: readonly string[], volumeSlider = 5): Promise<void> {
  if (loadMuted()) return;
  if (ids.length === 0) return;
  const picked = ids[Math.floor(Math.random() * ids.length)]!;
  await playEventSfx(picked, volumeSlider);
}

// ---------- Named event constants (kept in one place for the wire-up) ----------

export const FOOD_EATING_SFX = ['food-munch', 'food-crunch', 'food-slurp', 'food-gulp'] as const;
export const AUDIENCE_REACTION_SFX = {
  loved:     'royal-court-applause',
  liked:     'toddler-giggle',
  meh:       null,
  disliked:  'haunted-mansion-moan',
  evacuated: 'haunted-mansion-moan',
} as const;
export const LEGENDARY_FANFARE_SFX = 'legendary-fanfare';
export const QUEST_CLAIMED_SFX = 'quest-claimed';

// ---------- Per-audience audio (signatures + voice lines) ----------
//
// Convention: signature id is `sig-${audienceId}`; voice id is
// `voice-${audienceId}-${tier}` (tiers: loved | evacuated). Both helpers
// resolve to silent no-ops via playSample when the id isn't in the
// manifest — so the runtime ships safely even before assets are generated.

export type AudienceVoiceTier = 'loved' | 'evacuated';

export function audienceSignatureSfxId(audienceId: string): string {
  return `sig-${audienceId}`;
}

export function audienceVoiceSfxId(audienceId: string, tier: AudienceVoiceTier): string {
  return `voice-${audienceId}-${tier}`;
}

export async function playAudienceSignature(audienceId: string, volume = 6): Promise<void> {
  await playEventSfx(audienceSignatureSfxId(audienceId), volume);
}

export async function playAudienceVoice(
  audienceId: string,
  tier: AudienceVoiceTier,
  volume = 7,
): Promise<void> {
  await playEventSfx(audienceVoiceSfxId(audienceId, tier), volume);
}
