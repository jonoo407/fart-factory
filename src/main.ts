import './style.css';
import { gradeFart, stinkEmoji, durationLabel } from './scoring/grade';
import { addToHall, renderHall } from './state/hall';
import { playFart, suspendAudio, resumeAudio, getAudioContext } from './audio/procedural';
import { loadMuted, setMuted } from './audio/mute';
import { spawnGas } from './visuals/gas';
import { spawnSparkles } from './visuals/particles';
import {
  evaluateLaunch,
  loadUnlocked,
  saveUnlocked,
  getAchievement,
  type LaunchContext,
} from './state/achievements';
import { loadHall as loadHallEntries } from './state/hall';
import { showAchievementToast } from './ui/toast';
import { reduceCombo, initialCombo, type ComboState } from './state/combo';
import { triggerHaptic, HAPTICS } from './ui/haptics';
import { showOnboarding } from './ui/onboarding';
import {
  comments,
  weakComments,
  showReactions,
} from './content/commentary';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function readSliders(): number[] {
  const out: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const el = $(`s${i}`) as HTMLInputElement | null;
    out.push(el ? parseInt(el.value, 10) : 0);
  }
  return out;
}

function wireSliderDisplay(): void {
  for (let i = 1; i <= 6; i++) {
    const s = $(`s${i}`) as HTMLInputElement | null;
    const v = $(`v${i}`);
    if (!s || !v) continue;
    s.addEventListener('input', () => {
      v.textContent = s.value;
    });
  }
}

function pickFromPool(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)] ?? '';
}

let launchesThisSession = 0;
let combo: ComboState = initialCombo();

function renderComboBanner(state: ComboState): void {
  const el = $('comboBanner');
  if (!el) return;
  if (state.count >= 3) {
    el.textContent = `🔥 ${state.count}-FART STREAK! Peak: ${state.peak}`;
    el.removeAttribute('hidden');
  } else {
    el.textContent = '';
    el.setAttribute('hidden', '');
  }
}

function onLaunch(): void {
  const vals = readSliders();
  const [length, wetness, volume, stink, temp, music] = vals;
  const total = vals.reduce((a, b) => a + b, 0);

  triggerHaptic(HAPTICS.launch);
  playFart(length, wetness, volume, stink, temp, music);
  spawnGas(stink, volume);
  showReactions(total);

  const pool = total < 20 ? weakComments : comments;
  const line = pickFromPool(pool);
  const cEl = $('commentary');
  if (cEl) {
    cEl.textContent = '';
    setTimeout(() => {
      cEl.textContent = '💬 "' + line + '"';
    }, 500);
  }

  const impressiveness = Math.min(
    10,
    Math.max(1, Math.round((volume + length + stink) / 3 + Math.random() * 2 - 1)),
  );
  const soundQuality = Math.min(
    10,
    Math.max(1, Math.round((music + volume + temp) / 3 + Math.random() * 2 - 1)),
  );
  const g = gradeFart(total);

  const res = $('results');
  if (res) res.style.display = 'block';

  const sc1 = $('sc1');
  if (sc1) {
    sc1.textContent =
      impressiveness + '/10 ' + '⭐'.repeat(Math.max(1, Math.ceil(impressiveness / 2)));
  }
  const sc2 = $('sc2');
  if (sc2) sc2.textContent = stinkEmoji(stink) + ' ' + stink + '/10';
  const stinkFill = $('stinkFill');
  if (stinkFill) stinkFill.style.width = 100 - stink * 10 + '%';
  const sc3 = $('sc3');
  if (sc3) sc3.textContent = soundQuality + '/10 ' + (soundQuality > 7 ? '🎶' : '🎵');
  const sc4 = $('sc4');
  if (sc4) sc4.textContent = durationLabel(length);
  const gradeEl = $('grade');
  if (gradeEl) {
    gradeEl.textContent = g.grade;
    gradeEl.style.color = g.color;
  }
  const gradeDesc = $('gradeDesc');
  if (gradeDesc) gradeDesc.textContent = g.desc;

  // Announce grade for screen readers
  const live = $('liveRegion');
  if (live) live.textContent = `Grade: ${g.grade}. ${g.desc}`;

  if (total > 40) {
    document.body.style.animation = 'none';
    void document.body.offsetHeight;
    document.body.style.animation = 'shake .5s';
  }

  if (g.grade === 'S+') {
    spawnSparkles();
  }

  const prev = combo;
  combo = reduceCombo(combo, g.grade);
  renderComboBanner(combo);
  if (combo.count >= 3 && combo.count > prev.count) {
    triggerHaptic(HAPTICS.combo);
  }

  addToHall(total, g.grade);

  launchesThisSession += 1;
  const ctx: LaunchContext = {
    sliders: vals,
    total,
    grade: g.grade,
    hallSize: loadHallEntries().length,
    launchesThisSession,
  };
  const owned = loadUnlocked();
  const newly = evaluateLaunch(ctx, owned);
  if (newly.length) {
    for (const id of newly) owned.add(id);
    saveUnlocked(owned);
    let i = 0;
    for (const id of newly) {
      const a = getAchievement(id);
      if (!a) continue;
      setTimeout(() => showAchievementToast(a), i * 250);
      i++;
    }
  }

  setTimeout(() => res?.scrollIntoView({ behavior: 'smooth' }), 600);
}

function onRandom(): void {
  for (let i = 1; i <= 6; i++) {
    const s = $(`s${i}`) as HTMLInputElement | null;
    const v = $(`v${i}`);
    if (!s) continue;
    s.value = String(Math.floor(Math.random() * 10) + 1);
    if (v) v.textContent = s.value;
  }
  ($('launchBtn') as HTMLButtonElement | null)?.click();
}

function paintMuteBtn(btn: HTMLButtonElement, muted: boolean): void {
  btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  btn.textContent = muted ? '🔇' : '🔊';
  btn.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
}

function wireMuteButton(): void {
  const btn = $('muteBtn') as HTMLButtonElement | null;
  if (!btn) return;
  paintMuteBtn(btn, loadMuted());
  btn.addEventListener('click', () => {
    const next = !loadMuted();
    setMuted(next);
    paintMuteBtn(btn, next);
    if (next) suspendAudio();
    else resumeAudio();
  });
}

function wireVisibilityChange(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      suspendAudio();
    } else if (!loadMuted()) {
      resumeAudio();
    }
  });
}

function init(): void {
  wireSliderDisplay();
  $('launchBtn')?.addEventListener('click', onLaunch);
  $('randomBtn')?.addEventListener('click', onRandom);
  wireMuteButton();
  wireVisibilityChange();
  renderHall();
  showOnboarding();
  // Test/debug shim: expose AudioContext.state for E2E mute verification.
  const w = window as unknown as { __audioCtxState?: () => string };
  w.__audioCtxState = () => getAudioContext()?.state ?? 'none';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
