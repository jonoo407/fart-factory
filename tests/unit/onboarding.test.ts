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
  it('has the three Order Ticket onboarding cards with title + body (04 §10)', () => {
    expect(TUTORIAL_STEPS.length).toBe(3);
    for (const s of TUTORIAL_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it('teaches discovery-by-doing (the redesign hook)', () => {
    const allText = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase();
    expect(allText).toMatch(/discover|learn what it does|field guide/);
  });

  it('teaches the food game, not the v2 slider game (P2 regression)', () => {
    // Onboarding must describe pantry / plate / audience / launch — the v4
    // Story Mode UI — not "Move the six sliders".
    const allText = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase();
    expect(allText).not.toContain('slider');
    expect(allText).toMatch(/pantry|plate|food|audience|cravings/);
  });

  it('mentions the launch action', () => {
    const allText = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase();
    expect(allText).toMatch(/launch/);
  });

  it('mentions the progression rewards (gold or research notes)', () => {
    const allText = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase();
    expect(allText).toMatch(/gold|notes/);
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
