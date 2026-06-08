/**
 * The Kitchen-unlock flag (persisted). Lives in state/ — not ui/ — so both the
 * Kitchen UI and the auto-unlock tracker (scoring/kitchen-unlock) can read it
 * without a ui↔scoring import cycle. Stored as the raw string 'true'/'false'
 * (not JSON) for back-compat with saves + the e2e specs that set it directly.
 */
const KITCHEN_MODE_KEY = 'fart_kitchen_mode';

export function loadKitchenMode(): boolean {
  try {
    return localStorage.getItem(KITCHEN_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setKitchenMode(v: boolean): void {
  try {
    localStorage.setItem(KITCHEN_MODE_KEY, String(v));
  } catch {
    // ignore
  }
}
