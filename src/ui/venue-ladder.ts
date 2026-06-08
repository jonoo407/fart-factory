/**
 * PLAN v9 P5 / 04 §7 (D7) — the venue ladder. A region-scoped progress screen:
 * the current region's audience roster as a winding node path, each node's
 * state (done / current / upcoming / boss) computed from per-crowd stars + the
 * current encounter position. Turns "next audience" into a felt climb.
 *
 * The node-state computation is pure + unit-tested; the DOM render + open/close
 * mirror the other overlay screens and are verified in the browser.
 */
import type { Audience } from '../state/audience';
import { audienceForEncounter, getAudience } from '../state/audience';
import { getArea, AREAS } from '../state/containment';
import { audiencePoolForLocation } from '../state/location-progress';
import { loadLastArea, loadStars } from '../state/persistence';
import { currentEncounterIdx } from '../state/run-state';

export type NodeState = 'done' | 'current' | 'upcoming';

export interface LadderNode {
  audienceId: string;
  emoji: string;
  name: string;
  state: NodeState;
  stars: number;
  isBoss: boolean;
}

/**
 * A node is `current` if it is the audience the player is facing now; `done` if
 * it has been passed before (best stars ≥ 1); otherwise `upcoming`.
 */
export function computeLadderNodes(
  audiences: readonly Audience[],
  currentId: string,
  getStars: (id: string) => number,
): LadderNode[] {
  return audiences.map((a) => {
    const stars = getStars(a.id);
    const state: NodeState = a.id === currentId ? 'current' : stars > 0 ? 'done' : 'upcoming';
    return { audienceId: a.id, emoji: a.emoji, name: a.name, state, stars, isBoss: a.difficultyTier === 'boss' };
  });
}

function nodeHtml(node: LadderNode, index: number): string {
  const starRow = node.stars > 0 ? '⭐'.repeat(node.stars) : '';
  const glyph = node.state === 'current' ? '▶' : node.isBoss ? '👑' : node.state === 'done' ? node.emoji : '🔒';
  const tag = node.isBoss ? '<span class="vnode-tag boss">BOSS</span>' : '';
  return `<div class="vnode vnode-${node.state}${node.isBoss ? ' vnode-boss' : ''}">
    ${tag}
    <div class="vnode-stars">${starRow}</div>
    <div class="vnode-circle">${glyph}</div>
    <div class="vnode-label">${node.state === 'current' ? node.name : node.isBoss ? 'Headliner' : 'Show ' + (index + 1)}</div>
  </div>`;
}

export function renderVenueLadderHtml(nodes: LadderNode[], venueName: string, next: Audience | null): string {
  const totalStars = nodes.reduce((s, n) => s + n.stars, 0);
  const path = nodes.map(nodeHtml).join('');
  const footer = next
    ? `<div class="venue-foot"><span class="venue-foot-av">${next.emoji}</span><div><div class="venue-foot-nm">Up next: ${next.name}</div></div></div>`
    : '';
  return `<div class="venue-ladder-card">
    <div class="venue-ladder-head">
      <h2>🏟️ ${venueName}</h2>
      <span class="venue-ladder-stars">⭐ ${totalStars}</span>
      <button type="button" id="venueLadderCloseBtn" class="venue-ladder-close" aria-label="Close venue ladder">✕</button>
    </div>
    <div class="venue-ladder-path">${path}</div>
    ${footer}
  </div>`;
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function openVenueLadder(): void {
  const screen = $('venueLadder');
  if (!screen) return;
  const area = getArea(loadLastArea()) ?? AREAS[0]!;
  const pool = audiencePoolForLocation(area);
  const fullRoster = pool.length > 0 ? [...pool] : [];
  const current = audienceForEncounter(currentEncounterIdx(), fullRoster);
  // Window the region roster into ~6-show venues (04 §7 — "a venue = ~6 shows"),
  // so the ladder reads as a felt climb rather than the whole region at once.
  const VENUE_SIZE = 6;
  const curFull = Math.max(0, fullRoster.findIndex((a) => a.id === current.id));
  const windowStart = Math.floor(curFull / VENUE_SIZE) * VENUE_SIZE;
  const roster = fullRoster.slice(windowStart, windowStart + VENUE_SIZE);
  const nodes = computeLadderNodes(roster, current.id, loadStars);
  // next = first upcoming-or-current after the current, else null
  const curIdx = roster.findIndex((a) => a.id === current.id);
  const next = curIdx >= 0 && curIdx + 1 < roster.length ? getAudience(roster[curIdx + 1]!.id) ?? null : null;
  screen.innerHTML = renderVenueLadderHtml(nodes, area.name, next);
  screen.removeAttribute('hidden');
  $('venueLadderCloseBtn')?.addEventListener('click', closeVenueLadder);
}

export function closeVenueLadder(): void {
  $('venueLadder')?.setAttribute('hidden', '');
}

export function wireVenueLadder(): void {
  $('venueBtn')?.addEventListener('click', openVenueLadder);
}
