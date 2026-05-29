import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadMuted,
  setMuted,
  loadAudioSettings,
  setChannelVolume,
  channelVolume,
  isChannelAudible,
} from '../../src/audio/audio-settings';

beforeEach(() => {
  localStorage.clear();
});

describe('mute (legacy binary API)', () => {
  it('defaults to false when localStorage is empty', () => {
    expect(loadMuted()).toBe(false);
  });

  it('setMuted(true) silences both channels', () => {
    setMuted(true);
    expect(loadMuted()).toBe(true);
    expect(channelVolume('farts')).toBe(0);
    expect(channelVolume('sfx')).toBe(0);
  });

  it('setMuted(false) restores both channels to 100', () => {
    setMuted(true);
    setMuted(false);
    expect(loadMuted()).toBe(false);
    expect(channelVolume('farts')).toBe(100);
    expect(channelVolume('sfx')).toBe(100);
  });
});

describe('per-channel volume', () => {
  it('defaults to 100/100', () => {
    const s = loadAudioSettings();
    expect(s).toEqual({ farts: 100, sfx: 100 });
  });

  it('setChannelVolume persists per channel without affecting the other', () => {
    setChannelVolume('farts', 30);
    expect(channelVolume('farts')).toBe(30);
    expect(channelVolume('sfx')).toBe(100);
  });

  it('clamps out-of-range volumes to 0..100', () => {
    setChannelVolume('sfx', 200);
    expect(channelVolume('sfx')).toBe(100);
    setChannelVolume('sfx', -50);
    expect(channelVolume('sfx')).toBe(0);
  });

  it('isChannelAudible returns false when channel is at 0', () => {
    setChannelVolume('farts', 0);
    expect(isChannelAudible('farts')).toBe(false);
    expect(isChannelAudible('sfx')).toBe(true);
  });

  it('loadMuted is true only when both channels are at 0', () => {
    setChannelVolume('farts', 0);
    expect(loadMuted()).toBe(false);
    setChannelVolume('sfx', 0);
    expect(loadMuted()).toBe(true);
  });
});

describe('migration from legacy fart_mute key', () => {
  it('fart_mute=true migrates to channels=0/0 on first load', () => {
    localStorage.setItem('fart_mute', 'true');
    const s = loadAudioSettings();
    expect(s).toEqual({ farts: 0, sfx: 0 });
  });

  it('fart_mute=false migrates to channels=100/100 on first load', () => {
    localStorage.setItem('fart_mute', 'false');
    const s = loadAudioSettings();
    expect(s).toEqual({ farts: 100, sfx: 100 });
  });
});

describe('corruption recovery', () => {
  it('returns defaults on garbage', () => {
    localStorage.setItem('fart_audio_channels', '{not json');
    const s = loadAudioSettings();
    expect(s).toEqual({ farts: 100, sfx: 100 });
  });

  it('uses defaults for missing fields', () => {
    localStorage.setItem('fart_audio_channels', JSON.stringify({ farts: 25 }));
    const s = loadAudioSettings();
    expect(s).toEqual({ farts: 25, sfx: 100 });
  });
});
