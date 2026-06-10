import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadMuted,
  setMuted,
  loadAudioSettings,
  setChannelVolume,
  channelVolume,
  effectiveVolume,
  isChannelAudible,
  loadCaptionsEnabled,
  setCaptionsEnabled,
  loadHapticsEnabled,
  setHapticsEnabled,
} from '../../src/audio/audio-settings';

beforeEach(() => {
  localStorage.clear();
});

// Music defaults FULL (overhaul v2) — the low base gain in music.ts keeps it under the comedy.
const DEFAULTS = { master: 100, farts: 100, sfx: 100, voices: 100, music: 100 };

describe('mute (legacy binary API, now Master)', () => {
  it('defaults to false when localStorage is empty', () => {
    expect(loadMuted()).toBe(false);
  });

  it('setMuted(true) zeroes Master (silences everything)', () => {
    setMuted(true);
    expect(loadMuted()).toBe(true);
    expect(channelVolume('master')).toBe(0);
    expect(isChannelAudible('farts')).toBe(false);
    expect(isChannelAudible('voices')).toBe(false);
  });

  it('setMuted(false) restores Master to 100', () => {
    setMuted(true);
    setMuted(false);
    expect(loadMuted()).toBe(false);
    expect(channelVolume('master')).toBe(100);
  });
});

describe('four channels under a Master', () => {
  it('defaults every channel to 100 (music silenced during launches instead of defaulting low)', () => {
    expect(loadAudioSettings()).toEqual(DEFAULTS);
  });

  it('setChannelVolume persists per channel without affecting the others', () => {
    setChannelVolume('voices', 30);
    expect(channelVolume('voices')).toBe(30);
    expect(channelVolume('farts')).toBe(100);
    expect(channelVolume('music')).toBe(100);
  });

  it('effectiveVolume applies the Master multiplier', () => {
    setChannelVolume('master', 50);
    setChannelVolume('voices', 80);
    expect(effectiveVolume('voices')).toBe(40); // 80 * 50/100
    expect(effectiveVolume('master')).toBe(50);
  });

  it('clamps out-of-range volumes to 0..100', () => {
    setChannelVolume('music', 200);
    expect(channelVolume('music')).toBe(100);
    setChannelVolume('music', -50);
    expect(channelVolume('music')).toBe(0);
  });

  it('a channel is inaudible when its own volume OR Master is 0', () => {
    setChannelVolume('farts', 0);
    expect(isChannelAudible('farts')).toBe(false);
    expect(isChannelAudible('sfx')).toBe(true);
    setChannelVolume('farts', 100);
    setChannelVolume('master', 0);
    expect(isChannelAudible('sfx')).toBe(false);
  });
});

describe('migration from legacy fart_mute key', () => {
  it('fart_mute=true migrates to Master 0', () => {
    localStorage.setItem('fart_mute', 'true');
    expect(loadAudioSettings()).toEqual({ ...DEFAULTS, master: 0 });
  });

  it('fart_mute=false migrates to defaults', () => {
    localStorage.setItem('fart_mute', 'false');
    expect(loadAudioSettings()).toEqual(DEFAULTS);
  });
});

describe('corruption recovery', () => {
  it('returns defaults on garbage', () => {
    localStorage.setItem('fart_audio_channels', '{not json');
    expect(loadAudioSettings()).toEqual(DEFAULTS);
  });

  it('uses defaults for missing fields', () => {
    localStorage.setItem('fart_audio_channels', JSON.stringify({ farts: 25 }));
    expect(loadAudioSettings()).toEqual({ ...DEFAULTS, farts: 25 });
  });
});

describe('captions + haptics toggles (02 §7)', () => {
  it('captions are ON by default (non-negotiable)', () => {
    expect(loadCaptionsEnabled()).toBe(true);
  });
  it('captions can be turned off and back on', () => {
    setCaptionsEnabled(false);
    expect(loadCaptionsEnabled()).toBe(false);
    setCaptionsEnabled(true);
    expect(loadCaptionsEnabled()).toBe(true);
  });
  it('haptics default ON and toggle', () => {
    expect(loadHapticsEnabled()).toBe(true);
    setHapticsEnabled(false);
    expect(loadHapticsEnabled()).toBe(false);
  });
});
