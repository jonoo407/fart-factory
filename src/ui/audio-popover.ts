/**
 * Sound settings popover, anchored to the mute chip (PLAN v9 P6 / 02 §7 /
 * 04 §11). Four channels under a Master (Master · Farts · SFX · Voices ·
 * Music), a Captions toggle (ON by default) and a Rumble/haptics toggle, plus
 * a one-tap "Mute everything". Same sticker language as the rest of the app.
 */

import {
  loadAudioSettings,
  setChannelVolume,
  setMuted,
  loadMuted,
  loadCaptionsEnabled,
  setCaptionsEnabled,
  loadHapticsEnabled,
  setHapticsEnabled,
  type AudioChannel,
} from '../audio/audio-settings';
import { suspendAudio, resumeAudio } from '../audio/procedural';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

const POPOVER_ID = 'audioPopover';

const ROWS: { ch: AudioChannel; label: string }[] = [
  { ch: 'master', label: '🔊 Master' },
  { ch: 'farts', label: '💨 Farts' },
  { ch: 'sfx', label: '🎵 SFX' },
  { ch: 'voices', label: '🗣️ Voices' },
  { ch: 'music', label: '🎶 Music' },
];

function ensurePopover(): HTMLElement {
  let p = document.getElementById(POPOVER_ID);
  if (p) return p;
  p = document.createElement('div');
  p.id = POPOVER_ID;
  p.className = 'audio-popover';
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'Sound settings');
  p.setAttribute('hidden', '');
  const s = loadAudioSettings();
  const sliders = ROWS.map(
    (r) => `
    <label class="audio-popover-row">
      <span class="audio-popover-label">${r.label}</span>
      <input type="range" data-channel="${r.ch}" min="0" max="100" value="${s[r.ch]}" aria-label="${r.label} volume" />
      <span class="audio-popover-value" data-channel-value="${r.ch}">${s[r.ch]}</span>
    </label>`,
  ).join('');
  p.innerHTML = `
    <div class="audio-popover-header">🔊 Sound</div>
    ${sliders}
    <label class="audio-popover-toggle">
      <span>📝 Captions</span>
      <input type="checkbox" id="audioCaptionsToggle" ${loadCaptionsEnabled() ? 'checked' : ''} aria-label="Captions" />
    </label>
    <label class="audio-popover-toggle">
      <span>📳 Rumble</span>
      <input type="checkbox" id="audioHapticsToggle" ${loadHapticsEnabled() ? 'checked' : ''} aria-label="Haptics / rumble" />
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
  for (const r of ROWS) {
    const slider = document.querySelector<HTMLInputElement>(`#${POPOVER_ID} input[data-channel="${r.ch}"]`);
    const val = document.querySelector<HTMLElement>(`#${POPOVER_ID} [data-channel-value="${r.ch}"]`);
    if (slider) slider.value = String(s[r.ch]);
    if (val) val.textContent = String(s[r.ch]);
  }
  const cap = $('audioCaptionsToggle') as HTMLInputElement | null;
  if (cap) cap.checked = loadCaptionsEnabled();
  const hap = $('audioHapticsToggle') as HTMLInputElement | null;
  if (hap) hap.checked = loadHapticsEnabled();
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
  btn.setAttribute('aria-label', muted ? 'Audio muted (open settings)' : 'Sound settings');
}

function togglePopover(): void {
  const p = ensurePopover();
  if (p.hasAttribute('hidden')) {
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
  document.addEventListener('click', (ev) => {
    const target = ev.target as Element | null;
    if (!target) return;
    if (target.closest('#audioPopover')) return;
    if (target.closest('#muteBtn')) return;
    closePopover();
  });
  $('muteBtn')?.addEventListener('click', togglePopover);
  // Channel sliders (generic).
  document.addEventListener('input', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    const ch = target?.getAttribute('data-channel') as AudioChannel | null;
    if (!target || !ch) return;
    const v = Number(target.value);
    setChannelVolume(ch, v);
    const val = document.querySelector<HTMLElement>(`#${POPOVER_ID} [data-channel-value="${ch}"]`);
    if (val) val.textContent = String(v);
    paintMuteBtn();
  });
  // Toggles + mute-all.
  document.addEventListener('change', (ev) => {
    const target = ev.target as HTMLInputElement | null;
    if (target?.id === 'audioCaptionsToggle') setCaptionsEnabled(target.checked);
    else if (target?.id === 'audioHapticsToggle') setHapticsEnabled(target.checked);
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
