/**
 * PLAN v9 P1 — hold-to-charge quality resolver. Pure port of the prototype
 * BlastButton release logic (design_reference/prototype/ff-components.jsx
 * lines 139-153). The charge meter sweeps 0→100→0; on release the sweep
 * `value` and the press duration `heldMs` resolve to a quality multiplier.
 *
 * Evaluation ORDER is significant: a sub-`tapMs` release short-circuits to a
 * safe tap (no bonus, no penalty) regardless of where the meter sat.
 */
import { CHARGE, CHARGE_ZONES } from './tuning';

export type ChargeLabel = 'tap' | 'perfect' | 'good' | 'weak' | 'ok';

export interface ChargeResult {
  quality: number;
  label: ChargeLabel;
}

export function chargeQuality(value: number, heldMs: number): ChargeResult {
  if (heldMs < CHARGE_ZONES.tapMs) return { quality: CHARGE.tap, label: 'tap' };
  if (value >= CHARGE_ZONES.sweetLo && value <= CHARGE_ZONES.sweetHi) {
    return { quality: CHARGE.perfect, label: 'perfect' };
  }
  if (value >= CHARGE_ZONES.goodLo && value <= CHARGE_ZONES.goodHi) {
    return { quality: CHARGE.good, label: 'good' };
  }
  if (value < CHARGE_ZONES.weakBelow) return { quality: CHARGE.weak, label: 'weak' };
  return { quality: CHARGE.ok, label: 'ok' };
}
