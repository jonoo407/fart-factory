/**
 * PLAN v9 P2 — hold-to-charge BLAST. Mounts pointer/keyboard handlers on the
 * launch button and drives a sweeping meter; on release it resolves a charge
 * `quality` via the pure scoring/charge.ts logic and hands it back.
 *
 * The meter sweeps 0→100→0 at ~2.2 units/frame (ports ff-components.jsx
 * BlastButton). A quick tap (or keyboard activation) resolves to a safe 1.0.
 * The pure threshold logic lives in scoring/charge.ts and is unit-tested;
 * this module is the DOM glue, verified in the browser.
 *
 * Danger Zone (The Live Show): when `opts.canOvercharge()` is true, reaching
 * the top does NOT bounce back down — the meter pins at 100 and an OVERCHARGE
 * depth ramps 0→1 over OVERCHARGE.rampMs. Release then resolves to label
 * 'overcharge' with quality minMult→maxMult by depth (the misfire roll lives
 * in the launch flow, not here). Without the option the legacy ping-pong is
 * preserved (the boss arena keeps it).
 */
import { chargeQuality, type ChargeResult } from '../scoring/charge';
import { OVERCHARGE } from '../scoring/tuning';
import { overchargeMultiplier } from '../scoring/danger-zone';
import { startChargeTone, type ChargeTone } from '../audio/charge-tone';
import { holdMusic, releaseMusic } from '../audio/music';
import { triggerHaptic } from './haptics';

const SWEEP_PER_FRAME = 2.2;
/** Cadence of the warning haptic ticks while overcharging. */
const OVERCHARGE_HAPTIC_MS = 200;

export interface ChargeMeterHandle {
  destroy(): void;
}

export interface ChargeMeterOptions {
  /** Return true to allow the Danger Zone overcharge phase at the meter top. */
  canOvercharge?: () => boolean;
}

interface MeterUi {
  meter: HTMLElement | null;
  button: HTMLElement;
  bigEl: Element | null;
  subEl: Element | null;
  hintEl: Element | null;
}

/**
 * The Danger Zone phase controller: dresses the meter red, ramps depth 0→1
 * over OVERCHARGE.rampMs (real-clock, frame-rate independent), and ticks a
 * warning haptic. Pulled out of mountChargeMeter so the sweep loop stays
 * simple.
 */
function createOvercharge(ui: MeterUi): {
  active: () => boolean;
  depth: () => number;
  enter: () => void;
  tick: () => void;
  reset: () => void;
} {
  let active = false;
  let depth = 0;
  let lastT = 0;
  let lastHapticT = 0;
  return {
    active: () => active,
    depth: () => depth,
    enter(): void {
      active = true;
      depth = 0;
      lastT = performance.now();
      lastHapticT = lastT;
      ui.meter?.classList.add('overcharge');
      ui.button.classList.add('overcharge');
      if (ui.bigEl) ui.bigEl.textContent = 'OVERCHARGE!!';
      if (ui.subEl) ui.subEl.textContent = 'release… if you dare!';
      if (ui.hintEl) ui.hintEl.textContent = 'deeper = bigger blast… or a FIZZLE!';
    },
    tick(): void {
      const t = performance.now();
      depth = Math.min(1, depth + (t - lastT) / OVERCHARGE.rampMs);
      lastT = t;
      // --oc-depth (0→1) heats the CSS glow as the risk climbs.
      ui.meter?.style.setProperty('--oc-depth', depth.toFixed(3));
      if (t - lastHapticT >= OVERCHARGE_HAPTIC_MS) {
        lastHapticT = t;
        triggerHaptic(8);
      }
    },
    reset(): void {
      active = false;
      depth = 0;
      ui.meter?.classList.remove('overcharge');
      ui.meter?.style.removeProperty('--oc-depth');
      ui.button.classList.remove('overcharge');
    },
  };
}

/** Hold started: meter wakes, labels flip to the charging prompts. */
function setChargingLabels(ui: MeterUi): void {
  ui.meter?.classList.add('active');
  if (ui.bigEl) ui.bigEl.textContent = 'CHARGING…';
  if (ui.subEl) ui.subEl.textContent = 'release in the zone!';
  if (ui.hintEl) ui.hintEl.textContent = 'release in the dashed zone!';
}

/** Hold ended: meter dims back, labels return to the idle prompts. */
function setIdleLabels(ui: MeterUi): void {
  ui.meter?.classList.remove('active');
  if (ui.bigEl) ui.bigEl.textContent = 'BLAST!';
  if (ui.subEl) ui.subEl.textContent = 'hold to charge';
  if (ui.hintEl) ui.hintEl.textContent = 'hold to charge · or just tap';
}

function isDisabled(button: HTMLElement): boolean {
  return (
    button.hasAttribute('disabled') ||
    button.getAttribute('aria-disabled') === 'true' ||
    button.classList.contains('disabled')
  );
}

interface MeterHandlers {
  begin: (e: Event) => void;
  end: () => void;
  onKey: (ev: KeyboardEvent) => void;
}

/** Attach the pointer/keyboard handlers; returns the matching unwire. */
function wireEvents(button: HTMLElement, h: MeterHandlers): () => void {
  button.addEventListener('pointerdown', h.begin);
  button.addEventListener('pointerup', h.end);
  button.addEventListener('pointerleave', h.end);
  button.addEventListener('pointercancel', h.end);
  button.addEventListener('keydown', h.onKey);
  return (): void => {
    button.removeEventListener('pointerdown', h.begin);
    button.removeEventListener('pointerup', h.end);
    button.removeEventListener('pointerleave', h.end);
    button.removeEventListener('pointercancel', h.end);
    button.removeEventListener('keydown', h.onKey);
  };
}

export function mountChargeMeter(
  button: HTMLElement,
  fill: HTMLElement | null,
  onRelease: (result: ChargeResult) => void,
  opts?: ChargeMeterOptions,
): ChargeMeterHandle {
  let raf = 0;
  let dir = 1;
  let value = 0;
  let startT = 0;
  let charging = false;
  let tone: ChargeTone | null = null;
  const canOvercharge = opts?.canOvercharge ?? ((): boolean => false);

  // PLAN v9 UI-overhaul Phase 3 — the meter idles dimmed and wakes on hold, and
  // the BLAST label swaps to "CHARGING…". Derived from the button's container so
  // the call signature stays the same; all lookups are null-safe.
  const wrap = button.closest('.story-launch-wrap');
  const meter = wrap?.querySelector<HTMLElement>('.charge-meter') ?? null;
  const ui: MeterUi = {
    meter,
    button,
    bigEl: button.querySelector('#launchBig'),
    subEl: button.querySelector('#launchSub'),
    hintEl: meter?.querySelector('.charge-hint') ?? null,
  };
  const oc = createOvercharge(ui);

  const paint = (): void => {
    if (fill) fill.style.width = `${value}%`;
  };

  const tick = (): void => {
    if (oc.active()) {
      // Pinned at 100 — only the danger depth advances.
      oc.tick();
      tone?.update(value);
      raf = requestAnimationFrame(tick);
      return;
    }
    value += dir * SWEEP_PER_FRAME;
    if (value >= 100) {
      value = 100;
      if (canOvercharge()) {
        paint();
        oc.enter();
      } else {
        dir = -1;
      }
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
    setChargingLabels(ui);
    // The charge sweep opens the launch arc — music stays silent until the
    // hold releases (the launch then re-silences for its own timed window).
    holdMusic();
    tone = startChargeTone();
    tone.update(value);
    raf = requestAnimationFrame(tick);
  };

  const end = (): void => {
    if (!charging) return;
    charging = false;
    cancelAnimationFrame(raf);
    releaseMusic();
    tone?.stop();
    tone = null;
    const held = performance.now() - startT;
    const result: ChargeResult = oc.active()
      ? { quality: overchargeMultiplier(oc.depth()), label: 'overcharge', overchargeDepth: oc.depth() }
      : chargeQuality(value, held);
    oc.reset();
    value = 0;
    paint();
    button.classList.remove('charging');
    setIdleLabels(ui);
    if (!isDisabled(button)) onRelease(result);
  };

  const onKey = (ev: KeyboardEvent): void => {
    // Keyboard activation stays a safe tap — the Danger Zone is a strictly
    // optional bonus, so it being pointer-only is acceptable in v1.
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    if (!isDisabled(button)) onRelease({ quality: 1, label: 'tap' });
  };

  const unwire = wireEvents(button, { begin, end, onKey });

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      if (charging) releaseMusic(); // never leak a hold
      charging = false;
      oc.reset();
      tone?.stop();
      tone = null;
      unwire();
    },
  };
}
