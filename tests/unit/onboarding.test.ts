import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldShowOnboarding,
  markOnboardingSeen,
  resetOnboarding,
  TUTORIAL_STEPS,
} from '../../src/ui/onboarding';

beforeEach(() => {
  localStorage.clear();
});

describe('TUTORIAL_STEPS', () => {
  it('has at least 3 steps with title + body', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(3);
    for (const s of TUTORIAL_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});

describe('shouldShowOnboarding', () => {
  it('returns true on first visit', () => {
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('returns false after markOnboardingSeen', () => {
    markOnboardingSeen();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('returns true after resetOnboarding', () => {
    markOnboardingSeen();
    resetOnboarding();
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('survives malformed storage', () => {
    localStorage.setItem('fart_onboarding_seen', '{not bool');
    expect(() => shouldShowOnboarding()).not.toThrow();
    // Corrupt value should be treated as "not seen" (safe default for first visit)
    expect(shouldShowOnboarding()).toBe(true);
  });
});
