/**
 * Audio settings popover. Anchored to the mute button in the
 * progression strip. Hosts:
 *   - 🔊 Farts volume slider
 *   - 🎵 SFX volume slider
 *   - 🔇 Master mute toggle (sets both to 0 / restores to 100)
 *
 * Click the mute button → toggles the popover open/closed. The button
 * label still reflects overall mute state (🔇 vs 🔊).
 */

import {
  loadAudioSettings,
  setChannelVolume,
  setMuted,
  loadMuted,
} from '../audio/audio-settings';
import { suspendAudio, resumeAudio } from '../audio/procedural';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

const POPOVER_ID = 'audioPopover';

function ensurePopover(): HTMLElement {
  let p = document.getElementById(POPOVER_ID);
  if (p) return p;
  p = document.createElement('div');
  p.id = POPOVER_ID;
  p.className = 'audio-popover';
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'Audio settings');
  p.setAttribute('hidden', '');
  const s = loadAudioSettings();
  p.innerHTML = `
    <div class="audio-popover-header">🔊 Audio</div>
    <label class="audio-popover-row">
      <span class="audio-popover-label">💨 Farts</span>
      <input type="range" id="audioFartsSlider" min="0" max="100" value="${s.farts}" aria-label="Farts volume" />
      <span class="audio-popover-value" id="audioFartsValue">${s.farts}</span>
    </label>
    <label class="audio-popover-row">
      <span class="audio-popover-label">🎵 SFX</span>
      <input type="range" id="audioSfxSlider" min="0" max="100" value="${s.sfx}" aria-label="Sound effects volume" />
      <span class="audio-popover-value" id="audioSfxValue">${s.sfx}</span>
    </label>
    <button type="button" id="audioMuteAllBtn" class="audio-popover-mute-all" aria-pressed="${loadMuted() ? 'true' : 'false'}">
      ${loadMuted() ? '🔇 Muted — tap to unmute' : '🔇 Mute everything'}
    </button>
  `;
  document.body.appendChild(p);
  return p;
}

function paintPopover(): void {
  const s = loadAudioSettings();
  const fartsSlider = $('audioFartsSlider') as HTMLInputElement | null;
  const sfxSlider = $('audioSfxSlider') as HTMLInputElement | null;
  const fartsValue = $('audioFartsValue');
  const sfxValue = $('audioSfxValue');
  if (fartsSlider) fartsSlider.value = String(s.farts);
  if (sfxSlider) sfxSlider.value = String(s.sfx);
  if (fartsValue) fartsValue.textContent = String(s.farts);
  if (sfxValue) sfxValue.textContent = String(s.sfx);
  const btn = $('audioMuteAllBtn') as HTMLButtonElement | null;
  if (btn) {
    const muted = loadMuted();
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.textContent = muted ? '🔇 Muted — tap to unmute' : '🔇 Mute everything';
  }
}

function paintMuteBtn(): void {
  const btn = $('muteBtn') as HTMLButtonElement | null;
  if (!btn) return;
  const muted = loadMuted();
  btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  btn.textContent = muted ? '🔇' : '🔊';
  btn.setAttribute('aria-label', muted ? 'Audio muted (open settings)' : 'Audio settings');
}

function togglePopover(): void {
  const p = ensurePopover();
  const hidden = p.hasAttribute('hidden');
  if (hidden) {
    paintPopover();
    p.removeAttribute('hidden');
  } else {
    p.setAttribute('hidden', '');
  }
}

function closePopover(): void {
  ensurePopover().setAttribute('hidden', '');
}

export function wireAudioPopover(): void {
  paintMuteBtn();
  ensurePopover();
  // Click outside to close.
  document.addEventListener('click', (ev) => {
    const target = ev.target as Element | null;
    if (!target) return;
    if (target.closest('#audioPopover')) return;
    if (target.closest('#muteBtn')) return;
    closePopover();
  });
  $('muteBtn')?.addEventListener('click', togglePopover);
  // Slider events use 'input' for immediate feedback.
  document.addEventListener('input', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    if (!target) return;
    if (target.id === 'audioFartsSlider') {
      const v = Number(target.value);
      setChannelVolume('farts', v);
      const valEl = $('audioFartsValue');
      if (valEl) valEl.textContent = String(v);
      paintMuteBtn();
    } else if (target.id === 'audioSfxSlider') {
      const v = Number(target.value);
      setChannelVolume('sfx', v);
      const valEl = $('audioSfxValue');
      if (valEl) valEl.textContent = String(v);
      paintMuteBtn();
    }
  });
  document.addEventListener('click', (ev) => {
    const target = ev.target as Element | null;
    if (target?.id === 'audioMuteAllBtn') {
      const next = !loadMuted();
      setMuted(next);
      if (next) suspendAudio();
      else resumeAudio();
      paintPopover();
      paintMuteBtn();
    }
  });
}
