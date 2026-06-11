/**
 * Live Crowd Read strip — DOM glue for scoring/crowd-read.ts ("The Live
 * Show"). Renders the crowd's coarse mood (emoji + murmur caption + trend
 * arrow) into #crowdMoodStrip on the crowd ticket while the player plates.
 *
 * plate.ts computes the CrowdRead (it owns the launch-resolution pipeline)
 * and pushes it in here — one-way data flow, no scoring imports back into
 * the plate. Updates are debounced (CROWD_READ.debounceMs) so rapid plate
 * edits don't strobe the animation, SFX, or the aria-live region; on a tier
 * CHANGE the strip pops, the portrait bounces, a murmur cue plays, and a
 * soft haptic fires.
 */

import { CROWD_READ } from '../scoring/tuning';
import {
  MOOD_EMOJI,
  TREND_ARROW,
  EXPECTANT_CAPTION,
  VIOLATION_CAPTION,
  crowdMoodCaption,
  type CrowdRead,
} from '../scoring/crowd-read';
import { playEventSfx, CROWD_MURMUR_SFX } from '../audio/event-sfx';
import { triggerHaptic, HAPTICS } from './haptics';

export interface CrowdMoodUpdate {
  /** null = empty plate → the crowd just watches, expectant. */
  read: CrowdRead | null;
  audienceName: string;
}

let debounceTimer: number | null = null;
/** Last rendered tier key ('!'-suffixed when violated) for change detection. */
let lastTierKey: string | null = null;

function strip(): HTMLElement | null {
  return document.getElementById('crowdMoodStrip');
}

export function updateCrowdMood(u: CrowdMoodUpdate): void {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    render(u);
  }, CROWD_READ.debounceMs);
}

function render(u: CrowdMoodUpdate): void {
  const el = strip();
  if (!el) return;

  if (u.read === null) {
    el.innerHTML = `<span class="cm-emoji">${MOOD_EMOJI.expectant}</span><span class="cm-caption">${EXPECTANT_CAPTION}</span>`;
    el.classList.remove('cm-violation');
    el.removeAttribute('hidden');
    lastTierKey = 'expectant';
    return;
  }

  const r = u.read;
  const caption = r.violated ? VIOLATION_CAPTION : crowdMoodCaption(r.tier, u.audienceName, r.captionSeed);
  const arrow = TREND_ARROW[r.trend];
  const arrowHtml = arrow
    ? `<span class="cm-trend cm-trend-${r.trend}" aria-hidden="true">${arrow}</span>`
    : '';
  el.innerHTML = `<span class="cm-emoji">${r.violated ? '🚫' : MOOD_EMOJI[r.tier]}</span><span class="cm-caption">${caption}</span>${arrowHtml}`;
  el.classList.toggle('cm-violation', r.violated);
  el.removeAttribute('hidden');

  const tierKey = r.violated ? `${r.tier}!` : r.tier;
  // Mood SHIFT beat — only when the tier actually moved (and not on the very
  // first read, which would sting before the player has done anything).
  if (lastTierKey !== null && lastTierKey !== 'expectant' && tierKey !== lastTierKey) {
    el.classList.remove('cm-pop');
    void el.offsetWidth;
    el.classList.add('cm-pop');
    bouncePortrait();
    if (r.trend === 'warmer') void playEventSfx(CROWD_MURMUR_SFX.up, 4);
    else if (r.trend === 'colder') void playEventSfx(CROWD_MURMUR_SFX.down, 4);
    triggerHaptic(HAPTICS.moodShift);
  }
  lastTierKey = tierKey;
}

/** Re-trigger the existing loved-tier portrait wobble (same pattern plate.ts uses). */
function bouncePortrait(): void {
  const portrait = document.getElementById('audiencePortraitEmoji');
  if (!portrait) return;
  portrait.classList.remove('audience-portrait-loved');
  void portrait.offsetWidth;
  portrait.classList.add('audience-portrait-loved');
  window.setTimeout(() => portrait.classList.remove('audience-portrait-loved'), 1200);
}

/** Hide the strip and forget mood state (encounter advance / boss arena). */
export function resetCrowdMood(): void {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  lastTierKey = null;
  const el = strip();
  if (el) {
    el.setAttribute('hidden', '');
    el.innerHTML = '';
    el.classList.remove('cm-violation', 'cm-pop');
  }
}
