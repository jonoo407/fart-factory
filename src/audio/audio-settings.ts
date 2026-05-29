/**
 * Per-channel audio volume. Replaces the binary mute toggle so parents
 * can keep audience reactions / stings on while killing the farts (or
 * vice versa).
 *
 * Two channels today (no background music): 'farts' and 'sfx'. Volumes
 * are 0–100 integers. Settings persist under fart_audio_channels.
 *
 * Backwards compat: loadMuted() / setMuted() are kept so existing
 * callers (visibility-change handler, sample player) still work.
 */

export type AudioChannel = 'farts' | 'sfx';

const KEY = 'fart_audio_channels';
const KEY_LEGACY_MUTE = 'fart_mute';

export interface AudioSettings {
  farts: number; // 0-100
  sfx: number;   // 0-100
}

const DEFAULT: AudioSettings = { farts: 100, sfx: 100 };

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function migrateLegacyMute(): AudioSettings | null {
  try {
    const legacy = localStorage.getItem(KEY_LEGACY_MUTE);
    if (legacy === null) return null;
    const parsed: unknown = JSON.parse(legacy);
    if (parsed === true) return { farts: 0, sfx: 0 };
    if (parsed === false) return { ...DEFAULT };
    return null;
  } catch {
    return null;
  }
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      if (parsed && typeof parsed === 'object') {
        return {
          farts: clamp(parsed.farts ?? DEFAULT.farts),
          sfx: clamp(parsed.sfx ?? DEFAULT.sfx),
        };
      }
    }
    // First load on a save with the legacy mute key — migrate.
    const migrated = migrateLegacyMute();
    if (migrated) {
      saveAudioSettings(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT };
}

export function saveAudioSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      farts: clamp(s.farts),
      sfx: clamp(s.sfx),
    }));
  } catch {
    // ignore
  }
}

export function setChannelVolume(channel: AudioChannel, volume: number): void {
  const current = loadAudioSettings();
  saveAudioSettings({ ...current, [channel]: clamp(volume) });
}

export function channelVolume(channel: AudioChannel): number {
  return loadAudioSettings()[channel];
}

export function isChannelAudible(channel: AudioChannel): boolean {
  return channelVolume(channel) > 0;
}

// ----- Legacy API (binary mute) — kept for visibility-change handler etc. -----

export function loadMuted(): boolean {
  const s = loadAudioSettings();
  return s.farts === 0 && s.sfx === 0;
}

export function setMuted(muted: boolean): void {
  const v = muted ? 0 : 100;
  saveAudioSettings({ farts: v, sfx: v });
}
