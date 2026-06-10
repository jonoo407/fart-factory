/**
 * Per-channel audio volume + accessibility toggles.
 *
 * PLAN v9 P6 / 02 §7 — four independent channels under a Master, matching the
 * Sound settings design: Master · Farts & SFX · Voices · Music. Plus captions
 * (ON by default — non-negotiable) and a haptics/rumble toggle. Volumes are
 * 0–100 integers; the effective volume of a channel is `channel * master/100`.
 * Settings persist under fart_audio_channels.
 *
 * Backwards compat: loadMuted()/setMuted() are kept (they now act on Master)
 * so the visibility-change handler + the mute chip still work.
 */

export type AudioChannel = 'master' | 'farts' | 'sfx' | 'voices' | 'music';

const KEY = 'fart_audio_channels';
const KEY_LEGACY_MUTE = 'fart_mute';
const KEY_CAPTIONS = 'fart_captions';
const KEY_HAPTICS = 'fart_haptics';

export interface AudioSettings {
  master: number;
  farts: number;
  sfx: number;
  voices: number;
  music: number;
}

// Music defaults LOW (sound overhaul): the loop sets mood UNDER the comedy.
// Only affects new players — an existing fart_audio_channels save wins.
const DEFAULT: AudioSettings = { master: 100, farts: 100, sfx: 100, voices: 100, music: 35 };
const CHANNELS: AudioChannel[] = ['master', 'farts', 'sfx', 'voices', 'music'];

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function migrateLegacyMute(): AudioSettings | null {
  try {
    const legacy = localStorage.getItem(KEY_LEGACY_MUTE);
    if (legacy === null) return null;
    const parsed: unknown = JSON.parse(legacy);
    if (parsed === true) return { ...DEFAULT, master: 0 };
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
        const out = { ...DEFAULT };
        for (const ch of CHANNELS) out[ch] = clamp(parsed[ch] ?? DEFAULT[ch]);
        return out;
      }
    }
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
    const out: AudioSettings = { ...DEFAULT };
    for (const ch of CHANNELS) out[ch] = clamp(s[ch] ?? DEFAULT[ch]);
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    // ignore
  }
}

export function setChannelVolume(channel: AudioChannel, volume: number): void {
  const current = loadAudioSettings();
  saveAudioSettings({ ...current, [channel]: clamp(volume) });
}

/** Raw 0-100 volume of a channel (before the Master multiplier). */
export function channelVolume(channel: AudioChannel): number {
  return loadAudioSettings()[channel];
}

/** Effective 0-100 volume = channel × master / 100 (Master returns itself). */
export function effectiveVolume(channel: AudioChannel): number {
  const s = loadAudioSettings();
  if (channel === 'master') return s.master;
  return Math.round((s[channel] * s.master) / 100);
}

export function isChannelAudible(channel: AudioChannel): boolean {
  return effectiveVolume(channel) > 0;
}

// ----- Captions (ON by default — accessibility, 02 §7) -----

export function loadCaptionsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY_CAPTIONS);
    if (raw === null) return true;
    return JSON.parse(raw) !== false;
  } catch {
    return true;
  }
}
export function setCaptionsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY_CAPTIONS, JSON.stringify(on));
  } catch {
    // ignore
  }
}

// ----- Haptics / Rumble toggle (ON by default) -----

export function loadHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY_HAPTICS);
    if (raw === null) return true;
    return JSON.parse(raw) !== false;
  } catch {
    return true;
  }
}
export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY_HAPTICS, JSON.stringify(on));
  } catch {
    // ignore
  }
}

// ----- Legacy API (binary mute) — now acts on Master -----

export function loadMuted(): boolean {
  return loadAudioSettings().master === 0;
}

export function setMuted(muted: boolean): void {
  setChannelVolume('master', muted ? 0 : 100);
}
