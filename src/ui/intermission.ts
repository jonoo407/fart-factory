/**
 * Intermission modal. Per PLAN_v5 humming-frolicking-wilkes.md.
 *
 * Opens after the player taps "Move On". Renders 3 random activities;
 * player picks 1. The buff (or immediate effect) is applied, the
 * encounter counter is bumped, and the underlying Story UI re-renders.
 */

import { rollIntermission, type Activity } from '../state/activities';
import { setActiveBuff } from '../scoring/buffs';
import {
  currentEncounterIdx,
  incrementEncounter,
} from '../state/run-state';
import { refillBelly } from '../state/persistence';
import { decrementAllCooldowns } from '../state/boss-cadence';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

const KEY_SKIP_NEXT_INTERMISSION = 'fart_skip_next_intermission';

function shouldSkipIntermission(): boolean {
  try {
    return localStorage.getItem(KEY_SKIP_NEXT_INTERMISSION) === 'true';
  } catch {
    return false;
  }
}

function clearSkipIntermission(): void {
  try {
    localStorage.removeItem(KEY_SKIP_NEXT_INTERMISSION);
  } catch {
    // ignore
  }
}

function setSkipNextIntermission(): void {
  try {
    localStorage.setItem(KEY_SKIP_NEXT_INTERMISSION, 'true');
  } catch {
    // ignore
  }
}

function applyActivityChoice(activity: Activity): void {
  // Property / gold-mult / restriction-cancel / easy-mode buffs persist
  // to next launch.
  if (activity.buff) {
    setActiveBuff(activity.id);
  }
  // Immediate effects fire right away.
  if (activity.immediate) {
    if (activity.immediate.kind === 'refill-belly') {
      // Top up belly by the specified amount, capped at BELLY_MAX.
      // Implementation: read current belly + amount, then refill (clamp).
      // We expose this via a custom event so plate.ts can re-render.
      // The actual add: we use refillBelly to set to max, then deduct
      // (max - currentAddend). Simpler — just refillBelly to MAX since
      // the "+6 belly" feels like "rest a bit"; cap is the natural ceiling.
      refillBelly();
    } else if (activity.immediate.kind === 'full-belly') {
      refillBelly();
      if (activity.immediate.skipNextIntermission) {
        setSkipNextIntermission();
      }
    }
  }
}

let onIntermissionResolved: (() => void) | null = null;

function renderChoices(): void {
  const grid = $('intermissionChoices');
  if (!grid) return;
  // Roll for the CURRENT encounter idx (the one we're leaving).
  const offers = rollIntermission(currentEncounterIdx());
  grid.innerHTML = offers.map((a) => {
    return `<button type="button" class="intermission-choice" data-activity="${a.id}" aria-label="${a.name}: ${a.description}">
      <span class="intermission-choice-emoji">${a.emoji}</span>
      <span class="intermission-choice-name">${a.name}</span>
      <span class="intermission-choice-desc">${a.description}</span>
    </button>`;
  }).join('');

  grid.querySelectorAll<HTMLButtonElement>('.intermission-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-activity');
      if (!id) return;
      const activity = offers.find((a) => a.id === id);
      if (!activity) return;
      applyActivityChoice(activity);
      finishIntermission();
    });
  });
}

function finishIntermission(): void {
  // Advance the encounter idx + clear cooldowns.
  incrementEncounter();
  decrementAllCooldowns();
  // Hide modal.
  $('intermissionOverlay')?.setAttribute('hidden', '');
  // Notify whoever opened us (plate.ts) so it can re-render.
  if (onIntermissionResolved) {
    const cb = onIntermissionResolved;
    onIntermissionResolved = null;
    cb();
  }
}

/**
 * Open the intermission modal. Returns via the onResolved callback when
 * the player has picked an activity (or skipped if shouldSkipIntermission
 * was set by a prior Power Nap).
 */
export function openIntermission(onResolved: () => void): void {
  onIntermissionResolved = onResolved;
  if (shouldSkipIntermission()) {
    // Power Nap consumed the next intermission slot.
    clearSkipIntermission();
    finishIntermission();
    return;
  }
  renderChoices();
  $('intermissionOverlay')?.removeAttribute('hidden');
}

export function closeIntermission(): void {
  $('intermissionOverlay')?.setAttribute('hidden', '');
  onIntermissionResolved = null;
}
