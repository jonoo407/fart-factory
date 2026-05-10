import { describe, it, expect, beforeEach } from 'vitest';
import { loadMuted, setMuted } from '../../src/audio/mute';

beforeEach(() => {
  localStorage.clear();
});

describe('mute state', () => {
  it('defaults to false when localStorage is empty', () => {
    expect(loadMuted()).toBe(false);
  });

  it('persists true via setMuted', () => {
    setMuted(true);
    expect(loadMuted()).toBe(true);
    expect(localStorage.getItem('fart_mute')).toBe('true');
  });

  it('persists false via setMuted', () => {
    setMuted(true);
    setMuted(false);
    expect(loadMuted()).toBe(false);
    expect(localStorage.getItem('fart_mute')).toBe('false');
  });

  it('returns false on corrupt localStorage value', () => {
    localStorage.setItem('fart_mute', '{not json}');
    expect(loadMuted()).toBe(false);
  });

  it('returns false on unexpected non-boolean value', () => {
    localStorage.setItem('fart_mute', '"yes"');
    expect(loadMuted()).toBe(false);
  });
});
