/**
 * Rest action: spend research notes to refill belly mid-session.
 *
 * Closes the "I ran out of daily belly and now I'm stuck" gap that the
 * user reported. Research notes accrue from failed launches (match% < 50),
 * so this gives the failure currency a meaningful in-session sink and
 * an immediate recovery path.
 *
 * Constraints:
 *   - Costs REST_NOTES_COST notes per refill.
 *   - Refuses when notes are insufficient.
 *   - Refuses when belly is already full (no-op prevention).
 *   - Refills to BELLY_CAPACITY exactly (not partial).
 */

import {
  loadBelly,
  refillBelly,
  loadResearchNotes,
  addResearchNotes,
  BELLY_CAPACITY,
} from '../state/persistence';

export { BELLY_CAPACITY };
export const REST_NOTES_COST = 10;

export type RestResult =
  | { ok: true; notesAfter: number }
  | { ok: false; reason: 'insufficient-notes' | 'already-full' };

export function attemptRestRefill(): RestResult {
  if (loadBelly() >= BELLY_CAPACITY) return { ok: false, reason: 'already-full' };
  if (loadResearchNotes() < REST_NOTES_COST) return { ok: false, reason: 'insufficient-notes' };
  refillBelly();
  const notesAfter = addResearchNotes(-REST_NOTES_COST);
  return { ok: true, notesAfter };
}
