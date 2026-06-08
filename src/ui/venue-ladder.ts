/**
 * PLAN v9 P5 / 04 §7 (D7) — the venue ladder. A region-scoped progress screen:
 * the current region's audience roster as a winding node path, each node's
 * state (done / current / upcoming / boss) computed from per-crowd stars + the
 * current encounter position. Turns "next audience" into a felt climb.
 *
 * The node-state computation is pure + unit-tested; the DOM render + open/close
 * mirror the other overlay screens and are verified in the browser.
 */
import { registerSurface } from './dock';
import type { Audience } from '../state/audience';
import { audienceForEncounter } from '../state/audience';
import { getArea, AREAS } from '../state/containment';
import { audiencePoolForLocation } from '../state/location-progress';
import { loadLastArea, loadStars } from '../state/persistence';
import { currentEncounterIdx } from '../state/run-state';
import { deriveCravingChips, AXIS_LABEL } from './crowd-ticket';
import { axisEmoji } from './axis-emoji';

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

/**
 * Hand-placed winding positions (x%, y%) for the node-path: a zig-zag climbing
 * from bottom-left up to top-right, so the SVG polyline reads as an ascent.
 * Pure + deterministic (04 §7).
 */
export function ladderNodePositions(count: number): [number, number][] {
  if (count <= 0) return [];
  if (count === 1) return [[48, 50]];
  const top = 14;
  const bottom = 86;
  return Array.from({ length: count }, (_, i): [number, number] => {
    const y = Math.round(bottom - (bottom - top) * (i / (count - 1)));
    const x = i % 2 === 0 ? 30 : 66;
    return [x, y];
  });
}

function nodeHtml(node: LadderNode, pos: [number, number], index: number): string {
  const [x, y] = pos;
  const stateClass = node.state === 'current' ? 'cur' : node.state === 'done' ? 'done' : 'lock';
  const cls = `vnode ${stateClass}${node.isBoss ? ' boss' : ''}`;
  const stars = node.state === 'done' && node.stars > 0 ? '⭐'.repeat(node.stars) : '';
  // Locked non-boss shows a padlock; everything else shows its avatar emoji.
  const glyph = node.state === 'upcoming' && !node.isBoss ? '🔒' : node.emoji;
  const label = node.state === 'current' ? node.name : node.isBoss ? 'Headliner' : `Show ${index + 1}`;
  return `<div class="${cls}" style="left:${x}%;top:${y}%">
    <div class="vstars">${stars}</div>
    <div class="circle">${glyph}</div>
    <div class="vlab">${label}</div>
  </div>`;
}

/** Footer card: the next show to play (the current node) + its wants + a CTA. */
function footerHtml(current: Audience): string {
  const wants = deriveCravingChips(current)
    .filter((c) => c.type === 'want')
    .slice(0, 2)
    .map((c) => `${axisEmoji(c.axis)} ${AXIS_LABEL[c.axis]}`)
    .join(' & ');
  const wantsLine = wants ? `Wants ${wants} · ⭐⭐⭐ up for grabs` : '⭐⭐⭐ up for grabs';
  return `<div class="venue-foot">
    <span class="venue-foot-av">${current.emoji}</span>
    <div class="venue-foot-info">
      <div class="venue-foot-nm">${current.name}</div>
      <div class="venue-foot-ds">${wantsLine}</div>
    </div>
    <button type="button" id="venuePlayBtn" class="venue-play-cta">Play ${current.name} ▶</button>
  </div>`;
}

export function renderVenueLadderHtml(nodes: LadderNode[], venueName: string, current: Audience | null): string {
  const totalStars = nodes.reduce((s, n) => s + n.stars, 0);
  const positions = ladderNodePositions(nodes.length);
  const points = positions.map(([x, y]) => `${x},${y}`).join(' ');
  const path = nodes.map((n, i) => nodeHtml(n, positions[i] ?? [50, 50], i)).join('');
  const footer = current ? footerHtml(current) : '';
  return `<div class="venue-ladder-card">
    <div class="venue-ladder-head">
      <h2>🏟️ ${venueName}</h2>
      <span class="venue-ladder-stars">⭐ ${totalStars}</span>
      <button type="button" id="venueLadderCloseBtn" class="venue-ladder-close" aria-label="Close venue ladder">✕</button>
    </div>
    <div class="venue">
      <svg class="venue-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" /></svg>
      ${path}
    </div>
    ${footer}
  </div>`;
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderVenueLadder(): void {
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
  // The footer + CTA reference the CURRENT node — the next show the player will
  // perform. The play screen already shows it, so the ✕ and "Play …" CTA just
  // close the ladder (the loop-closer) — wired by the dock via delegation.
  screen.innerHTML = renderVenueLadderHtml(nodes, area.name, current);
}

export function wireVenueLadder(): void {
  // The dock owns open/close/highlight (see dock.ts).
  registerSurface('venue', { render: renderVenueLadder });
}
