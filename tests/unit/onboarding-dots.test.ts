import { describe, it, expect, beforeEach } from 'vitest';
import { showOnboarding, TUTORIAL_STEPS } from '../../src/ui/onboarding';

/**
 * PLAN v9 Phase 7 — onboarding shows progress DOTS (one per step, the current
 * one active) instead of the "Step N of M" text. Matches prototype
 * ff-proto.css:291-293 (.introcard .dots i / .dots i.on).
 */

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('Onboarding progress dots (P7)', () => {
  it('renders one dot per tutorial step, with exactly one active', () => {
    showOnboarding();
    const dots = document.querySelectorAll('.onboarding-step-indicator i');
    expect(dots.length).toBe(TUTORIAL_STEPS.length);
    expect(document.querySelectorAll('.onboarding-step-indicator i.on').length).toBe(1);
  });

  it('the active dot starts on the first step', () => {
    showOnboarding();
    const dots = [...document.querySelectorAll('.onboarding-step-indicator i')];
    expect(dots[0].classList.contains('on')).toBe(true);
  });

  it('advancing with Next moves the active dot forward', () => {
    showOnboarding();
    (document.getElementById('onboardingNext') as HTMLButtonElement).click();
    const dots = [...document.querySelectorAll('.onboarding-step-indicator i')];
    expect(dots[0].classList.contains('on')).toBe(false);
    expect(dots[1].classList.contains('on')).toBe(true);
  });

  it('no longer renders the "Step N of M" text (and keeps an a11y label)', () => {
    showOnboarding();
    const ind = document.querySelector('.onboarding-step-indicator')!;
    expect(ind.textContent ?? '').not.toMatch(/Step \d/);
    // Progress is still conveyed to assistive tech via an aria-label.
    expect(ind.getAttribute('aria-label')).toMatch(/1 of 3/);
  });
});
