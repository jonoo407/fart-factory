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
  encounterSeed,
  rngBetween,
} from '../state/run-state';
import { grantBellyBonus, loadPantry, unlockFood, loadLastArea } from '../state/persistence';
import { FOODS } from '../state/food';
import { decrementAllCooldowns } from '../state/boss-cadence';
import { nextAudiencePreview } from './audience-preview';
import { renderCravingChipsHtml } from './crowd-ticket';
import { AREAS, getArea } from '../state/containment';
import { audiencePoolForLocation } from '../state/location-progress';

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

export function applyActivityChoice(activity: Activity): void {
  // Property / gold-mult / restriction-cancel / easy-mode buffs persist
  // to next launch.
  if (activity.buff) {
    setActiveBuff(activity.id);
  }
  // Immediate effects fire right away.
  if (activity.immediate) {
    if (activity.immediate.kind === 'belly-bonus') {
      // A full belly is bad (you eat less), so the benefit is MORE room. Grant
      // the bonus to the UPCOMING encounter (currentEncounterIdx + 1, the crowd
      // we advance into when this intermission resolves) — granting to the
      // current idx would be thrown away by the per-encounter belly reset.
      grantBellyBonus(activity.immediate.amount, currentEncounterIdx() + 1);
      if (activity.immediate.skipNextIntermission) {
        setSkipNextIntermission();
      }
    } else if (activity.immediate.kind === 'grant-food') {
      // PLAN v9 — Forage: unlock a random not-yet-owned non-legendary food.
      const owned = new Set(loadPantry());
      const candidates = FOODS.filter((f) => !owned.has(f.id) && f.rarity !== 'legendary');
      if (candidates.length > 0) {
        const pick = candidates[rngBetween(encounterSeed(currentEncounterIdx()), 0, candidates.length - 1)]!;
        unlockFood(pick.id);
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

/**
 * Cleanup #2 — preview the crowd you're about to face so the break is a real
 * planning beat. Shows the upcoming audience's portrait + name and the same
 * "They're craving" chips the Order Ticket uses (label-only, clue density per
 * difficulty). Mirrors plate.ts's location-aware pool; the surprise Unicorn is
 * deliberately not previewed.
 */
function renderNextAudiencePreview(): void {
  const el = $('intermissionNext');
  if (!el) return;
  const area = getArea(loadLastArea()) ?? AREAS[0]!;
  const pool = audiencePoolForLocation(area);
  const { audience } = nextAudiencePreview(currentEncounterIdx(), pool);
  el.innerHTML = `
    <div class="intermission-next-label">Up next</div>
    <div class="intermission-next-aud">
      <span class="intermission-next-emoji">${audience.emoji}</span>
      <span class="intermission-next-name">${audience.name}</span>
    </div>
    ${renderCravingChipsHtml(audience)}
  `;
  el.removeAttribute('hidden');
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
  renderNextAudiencePreview();
  $('intermissionOverlay')?.removeAttribute('hidden');
}

export function closeIntermission(): void {
  $('intermissionOverlay')?.setAttribute('hidden', '');
  onIntermissionResolved = null;
}
