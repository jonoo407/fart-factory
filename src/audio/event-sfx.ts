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
import { effectiveVolume, isChannelAudible, type AudioChannel } from './audio-settings';

/**
 * Fire a one-shot SFX by id at slight reduced volume (these are contextual
 * cues, not the headline fart sound). Gated on the given channel's effective
 * volume (channel × Master). PLAN v9 P6 — voice lines pass channel='voices'.
 */
export async function playEventSfx(id: string, volumeSlider = 5, channel: AudioChannel = 'sfx'): Promise<void> {
  if (!isChannelAudible(channel)) return;
  const ctx = getAudioContext();
  if (!ctx) return; // Pre-launch — no context yet; cue silently lost.
  const manifest = await loadManifest();
  if (!manifest) return;
  // Scale the per-call volume slider by the effective channel volume (0-100 → 0-1).
  const scaled = volumeSlider * (effectiveVolume(channel) / 100);
  await playSample(ctx, manifest, id, 0, scaled);
}

/**
 * Pick one of several candidate ids at random (for eating sounds —
 * variety). Returns silently if none match the manifest.
 */
export async function playEventSfxOneOf(ids: readonly string[], volumeSlider = 5): Promise<void> {
  if (!isChannelAudible('sfx')) return;
  if (ids.length === 0) return;
  const picked = ids[Math.floor(Math.random() * ids.length)]!;
  await playEventSfx(picked, volumeSlider);
}

// ---------- Named event constants (kept in one place for the wire-up) ----------

export const FOOD_EATING_SFX = ['food-munch', 'food-crunch', 'food-slurp', 'food-gulp'] as const;
/**
 * Per-tier reaction stinger POOLS — one id is drawn at random per launch
 * (playEventSfxOneOf) so repeated results don't sound identical. An empty
 * pool means the tier is deliberately silent (meh). The fail tiers used to
 * share the single 2s haunted-mansion-moan: same sound every F, and long
 * enough to talk over the fart it was reacting to.
 */
export const AUDIENCE_REACTION_SFX: Record<
  'loved' | 'liked' | 'meh' | 'disliked' | 'evacuated',
  readonly string[]
> = {
  loved:     ['royal-court-applause', 'frat-howl', 'granny-cackle'],
  liked:     ['toddler-giggle', 'alien-tourists-gasp'],
  // A shrug you can hear: one soft cough or seat-shuffle beat. Quieter than the
  // fail stingers (see MEH_STINGER_VOLUME) — awkward, not punishing.
  meh:       ['meh-cough', 'meh-shuffle'],
  disliked:  ['flop-groan', 'flop-crickets', 'flop-whistle-down'],
  evacuated: ['flop-boo', 'flop-groan', 'flop-whistle-down'],
};
export const LEGENDARY_FANFARE_SFX = 'legendary-fanfare';
export const QUEST_CLAIMED_SFX = 'quest-claimed';

// ---------- Sound overhaul: economy + milestone cues ----------
/** Soft coin chime when a launch actually pays gold (improvement-only payout). */
export const COIN_SFX = 'coin-clink';
/** Ka-ching on a successful pantry-shop buy. */
export const SHOP_PURCHASE_SFX = 'shop-purchase';

/**
 * Streak milestone stingers — EXACTLY ×5 and ×10, the two moments the streak
 * UI also escalates (🔥🔥 at 5, LEGENDARY at 10). Returning null for every
 * other count keeps a held streak from re-stinging on each launch.
 */
export function streakMilestoneSfx(streak: number): string | null {
  if (streak === 5) return 'streak-5';
  if (streak === 10) return 'streak-10';
  return null;
}

// ---------- Per-audience audio (signatures + voice lines) ----------
//
// Convention: signature id is `sig-${audienceId}`; voice id is
// `voice-${audienceId}-${tier}` (tiers: loved | evacuated). Both helpers
// resolve to silent no-ops via playSample when the id isn't in the
// manifest — so the runtime ships safely even before assets are generated.

export type AudienceVoiceTier = 'loved' | 'evacuated' | 'intro';

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
  // PLAN v9 P6 — character VO routes through the independent Voices channel.
  await playEventSfx(audienceVoiceSfxId(audienceId, tier), volume, 'voices');
}

/** Gap between the signature cue and the spoken greeting — arrival reads as
 *  "who's here" (signature) then "what they say" (intro line). */
export const INTRO_AFTER_SIGNATURE_MS = 1400;

/**
 * Sound overhaul — full arrival moment: signature cue now, intro greeting a
 * beat later. Fired on audience rotation and on the first unlocked gesture
 * after page load. Both halves are manifest-gated no-ops if assets are absent.
 */
export async function playAudienceArrival(audienceId: string): Promise<void> {
  await playAudienceSignature(audienceId);
  setTimeout(() => {
    void playAudienceVoice(audienceId, 'intro');
  }, INTRO_AFTER_SIGNATURE_MS);
}
