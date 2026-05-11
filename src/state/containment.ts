/**
 * Containment area catalog. Per PLAN.md §D.A.29 (v3 base) + PLAN_v4.md §B.Q
 * (extended to 20 locations across 5 regions for the Map feature).
 *
 * Each location has:
 *   - modifiers (per-axis multipliers + flat scoreOffset)
 *   - region tag (hometown / city / wilderness / royal / cosmic)
 *   - mapX, mapY (0-100% positioning on the SVG world map)
 *   - optional audiencePool: ids of audiences that ONLY appear here.
 *     If omitted, the location uses the global rotation.
 */

export type Region = 'hometown' | 'city' | 'wilderness' | 'royal' | 'cosmic';

export interface RegionMeta {
  id: Region;
  name: string;
  emoji: string;
  /** Hint shown in tooltips for locked locations of this region. */
  unlockHint: string;
}

export const REGIONS: readonly RegionMeta[] = [
  { id: 'hometown',  name: 'Hometown',   emoji: '🏠', unlockHint: 'Always available' },
  { id: 'city',      name: 'City',       emoji: '🏙', unlockHint: 'Please 5 different audiences' },
  { id: 'wilderness',name: 'Wilderness', emoji: '🌲', unlockHint: 'Discover 10 recipes' },
  { id: 'royal',     name: 'Royal',      emoji: '👑', unlockHint: 'Defeat the Royal Court Trial' },
  { id: 'cosmic',    name: 'Cosmic',     emoji: '🌌', unlockHint: 'Defeat the Cosmic Council' },
];

export interface AreaModifiers {
  wet: number;
  dry: number;
  stink: number;
  loud: number;
  musical: number;
  length: number;
  temp: number;
  scoreOffset: number;
}

export interface Area {
  id: string;
  name: string;
  emoji: string;
  modifiers: AreaModifiers;
  flavor: string;
  region: Region;
  /** SVG map position (0-100%). */
  mapX: number;
  mapY: number;
  /** Optional audience-id pool. If set, only these audiences appear here. */
  audiencePool?: string[];
}

const m = (
  wet: number,
  dry: number,
  stink: number,
  loud: number,
  musical: number,
  length: number,
  temp: number,
  scoreOffset = 0,
): AreaModifiers => ({ wet, dry, stink, loud, musical, length, temp, scoreOffset });

export const AREAS: readonly Area[] = [
  // ===== Region 1: Hometown (always unlocked) =====
  { id: 'outside',         name: 'Backyard',         emoji: '🌳', region: 'hometown',  mapX: 18, mapY: 70, modifiers: m(0.5, 1.0, 0.5, 1.5, 1.0, 1.0, 1.0),       flavor: 'Wide open. Stink dissipates; volume travels.' },
  { id: 'covers',          name: 'Under the Covers', emoji: '🛏️', region: 'hometown',  mapX: 12, mapY: 80, modifiers: m(1.0, 1.0, 3.0, 0.3, 1.0, 1.0, 1.0),       flavor: 'Trapped. Stink concentrates. Volume muffled.' },
  { id: 'library',         name: 'Library',          emoji: '📚', region: 'hometown',  mapX: 25, mapY: 65, modifiers: m(1.0, 1.0, 1.5, 1.5, 1.0, 1.0, 1.0, -3),  flavor: 'Quiet hostility. Loud farts incur public shame.' },
  { id: 'restroom',        name: 'Public Restroom',  emoji: '🚽', region: 'hometown',  mapX: 18, mapY: 88, modifiers: m(1.5, 0.5, 3.0, 1.2, 0.8, 1.0, 1.0),       flavor: 'A natural habitat. Audience is loud, forgiving, and slightly drunk.' },

  // ===== Region 2: City (unlocks after 5 audiences pleased) =====
  { id: 'elevator',        name: 'Elevator',         emoji: '🛗', region: 'city',      mapX: 45, mapY: 50, modifiers: m(1.0, 1.0, 4.0, 2.0, 1.0, 1.0, 1.0),       flavor: 'Small enclosed comedy. Maximum chaos.' },
  { id: 'stadium',         name: 'Stadium',          emoji: '🏟', region: 'city',      mapX: 50, mapY: 38, modifiers: m(0.7, 1.0, 0.5, 3.0, 1.0, 2.0, 1.0),       flavor: 'Massive crowd. Volume rewarded; subtlety lost.' },
  { id: 'subway',          name: 'Subway Car',       emoji: '🚇', region: 'city',      mapX: 40, mapY: 60, modifiers: m(1.0, 1.0, 2.5, 1.5, 1.0, 1.0, 1.0, 2),    flavor: 'Captive commuters. The audience cannot leave.' },
  { id: 'grocery',         name: 'Grocery Aisle',    emoji: '🛒', region: 'city',      mapX: 38, mapY: 45, modifiers: m(1.2, 1.0, 1.5, 1.0, 1.5, 1.0, 0.5),       flavor: 'Refrigerated air. Stink lingers around the produce section.' },

  // ===== Region 3: Wilderness (unlocks after 10 recipes discovered) =====
  { id: 'campsite',        name: 'Campsite',         emoji: '🏕', region: 'wilderness', mapX: 30, mapY: 25, modifiers: m(1.0, 1.0, 1.0, 1.5, 1.0, 2.0, 1.0),       flavor: 'Around the fire. Length is everything; the smoke covers minor crimes.' },
  { id: 'volcano-rim',     name: 'Volcano Rim',      emoji: '🌋', region: 'wilderness', mapX: 55, mapY: 22, modifiers: m(0.8, 1.0, 1.5, 1.5, 1.0, 1.5, 3.0),       flavor: 'Magma below. All-axis amplification; temperature is king.' },
  { id: 'beach',           name: 'Beach',            emoji: '🌊', region: 'wilderness', mapX: 18, mapY: 30, modifiers: m(1.5, 0.7, 1.0, 1.0, 1.0, 1.0, 0.8),       flavor: 'Salty wind. Wetness rewarded; the gulls judge.' },
  { id: 'forest',          name: 'Forest',           emoji: '🌲', region: 'wilderness', mapX: 42, mapY: 18, modifiers: m(1.0, 1.0, 1.0, 0.8, 1.5, 1.5, 1.0),       flavor: 'Quiet woodland. Musical notes carry through the trees.' },

  // ===== Region 4: Royal (unlocks after Boss 2 defeated) =====
  { id: 'throne',          name: 'Throne Room',      emoji: '🪑', region: 'royal',     mapX: 70, mapY: 60, modifiers: m(1.0, 1.0, 0.4, 1.0, 2.0, 1.0, 1.0),       flavor: 'Echoes amplify musicality. Stink shames the realm.',
    audiencePool: ['royal-court', 'opera-house'] },
  { id: 'castle-banquet',  name: 'Castle Banquet',   emoji: '🏰', region: 'royal',     mapX: 78, mapY: 50, modifiers: m(1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0),       flavor: 'A long table of nobles. Length is the metric of refinement.',
    audiencePool: ['royal-court', 'food-critics'] },
  { id: 'opera-stage',     name: 'Opera House',      emoji: '🎭', region: 'royal',     mapX: 72, mapY: 70, modifiers: m(1.0, 1.0, 1.0, 0.5, 3.0, 1.0, 1.0),       flavor: 'Acoustic perfection. Musicality is mandatory; volume is gauche.',
    audiencePool: ['opera-house', 'royal-court'] },
  { id: 'high-court',      name: 'High Court',       emoji: '⚖', region: 'royal',     mapX: 80, mapY: 65, modifiers: m(1.0, 1.0, 0.8, 0.7, 1.5, 1.5, 1.0),       flavor: 'A panel of judges. Quiet, formal, terrifying.',
    audiencePool: ['royal-court', 'librarians'] },

  // ===== Region 5: Cosmic (unlocks after Boss 5 defeated) =====
  { id: 'space',           name: 'Space Station',    emoji: '🚀', region: 'cosmic',    mapX: 85, mapY: 18, modifiers: m(0.5, 0.5, 0.5, 0.5, 1.0, 1.5, 0.5),       flavor: 'Inverted physics. Everything dampens. Length wins.',
    audiencePool: ['astronauts', 'alien-tourists'] },
  { id: 'cloud-kingdom',   name: 'Cloud Kingdom',    emoji: '☁', region: 'cosmic',    mapX: 90, mapY: 25, modifiers: m(0.7, 1.0, 0.7, 1.0, 3.0, 2.0, 0.8),       flavor: 'Above the storms. Musical, long, ethereal.',
    audiencePool: ['mystery-guest', 'opera-house'] },
  { id: 'alien-bar',       name: 'Alien Bar',        emoji: '🪐', region: 'cosmic',    mapX: 80, mapY: 30, modifiers: m(1.5, 0.8, 1.5, 1.2, 1.2, 1.0, 1.2),       flavor: 'A galactic dive. The audience reshuffles daily.',
    audiencePool: ['alien-tourists', 'mystery-guest', 'frat-bros'] },
  { id: 'quantum-lab',     name: 'Quantum Lab',      emoji: '⚛', region: 'cosmic',    mapX: 95, mapY: 35, modifiers: m(1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0),       flavor: 'All multipliers shimmer at exactly 1.0. The chaos is in the audience.',
    audiencePool: ['mystery-guest', 'alien-tourists'] },
];

export function getArea(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

export function areasInRegion(region: Region): Area[] {
  return AREAS.filter((a) => a.region === region);
}
