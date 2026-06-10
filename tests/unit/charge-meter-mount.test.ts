import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CHARGE, CHARGE_ZONES } from '../../src/scoring/tuning';

// mountChargeMeter is the DOM glue for the hold-to-charge BLAST loop:
// pointerdown starts a rAF sweep (0→100→0), release resolves a quality via the
// pure chargeQuality logic, keyboard activation is a safe tap, and a disabled
// button gates everything. These tests drive the REAL index.html markup and
// the real scoring constants — only the WebAudio charge-tone is mocked.

const tone = vi.hoisted(() => ({ update: vi.fn(), stop: vi.fn() }));
const startChargeTone = vi.hoisted(() => vi.fn(() => tone));
vi.mock('../../src/audio/charge-tone', () => ({ startChargeTone }));

// Music must be SILENT while the charge sweep plays (it's part of the launch
// arc) — the meter holds the music on begin and releases it on end.
const { holdMusic, releaseMusic } = vi.hoisted(() => ({
  holdMusic: vi.fn(),
  releaseMusic: vi.fn(),
}));
vi.mock('../../src/audio/music', () => ({ holdMusic, releaseMusic }));

import { mountChargeMeter } from '../../src/ui/charge-meter';

// ---- deterministic rAF + clock -------------------------------------------
// The module reads bare requestAnimationFrame / cancelAnimationFrame /
// performance.now, so stubbing the globals gives us a hand-cranked frame loop.
const FRAME_MS = 16;
let now = 0;
let nextRafId = 1;
let pendingFrames = new Map<number, FrameRequestCallback>();

/** Advance the clock one frame at a time, firing queued rAF callbacks. */
function pumpFrames(n: number): void {
  for (let i = 0; i < n; i++) {
    now += FRAME_MS;
    const batch = [...pendingFrames.values()];
    pendingFrames.clear();
    for (const cb of batch) cb(now);
  }
}

/** Current painted meter position (the module writes `${value}%` to the fill). */
function fillPct(): number {
  return parseFloat(document.getElementById('chargeFill')!.style.width || '0');
}

/** Pump frames until `cond` holds. Throws rather than spinning forever. */
function pumpUntil(cond: () => boolean, maxFrames = 400): void {
  for (let i = 0; i < maxFrames; i++) {
    if (cond()) return;
    pumpFrames(1);
  }
  throw new Error('pumpUntil: condition not reached within maxFrames');
}

// ---- real markup + real wiring -------------------------------------------
// Verbatim from index.html — the same structure plate.ts wireStoryLaunchButton
// mounts against (button, #chargeFill, callback).
const LAUNCH_MARKUP = `
  <div class="story-launch-wrap">
    <div id="chargeMeter" class="charge-meter" aria-hidden="true">
      <div class="charge-sweet"></div>
      <div class="charge-fill" id="chargeFill"></div>
      <div class="charge-hint">hold to charge · or just tap</div>
    </div>
    <button type="button" class="btn launch blast" id="storyLaunchBtn" aria-label="Hold to charge, release to BLAST the fart">
      <span class="big">💨 <span id="launchBig">BLAST!</span></span>
      <span class="sub" id="launchSub">hold to charge</span>
    </button>
  </div>`;

function mount() {
  const btn = document.getElementById('storyLaunchBtn') as HTMLButtonElement;
  const onRelease = vi.fn();
  const handle = mountChargeMeter(btn, document.getElementById('chargeFill'), onRelease);
  return { btn, onRelease, handle };
}

// jsdom has no PointerEvent constructor; listeners match on the type string,
// so a MouseEvent with a pointer* type drives the identical code path.
function pointer(el: HTMLElement, type: string): boolean {
  return el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
}
function pressKey(el: HTMLElement, key: string): boolean {
  return el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

beforeEach(() => {
  now = 0;
  nextRafId = 1;
  pendingFrames = new Map();
  startChargeTone.mockClear();
  tone.update.mockClear();
  tone.stop.mockClear();
  holdMusic.mockClear();
  releaseMusic.mockClear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    const id = nextRafId++;
    pendingFrames.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    pendingFrames.delete(id);
  });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  document.body.innerHTML = LAUNCH_MARKUP;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('pointerdown starts charging', () => {
  it('enters the charging state: class, label swap, meter wake, tone start', () => {
    const { btn } = mount();
    // Real fingers land on the label span and the event bubbles to the button.
    pointer(document.getElementById('launchBig')!, 'pointerdown');

    expect(btn.classList.contains('charging')).toBe(true);
    expect(document.getElementById('chargeMeter')!.classList.contains('active')).toBe(true);
    expect(document.getElementById('launchBig')!.textContent).toBe('CHARGING…');
    expect(document.getElementById('launchSub')!.textContent).toBe('release in the zone!');
    expect(document.querySelector('.charge-hint')!.textContent).toBe('release in the dashed zone!');
    expect(startChargeTone).toHaveBeenCalledTimes(1);
    expect(tone.update).toHaveBeenCalledWith(0);
    expect(pendingFrames.size).toBe(1); // sweep loop scheduled
  });

  it('the rAF sweep advances the fill each frame and the tone tracks it', () => {
    mount();
    pointer(document.getElementById('storyLaunchBtn')!, 'pointerdown');

    pumpFrames(1);
    const w1 = fillPct();
    expect(w1).toBeGreaterThan(0);
    pumpFrames(3);
    const w2 = fillPct();
    expect(w2).toBeGreaterThan(w1);
    expect(tone.update).toHaveBeenLastCalledWith(w2);
  });

  it('the sweep bounces: clamps at 100, descends, clamps at 0, climbs again', () => {
    mount();
    pointer(document.getElementById('storyLaunchBtn')!, 'pointerdown');

    pumpUntil(() => fillPct() >= 100);
    expect(fillPct()).toBe(100);
    pumpFrames(1);
    expect(fillPct()).toBeLessThan(100);
    pumpUntil(() => fillPct() === 0);
    pumpFrames(1);
    expect(fillPct()).toBeGreaterThan(0);
  });

  it('a second pointerdown while already charging is ignored', () => {
    mount();
    const btn = document.getElementById('storyLaunchBtn')!;
    pointer(btn, 'pointerdown');
    pumpFrames(5);
    const w = fillPct();
    pointer(btn, 'pointerdown');
    expect(fillPct()).toBe(w); // value not reset to 0
    expect(startChargeTone).toHaveBeenCalledTimes(1);
  });
});

describe('pointerup resolves the charge quality (real tuning zones)', () => {
  it('released mid sweet zone → perfect, and the UI fully resets', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    const sweetMid = (CHARGE_ZONES.sweetLo + CHARGE_ZONES.sweetHi) / 2;
    pumpUntil(() => fillPct() >= sweetMid);
    // Preconditions: still inside the sweet zone, and held past the tap window.
    expect(fillPct()).toBeLessThanOrEqual(CHARGE_ZONES.sweetHi);
    expect(now).toBeGreaterThanOrEqual(CHARGE_ZONES.tapMs);

    pointer(btn, 'pointerup');

    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.perfect, label: 'perfect' });
    // State reset: class, labels, meter, fill, tone, and no frames still queued.
    expect(btn.classList.contains('charging')).toBe(false);
    expect(document.getElementById('chargeMeter')!.classList.contains('active')).toBe(false);
    expect(document.getElementById('launchBig')!.textContent).toBe('BLAST!');
    expect(document.getElementById('launchSub')!.textContent).toBe('hold to charge');
    expect(document.querySelector('.charge-hint')!.textContent).toBe('hold to charge · or just tap');
    expect(fillPct()).toBe(0);
    expect(tone.stop).toHaveBeenCalledTimes(1);
    expect(pendingFrames.size).toBe(0);
  });

  it('released in the good band (below sweet) → good', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    pumpUntil(() => fillPct() >= (CHARGE_ZONES.goodLo + CHARGE_ZONES.sweetLo) / 2);
    expect(fillPct()).toBeLessThan(CHARGE_ZONES.sweetLo); // precondition: not in sweet

    pointer(btn, 'pointerup');
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.good, label: 'good' });
  });

  it('released between weak and good bands → ok', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    pumpUntil(() => fillPct() >= (CHARGE_ZONES.weakBelow + CHARGE_ZONES.goodLo) / 2);
    expect(fillPct()).toBeLessThan(CHARGE_ZONES.goodLo); // precondition: not in good
    expect(now).toBeGreaterThanOrEqual(CHARGE_ZONES.tapMs); // precondition: not a tap

    pointer(btn, 'pointerup');
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.ok, label: 'ok' });
  });

  it('held past the peak and released low on the way down → weak', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    pumpUntil(() => fillPct() >= 100);
    pumpUntil(() => fillPct() < CHARGE_ZONES.weakBelow / 2);

    pointer(btn, 'pointerup');
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.weak, label: 'weak' });
  });

  it('a quick tap (released before tapMs) → safe tap regardless of meter', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    pumpFrames(1);
    expect(now).toBeLessThan(CHARGE_ZONES.tapMs); // precondition: inside tap window

    pointer(btn, 'pointerup');
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.tap, label: 'tap' });
  });

  it('pointerup without a prior pointerdown does nothing', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerup');
    expect(onRelease).not.toHaveBeenCalled();
    expect(tone.stop).not.toHaveBeenCalled();
  });
});

describe('pointerleave / pointercancel end the charge', () => {
  // NOTE: the implementation wires pointerleave and pointercancel to the SAME
  // end handler as pointerup — sliding off the button RESOLVES the blast (it
  // does not silently abort). These tests pin that real behavior.
  it('pointerleave resolves the release exactly once and resets state', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    const sweetMid = (CHARGE_ZONES.sweetLo + CHARGE_ZONES.sweetHi) / 2;
    pumpUntil(() => fillPct() >= sweetMid);

    pointer(btn, 'pointerleave');
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.perfect, label: 'perfect' });
    expect(btn.classList.contains('charging')).toBe(false);
    expect(fillPct()).toBe(0);

    // The follow-up pointerup (finger lifts off-button) must not double-fire.
    pointer(btn, 'pointerup');
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('pointercancel ends the charge, stops the tone, and resets state', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    pumpFrames(4);

    pointer(btn, 'pointercancel');
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(btn.classList.contains('charging')).toBe(false);
    expect(document.getElementById('launchBig')!.textContent).toBe('BLAST!');
    expect(fillPct()).toBe(0);
    expect(tone.stop).toHaveBeenCalledTimes(1);
    expect(pendingFrames.size).toBe(0);
  });
});

describe('keyboard path', () => {
  it('Enter resolves as a safe tap without ever entering the charging state', () => {
    const { btn, onRelease } = mount();
    const defaultAllowed = pressKey(btn, 'Enter');

    expect(onRelease).toHaveBeenCalledTimes(1);
    // The handler hardcodes quality 1; CHARGE.tap is the tuning value it must
    // stay in lockstep with — if tuning ever diverges, this assertion flags it.
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.tap, label: 'tap' });
    expect(defaultAllowed).toBe(false); // preventDefault() was called
    expect(btn.classList.contains('charging')).toBe(false);
    expect(startChargeTone).not.toHaveBeenCalled();
  });

  it('Space resolves as a safe tap', () => {
    const { btn, onRelease } = mount();
    pressKey(btn, ' ');
    expect(onRelease).toHaveBeenCalledWith({ quality: CHARGE.tap, label: 'tap' });
  });

  it('other keys are ignored and not preventDefault-ed', () => {
    const { btn, onRelease } = mount();
    expect(pressKey(btn, 'a')).toBe(true);
    expect(pressKey(btn, 'Escape')).toBe(true);
    expect(onRelease).not.toHaveBeenCalled();
  });
});

describe('disabled gating', () => {
  // All three mechanisms isDisabled() honors — the real app uses the disabled
  // property (perfect-cinematic.ts) and aria-disabled (plate.ts move-on gate).
  const mechanisms: Array<[string, (btn: HTMLButtonElement) => void]> = [
    ['disabled attribute', (btn) => (btn.disabled = true)],
    ['aria-disabled', (btn) => btn.setAttribute('aria-disabled', 'true')],
    ['disabled class', (btn) => btn.classList.add('disabled')],
  ];

  it.each(mechanisms)('pointerdown does nothing when gated via %s', (_name, disable) => {
    const { btn, onRelease } = mount();
    disable(btn);

    pointer(btn, 'pointerdown');
    expect(btn.classList.contains('charging')).toBe(false);
    expect(document.getElementById('launchBig')!.textContent).toBe('BLAST!');
    expect(startChargeTone).not.toHaveBeenCalled();
    expect(pendingFrames.size).toBe(0);

    pointer(btn, 'pointerup');
    pressKey(btn, 'Enter');
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('disabling mid-hold swallows onRelease but still resets the UI', () => {
    const { btn, onRelease } = mount();
    pointer(btn, 'pointerdown');
    pumpFrames(20);
    btn.disabled = true; // e.g. cinematic locks the button while held

    pointer(btn, 'pointerup');
    expect(onRelease).not.toHaveBeenCalled();
    expect(btn.classList.contains('charging')).toBe(false);
    expect(fillPct()).toBe(0);
    expect(tone.stop).toHaveBeenCalledTimes(1);
  });
});

describe('destroy()', () => {
  it('mid-charge destroy cancels the sweep and stops the tone', () => {
    const { btn, handle } = mount();
    pointer(btn, 'pointerdown');
    pumpFrames(3);
    const w = fillPct();

    handle.destroy();
    expect(pendingFrames.size).toBe(0);
    expect(tone.stop).toHaveBeenCalledTimes(1);
    pumpFrames(5);
    expect(fillPct()).toBe(w); // nothing left running
  });

  it('after destroy, pointer and keyboard events are inert', () => {
    const { btn, onRelease, handle } = mount();
    handle.destroy();

    pointer(btn, 'pointerdown');
    expect(btn.classList.contains('charging')).toBe(false);
    expect(startChargeTone).not.toHaveBeenCalled();
    pointer(btn, 'pointerup');
    pressKey(btn, 'Enter');
    expect(onRelease).not.toHaveBeenCalled();
  });
});

describe('music is held silent during the charge sweep (launch arc starts at hold)', () => {
  it('pointerdown holds the music; release lets it back (launch will re-silence)', () => {
    const { btn } = mount();
    pointer(btn, 'pointerdown');
    expect(holdMusic).toHaveBeenCalledTimes(1);
    expect(releaseMusic).not.toHaveBeenCalled();
    pumpFrames(3);
    pointer(btn, 'pointerup');
    expect(releaseMusic).toHaveBeenCalledTimes(1);
  });

  it('a cancelled charge (pointerleave) also releases the hold', () => {
    const { btn } = mount();
    pointer(btn, 'pointerdown');
    pumpFrames(2);
    pointer(btn, 'pointerleave');
    expect(releaseMusic).toHaveBeenCalledTimes(1);
  });

  it('mid-charge destroy never leaks a hold', () => {
    const { btn, handle } = mount();
    pointer(btn, 'pointerdown');
    pumpFrames(2);
    handle.destroy();
    expect(releaseMusic).toHaveBeenCalledTimes(1);
  });
});
