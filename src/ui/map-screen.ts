/**
 * World map UI. Per PLAN_v4.md §B.R items 85-87.
 *
 * - Travel button opens the map overlay
 * - 20 pins positioned by mapX/mapY on the SVG canvas
 * - Locked pins show 🔒 + tooltip with unlock requirement
 * - Today's hot-spot pulses (Phase Q dailyHotLocation)
 * - Clicking an unlocked pin selects that location, applies region-themed
 *   body class, and closes the map
 */

import { AREAS, REGIONS, getArea, type Region } from '../state/containment';
import {
  isLocationUnlocked,
  dailyHotLocation,
} from '../state/location-progress';
import { loadLastArea, setLastArea } from '../state/persistence';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function regionMetaFor(region: Region) {
  return REGIONS.find((r) => r.id === region)!;
}

function renderMapCanvas(): void {
  const canvas = $('mapCanvas');
  if (!canvas) return;
  const hot = dailyHotLocation();
  const currentId = loadLastArea();

  function pinHtml(a: typeof AREAS[number]): string {
    const unlocked = isLocationUnlocked(a);
    const isHot = hot?.id === a.id && unlocked;
    const isCurrent = a.id === currentId;
    const region = regionMetaFor(a.region);
    const lockedHint = unlocked ? '' : `Locked — ${region.unlockHint}`;
    const label = `${a.emoji} ${a.name}`;
    const ariaLabel = unlocked
      ? `${label} (${a.region}) — tap to travel`
      : `${label} (${a.region}) — ${lockedHint}`;
    const className = [
      'map-pin',
      `map-pin-${a.region}`,
      isHot ? 'map-pin-hot' : '',
      isCurrent ? 'map-pin-current' : '',
    ].filter(Boolean).join(' ');
    const lockIcon = unlocked ? '' : '<span class="map-pin-lock">🔒</span>';
    return `<button type="button" class="${className}"
      data-location="${a.id}"
      data-region="${a.region}"
      data-locked="${unlocked ? 'false' : 'true'}"
      style="left:${a.mapX}%; top:${a.mapY}%"
      aria-label="${ariaLabel}"
      title="${ariaLabel}">
      <span class="map-pin-emoji">${a.emoji}</span>
      <span class="map-pin-name">${a.name}</span>
      ${lockIcon}
    </button>`;
  }

  // Build interleaved region label + pins so the mobile-list-view reads
  // correctly. On desktop, the labels still get absolute-positioned (inline
  // styles) while pins are positioned by their own mapX/mapY.
  const regionLabelPositions: Record<string, { cx: number; cy: number }> = {
    hometown:   { cx: 18, cy: 60 },
    city:       { cx: 44, cy: 30 },
    wilderness: { cx: 36, cy: 10 },
    royal:      { cx: 75, cy: 50 },
    cosmic:     { cx: 88, cy: 20 },
  };
  const groups = REGIONS.map((r) => {
    const pos = regionLabelPositions[r.id]!;
    const label = `<div class="map-region-label" style="left:${pos.cx}%; top:${pos.cy}%" data-region="${r.id}">
      ${r.emoji} ${r.name}
    </div>`;
    const regionPins = AREAS.filter((a) => a.region === r.id).map(pinHtml).join('');
    return label + regionPins;
  }).join('');

  canvas.innerHTML = groups;

  canvas.querySelectorAll<HTMLButtonElement>('.map-pin').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-location');
      if (!id) return;
      if (btn.getAttribute('data-locked') === 'true') return; // locked
      onSelectLocation(id);
    });
  });
}

function applyRegionBodyClass(): void {
  const loc = getArea(loadLastArea());
  if (loc) document.body.dataset.region = loc.region;
}

function onSelectLocation(id: string): void {
  setLastArea(id);
  applyRegionBodyClass();
  closeMap();
  // Re-render the Story shell's area-related UI. The area-grid is
  // legacy; the map replaces it. But to stay backward-compatible, we
  // dispatch a custom event that plate.ts listens for.
  window.dispatchEvent(new CustomEvent('fart:location-changed'));
}

export function openMap(): void {
  renderMapCanvas();
  $('mapScreen')?.removeAttribute('hidden');
}

export function closeMap(): void {
  $('mapScreen')?.setAttribute('hidden', '');
}

export function wireMap(): void {
  $('travelBtn')?.addEventListener('click', openMap);
  $('mapCloseBtn')?.addEventListener('click', closeMap);
  $('mapScreen')?.addEventListener('click', (ev) => {
    if (ev.target === $('mapScreen')) closeMap();
  });
  // Apply the region body class on initial load.
  applyRegionBodyClass();
}
