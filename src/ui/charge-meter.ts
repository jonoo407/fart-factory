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
    raf = requestAnimationFrame(tick);
  };

  const end = (): void => {
    if (!charging) return;
    charging = false;
    cancelAnimationFrame(raf);
    const held = performance.now() - startT;
    const result = chargeQuality(value, held);
    value = 0;
    paint();
    button.classList.remove('charging');
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
      button.removeEventListener('pointerdown', begin);
      button.removeEventListener('pointerup', end);
      button.removeEventListener('pointerleave', end);
      button.removeEventListener('pointercancel', end);
      button.removeEventListener('keydown', onKey);
    },
  };
}
