/**
 * PLAN v9 P2 — hold-to-charge BLAST. Mounts pointer/keyboard handlers on the
 * launch button and drives a sweeping meter; on release it resolves a charge
 * `quality` via the pure scoring/charge.ts logic and hands it back.
 *
 * The meter sweeps 0→100→0 at ~2.2 units/frame (ports ff-components.jsx
 * BlastButton). A quick tap (or keyboard activation) resolves to a safe 1.0.
 * The pure threshold logic lives in scoring/charge.ts and is unit-tested;
 * this module is the DOM glue, verified in the browser.
 */
import { chargeQuality, type ChargeResult } from '../scoring/charge';
import { startChargeTone, type ChargeTone } from '../audio/charge-tone';
import { holdMusic, releaseMusic } from '../audio/music';

const SWEEP_PER_FRAME = 2.2;

export interface ChargeMeterHandle {
  destroy(): void;
}

function isDisabled(button: HTMLElement): boolean {
  return (
    button.hasAttribute('disabled') ||
    button.getAttribute('aria-disabled') === 'true' ||
    button.classList.contains('disabled')
  );
}

export function mountChargeMeter(
  button: HTMLElement,
  fill: HTMLElement | null,
  onRelease: (result: ChargeResult) => void,
): ChargeMeterHandle {
  let raf = 0;
  let dir = 1;
  let value = 0;
  let startT = 0;
  let charging = false;
  let tone: ChargeTone | null = null;

  // PLAN v9 UI-overhaul Phase 3 — the meter idles dimmed and wakes on hold, and
  // the BLAST label swaps to "CHARGING…". Derived from the button's container so
  // the call signature stays the same; all lookups are null-safe.
  const wrap = button.closest('.story-launch-wrap');
  const meter = wrap?.querySelector('.charge-meter') ?? null;
  const bigEl = button.querySelector('#launchBig');
  const subEl = button.querySelector('#launchSub');
  const hintEl = meter?.querySelector('.charge-hint') ?? null;

  const paint = (): void => {
    if (fill) fill.style.width = `${value}%`;
  };

  const tick = (): void => {
    value += dir * SWEEP_PER_FRAME;
    if (value >= 100) {
      value = 100;
      dir = -1;
    } else if (value <= 0) {
      value = 0;
      dir = 1;
    }
    paint();
    // The charge tone rides the meter: pitch rises on the way up, falls on the
    // way back down — so you can hear where the sweep is without looking.
    tone?.update(value);
    raf = requestAnimationFrame(tick);
  };

  const begin = (e: Event): void => {
    if (charging || isDisabled(button)) return;
    e.preventDefault();
    charging = true;
    dir = 1;
    value = 0;
    startT = performance.now();
    button.classList.add('charging');
    meter?.classList.add('active');
    if (bigEl) bigEl.textContent = 'CHARGING…';
    if (subEl) subEl.textContent = 'release in the zone!';
    if (hintEl) hintEl.textContent = 'release in the dashed zone!';
    // The charge sweep opens the launch arc — music stays silent until the
    // hold releases (the launch then re-silences for its own timed window).
    holdMusic();
    tone = startChargeTone();
    tone.update(value);
    raf = requestAnimationFrame(tick);
  };

  const resetLabel = (): void => {
    meter?.classList.remove('active');
    if (bigEl) bigEl.textContent = 'BLAST!';
    if (subEl) subEl.textContent = 'hold to charge';
    if (hintEl) hintEl.textContent = 'hold to charge · or just tap';
  };

  const end = (): void => {
    if (!charging) return;
    charging = false;
    cancelAnimationFrame(raf);
    releaseMusic();
    tone?.stop();
    tone = null;
    const held = performance.now() - startT;
    const result = chargeQuality(value, held);
    value = 0;
    paint();
    button.classList.remove('charging');
    resetLabel();
    if (!isDisabled(button)) onRelease(result);
  };

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    if (!isDisabled(button)) onRelease({ quality: 1, label: 'tap' });
  };

  button.addEventListener('pointerdown', begin);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointerleave', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('keydown', onKey);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      if (charging) releaseMusic(); // never leak a hold
      charging = false;
      tone?.stop();
      tone = null;
      button.removeEventListener('pointerdown', begin);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointerleave', end);
      button.removeEventListener('pointercancel', end);
      button.removeEventListener('keydown', onKey);
    },
  };
}
