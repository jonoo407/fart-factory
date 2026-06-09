/**
 * Cleanup #2 — the intermission previews the UPCOMING crowd so the break is a
 * real planning beat. The next audience is the one you advance into when the
 * intermission resolves (idx + 1), and we surface the SAME craving chips the
 * Order Ticket shows (label-only, clue density per difficulty — no raw numbers).
 *
 * Deliberately does NOT account for the surprise Mystery Unicorn roll: that
 * encounter is meant to ambush you, so spoiling it in the preview would defeat
 * the gag. The pure idx→audience math lives here; the DOM is rendered (and
 * verified) in intermission.ts.
 */
import { audienceForEncounter, type Audience } from '../state/audience';
import { deriveCravingChips, type CravingChip } from './crowd-ticket';

export interface AudiencePreview {
  audience: Audience;
  chips: CravingChip[];
}

export function nextAudiencePreview(idx: number, pool?: readonly Audience[]): AudiencePreview {
  const audience = audienceForEncounter(idx + 1, pool);
  return { audience, chips: deriveCravingChips(audience) };
}
