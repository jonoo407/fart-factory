/**
 * PLAN v9 UI-overhaul Phase 1 / 04 §2 — the play-screen top bar.
 *
 * Two nav surfaces only: this pure-status top bar
 *   [ mute chip ] · [ REGION / Show N of M ] · [ gold chip ]
 * and the fixed dock at the bottom. No nav buttons live up here.
 *
 * The "Show N of M" total comes from the same ~6-show venue windowing the venue
 * ladder uses, so the top label and the ladder agree on one climb framing
 * rather than a hardcoded per-region total.
 */
import { audienceForEncounter } from '../state/audience';
import { getArea, AREAS, REGIONS } from '../state/containment';
import { audiencePoolForLocation } from '../state/location-progress';
import { loadLastArea } from '../state/persistence';
import { currentEncounterIdx } from '../state/run-state';

/** Must match venue-ladder.ts VENUE_SIZE so the climb framing is consistent. */
export const VENUE_SIZE = 6;

export interface ShowPosition {
  showIndex: number;
  showTotal: number;
}

/**
 * Given the full region roster length and the player's index within it, return
 * the 1-based show number inside the current ~6-show venue window and the size
 * of that window. Pure — the windowing math mirrors venue-ladder.ts.
 */
export function computeShowPosition(
  fullRosterLength: number,
  currentFullIdx: number,
  venueSize: number = VENUE_SIZE,
): ShowPosition {
  const windowStart = Math.floor(currentFullIdx / venueSize) * venueSize;
  const showIndex = currentFullIdx - windowStart + 1;
  const showTotal = Math.max(0, Math.min(venueSize, fullRosterLength - windowStart));
  return { showIndex, showTotal };
}

/** The display name of the region a location belongs to (falls back to Hometown). */
export function regionNameForArea(areaId: string): string {
  const area = getArea(areaId);
  const region = area ? REGIONS.find((r) => r.id === area.region) : undefined;
  return (region ?? REGIONS[0]!).name;
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Fill the top-bar region name + "Show N of M" from current state. Defensive: a
 * no-op if the elements are absent (e.g. in unit tests). Call alongside
 * renderProgression() wherever the encounter/area changes.
 */
export function renderTopBar(): void {
  const regionEl = $('regionName');
  const showEl = $('showCount');
  if (!regionEl && !showEl) return;

  const area = getArea(loadLastArea()) ?? AREAS[0]!;
  if (regionEl) regionEl.textContent = regionNameForArea(area.id);

  if (showEl) {
    const pool = audiencePoolForLocation(area);
    const fullRoster = pool.length > 0 ? [...pool] : [];
    if (fullRoster.length === 0) {
      showEl.textContent = '';
      return;
    }
    const current = audienceForEncounter(currentEncounterIdx(), fullRoster);
    const curFull = Math.max(0, fullRoster.findIndex((a) => a.id === current.id));
    const { showIndex, showTotal } = computeShowPosition(fullRoster.length, curFull);
    showEl.textContent = `Show ${showIndex} of ${showTotal}`;
  }
}
