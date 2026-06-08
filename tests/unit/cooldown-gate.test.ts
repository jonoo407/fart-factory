import { describe, it, expect } from 'vitest';
import { createCooldownGate } from '../../src/ui/cooldown-gate';

// WebAudio has no polyphony cap: a second Launch (or a rapid belly-tap) while
// the first fart is still ringing schedules a whole second fart chain that sums
// at the destination — the 'sounds play on top of each other' report. A cooldown
// gate lets a trigger through at most once per window. Deterministic clock.

describe('createCooldownGate', () => {
  it('opens on the first call', () => {
    let now = 1000;
    const gate = createCooldownGate(500, () => now);
    expect(gate.open()).toBe(true);
  });

  it('blocks a second call inside the cooldown window', () => {
    let now = 1000;
    const gate = createCooldownGate(500, () => now);
    expect(gate.open()).toBe(true);
    now = 1200; // 200ms later, still inside 500ms window
    expect(gate.open()).toBe(false);
  });

  it('opens again once the cooldown has elapsed', () => {
    let now = 1000;
    const gate = createCooldownGate(500, () => now);
    expect(gate.open()).toBe(true);
    now = 1500; // exactly at the window edge -> allowed again
    expect(gate.open()).toBe(true);
  });

  it('collapses a burst of rapid calls to a single open', () => {
    let now = 0;
    const gate = createCooldownGate(300, () => now);
    let opened = 0;
    for (let i = 0; i < 8; i++) {
      now += 20; // 8 taps over ~160ms
      if (gate.open()) opened++;
    }
    expect(opened).toBe(1);
  });
});
