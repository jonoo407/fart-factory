import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CROWD_READ } from '../../src/scoring/tuning';
import { computeCrowdRead } from '../../src/scoring/crowd-read';

// The murmur cues route through the sample bank (WebAudio) — mock the SFX
// layer; everything else (debounce, DOM, class toggles) runs real in jsdom.
const playEventSfx = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../../src/audio/event-sfx', () => ({
  playEventSfx,
  CROWD_MURMUR_SFX: { up: 'murmur-warm', down: 'murmur-cold' },
}));

import { updateCrowdMood, resetCrowdMood } from '../../src/ui/crowd-mood';

const MARKUP = `
  <div class="audience-wrap">
    <div class="audience-portrait" id="audiencePortraitEmoji">🙂</div>
    <div class="crowd-mood" id="crowdMoodStrip" hidden aria-live="polite"></div>
  </div>`;

function strip(): HTMLElement {
  return document.getElementById('crowdMoodStrip')!;
}

/** A CrowdRead at a chosen raw pct (no violations) with deterministic jitter. */
function readAt(rawPct: number, prev: number | null = null, violations = 0) {
  return computeCrowdRead(rawPct, violations, 4242, `plate-${rawPct}|`, prev);
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = MARKUP;
  playEventSfx.mockClear();
  resetCrowdMood();
  document.body.innerHTML = MARKUP; // resetCrowdMood hid the strip — fresh DOM
});

afterEach(() => {
  resetCrowdMood();
  vi.useRealTimers();
});

describe('crowd mood strip — debounced render', () => {
  it('renders nothing until the debounce window elapses', () => {
    updateCrowdMood({ read: readAt(80), audienceName: 'Granny Edna' });
    expect(strip().hasAttribute('hidden')).toBe(true);
    vi.advanceTimersByTime(CROWD_READ.debounceMs);
    expect(strip().hasAttribute('hidden')).toBe(false);
    expect(strip().textContent).not.toBe('');
  });

  it('rapid updates collapse — only the LAST plate state renders', () => {
    updateCrowdMood({ read: readAt(10), audienceName: 'Granny Edna' });
    vi.advanceTimersByTime(CROWD_READ.debounceMs - 50);
    updateCrowdMood({ read: readAt(95), audienceName: 'Granny Edna' });
    vi.advanceTimersByTime(CROWD_READ.debounceMs);
    // 95±4 buckets to loved (🤩) — the stale 10-pct mood never painted.
    expect(strip().innerHTML).toContain('🤩');
  });

  it('an empty plate shows the expectant state (👀), never a tier', () => {
    updateCrowdMood({ read: null, audienceName: 'Granny Edna' });
    vi.advanceTimersByTime(CROWD_READ.debounceMs);
    expect(strip().innerHTML).toContain('👀');
    expect(strip().hasAttribute('hidden')).toBe(false);
  });

  it('never renders a number — the read is tier-only', () => {
    updateCrowdMood({ read: readAt(73), audienceName: 'Granny Edna' });
    vi.advanceTimersByTime(CROWD_READ.debounceMs);
    expect(strip().textContent).not.toMatch(/\d/);
  });
});

describe('crowd mood strip — tier shifts and violations', () => {
  function renderRead(rawPct: number, prev: number | null) {
    const r = readAt(rawPct, prev);
    updateCrowdMood({ read: r, audienceName: 'Granny Edna' });
    vi.advanceTimersByTime(CROWD_READ.debounceMs);
    return r;
  }

  it('a tier shift pops the strip, bounces the portrait, and plays a murmur', () => {
    const first = renderRead(85, null);
    expect(playEventSfx).not.toHaveBeenCalled(); // first read is silent
    renderRead(15, first.jitteredPct); // loved-ish → evacuated-ish: colder
    expect(strip().classList.contains('cm-pop')).toBe(true);
    expect(playEventSfx).toHaveBeenCalledWith('murmur-cold', 4);
    expect(
      document.getElementById('audiencePortraitEmoji')!.classList.contains('audience-portrait-loved'),
    ).toBe(true);
  });

  it('a violation renders the 🚫 discomfort state', () => {
    const r = computeCrowdRead(60, 1, 4242, 'bad-plate|', null);
    updateCrowdMood({ read: r, audienceName: 'Granny Edna' });
    vi.advanceTimersByTime(CROWD_READ.debounceMs);
    expect(strip().classList.contains('cm-violation')).toBe(true);
    expect(strip().innerHTML).toContain('🚫');
    expect(strip().textContent).toContain('off-limits');
  });

  it('resetCrowdMood hides the strip and clears pending updates', () => {
    renderRead(85, null);
    updateCrowdMood({ read: readAt(15), audienceName: 'Granny Edna' });
    resetCrowdMood();
    vi.advanceTimersByTime(CROWD_READ.debounceMs * 2);
    expect(strip().hasAttribute('hidden')).toBe(true);
    expect(strip().innerHTML).toBe('');
  });
});
