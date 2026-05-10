import './style.css';
import { gradeFart, stinkEmoji, durationLabel } from './scoring/grade';
import { addToHall, renderHall } from './state/hall';
import {
  playFart,
  suspendAudio,
  resumeAudio,
  getAudioContext,
  getLastFartSchedule,
  playCelebrationSting,
} from './audio/procedural';
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
import {
  getDailyChallenge,
  computeMatch,
  axisHints,
  loadBestMatch,
  recordMatch,
  loadHardMode,
  setHardMode,
  audienceReaction,
  type AxisHint,
  type AudienceReaction,
} from './state/challenge';
import { triggerHaptic, HAPTICS } from './ui/haptics';
import { showOnboarding } from './ui/onboarding';
import { loadMode, setMode, type Mode } from './state/persistence';
import { initStoryPantry } from './ui/plate';
import { wireShop } from './ui/shop';
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
    const h = $(`hint${i}`);
    if (!s || !v) continue;
    s.addEventListener('input', () => {
      v.textContent = s.value;
      if (h) h.textContent = '';
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

function matchEmoji(pct: number): string {
  if (pct >= 95) return '🎯💥';
  if (pct >= 85) return '🔥';
  if (pct >= 70) return '👍';
  if (pct >= 50) return '🤏';
  if (pct >= 30) return '😬';
  return '💀';
}

function hintEmoji(h: AxisHint): string {
  if (h.dir === 'ok') return '🎯';
  // intensity 1 (small), 2 (medium), 3 (far)
  const arrow = h.dir === 'up' ? '⬆️' : '⬇️';
  if (h.intensity >= 3) return arrow + arrow;
  return arrow;
}

function renderAxisHints(actual: number[]): void {
  const target = getDailyChallenge().profile;
  const hints = axisHints(actual, target);
  const hardMode = loadHardMode();
  for (let i = 0; i < 6; i++) {
    const el = $(`hint${i + 1}`);
    if (!el) continue;
    if (hardMode) {
      // Hard Mode hides per-axis arrows entirely — audience reactions
      // are the only feedback. Forces inference from aggregate signal.
      el.textContent = '';
      el.setAttribute('data-dir', '');
      el.setAttribute('data-intensity', '');
    } else {
      el.textContent = hintEmoji(hints[i]);
      el.setAttribute('data-dir', hints[i].dir);
      el.setAttribute('data-intensity', String(hints[i].intensity));
    }
  }
}

function tierEmoji(tier: AudienceReaction['tier']): string {
  switch (tier) {
    case 'loved':      return '😍 The audience loves it!';
    case 'liked':      return '🙂 They liked that.';
    case 'meh':        return '😐 Mixed reactions.';
    case 'disliked':   return '🤢 Several covered their nose.';
    case 'evacuated':  return '💀 The room is clearing out.';
  }
}

function trendEmoji(trend: AudienceReaction['trend']): string {
  switch (trend) {
    case 'first':  return '';
    case 'warmer': return '  🔥 warmer';
    case 'colder': return '  ❄️ colder';
    case 'same':   return '  ➡️ same';
  }
}

let lastMatchPct: number | null = null;

function renderAudience(matchPct: number): void {
  const wrap = $('audience');
  const tierEl = $('audienceTier');
  const trendEl = $('audienceTrend');
  if (!loadHardMode()) {
    if (wrap) wrap.setAttribute('hidden', '');
    return;
  }
  const r = audienceReaction(matchPct, lastMatchPct);
  if (wrap) wrap.removeAttribute('hidden');
  if (tierEl) tierEl.textContent = tierEmoji(r.tier);
  if (trendEl) trendEl.textContent = trendEmoji(r.trend);
}

function renderBestToday(): void {
  const best = loadBestMatch();
  const el = $('challengeBestPct');
  if (el) el.textContent = String(best);
}

function fireChallengeReactivePulse(pct: number): void {
  if (pct < 90) return;
  const card = $('challengeCard');
  if (!card) return;
  const tier = pct === 100 ? 'match-tier-2' : 'match-tier-1';
  const allTiers = ['match-tier-1', 'match-tier-2'];
  for (const t of allTiers) card.classList.remove(t);
  void (card as HTMLElement).offsetWidth;
  card.classList.add(tier);
  setTimeout(() => card.classList.remove(tier), 1300);
}

function renderChallengeMatch(actual: number[]): number {
  const challenge = getDailyChallenge();
  const pct = computeMatch(actual, challenge.profile);
  const hardMode = loadHardMode();
  const wrap = $('challengeMatch');
  const pctEl = $('challengeMatchPct');
  const emoji = $('challengeMatchEmoji');
  if (hardMode) {
    // Hard Mode hides the numeric match% — audience reactions only.
    if (wrap) wrap.setAttribute('hidden', '');
  } else {
    if (wrap) wrap.removeAttribute('hidden');
    if (pctEl) pctEl.textContent = String(pct);
    if (emoji) emoji.textContent = ' ' + matchEmoji(pct);
  }
  renderAxisHints(actual);
  renderAudience(pct);
  recordMatch(pct);
  renderBestToday();
  fireChallengeReactivePulse(pct);
  lastMatchPct = pct;
  return pct;
}

function fireLaunchButtonMotion(): void {
  const btn = $('launchBtn');
  if (!btn) return;
  // restart-able animation: remove the class, force reflow, re-add.
  btn.classList.remove('firing');
  void (btn as HTMLElement).offsetWidth;
  btn.classList.add('firing');
  // Clean up after the animation so it can be retriggered.
  setTimeout(() => btn.classList.remove('firing'), 650);
}

function showCommentary(total: number): void {
  const pool = total < 20 ? weakComments : comments;
  const line = pickFromPool(pool);
  const cEl = $('commentary');
  if (!cEl) return;
  cEl.textContent = '';
  setTimeout(() => {
    cEl.textContent = '💬 "' + line + '"';
  }, 500);
}

function clamp1to10(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)));
}

function setText(id: string, text: string): void {
  const el = $(id);
  if (el) el.textContent = text;
}

function setStyle(id: string, prop: keyof CSSStyleDeclaration, value: string): void {
  const el = $(id) as HTMLElement | null;
  if (!el) return;
  (el.style as unknown as Record<string, string>)[prop as string] = value;
}

function shakeBodyOnce(): void {
  document.body.style.animation = 'none';
  void document.body.offsetHeight;
  document.body.style.animation = 'shake .5s';
}

function renderResultsCard(
  vals: number[],
  total: number,
  g: { grade: string; desc: string; color: string },
): void {
  const [length, , volume, stink, temp, music] = vals;
  const impressiveness = clamp1to10((volume + length + stink) / 3 + Math.random() * 2 - 1);
  const soundQuality = clamp1to10((music + volume + temp) / 3 + Math.random() * 2 - 1);
  setStyle('results', 'display', 'block');
  setText('sc1', impressiveness + '/10 ' + '⭐'.repeat(Math.max(1, Math.ceil(impressiveness / 2))));
  setText('sc2', stinkEmoji(stink) + ' ' + stink + '/10');
  setStyle('stinkFill', 'width', 100 - stink * 10 + '%');
  setText('sc3', soundQuality + '/10 ' + (soundQuality > 7 ? '🎶' : '🎵'));
  setText('sc4', durationLabel(length));
  const gradeEl = $('grade');
  if (gradeEl) {
    gradeEl.textContent = g.grade;
    gradeEl.style.color = g.color;
  }
  setText('gradeDesc', g.desc);
  setText('liveRegion', `Grade: ${g.grade}. ${g.desc}`);
  if (total > 40) shakeBodyOnce();
  if (g.grade === 'S+') spawnSparkles();
}

function updateCombo(grade: string): void {
  const prev = combo;
  combo = reduceCombo(combo, grade);
  renderComboBanner(combo);
  if (combo.count >= 3 && combo.count > prev.count) {
    triggerHaptic(HAPTICS.combo);
  }
}

function unlockAchievementsForLaunch(ctx: LaunchContext): void {
  const owned = loadUnlocked();
  const newly = evaluateLaunch(ctx, owned);
  if (!newly.length) return;
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

function onLaunch(): void {
  const vals = readSliders();
  const [length, wetness, volume, stink, temp, music] = vals;
  const total = vals.reduce((a, b) => a + b, 0);

  fireLaunchButtonMotion();
  triggerHaptic(HAPTICS.launch);
  playFart(length, wetness, volume, stink, temp, music);
  spawnGas(stink, volume);
  showReactions(total);
  const matchPct = renderChallengeMatch(vals);
  if (matchPct === 100) setTimeout(() => playCelebrationSting(), 600);
  showCommentary(total);

  const g = gradeFart(total);
  renderResultsCard(vals, total, g);
  updateCombo(g.grade);
  addToHall(total, g.grade);

  launchesThisSession += 1;
  unlockAchievementsForLaunch({
    sliders: vals,
    total,
    grade: g.grade,
    hallSize: loadHallEntries().length,
    launchesThisSession,
    match: matchPct,
  });

  setTimeout(() => $('results')?.scrollIntoView({ behavior: 'smooth' }), 600);
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

function applyHardModeToCard(): void {
  const card = $('challengeCard');
  const hintEl = $('challengeHint');
  const hard = loadHardMode();
  if (card) {
    if (hard) card.classList.add('hard-mode');
    else card.classList.remove('hard-mode');
  }
  // In Hard Mode, hide the descriptive hint (the player only sees the name).
  if (hintEl) {
    if (hard) hintEl.setAttribute('hidden', '');
    else hintEl.removeAttribute('hidden');
  }
}

function renderChallengeCard(): void {
  const c = getDailyChallenge();
  const nameEl = $('challengeName');
  const hintEl = $('challengeHint');
  const emojiEl = $('challengeEmoji');
  if (nameEl) nameEl.textContent = c.name;
  if (hintEl) hintEl.textContent = c.hint;
  if (emojiEl) emojiEl.textContent = c.emoji;
  applyHardModeToCard();
}

function paintHardModeBtn(btn: HTMLButtonElement, on: boolean): void {
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.textContent = on ? '🧠 Hard ON' : '🧠 Hard';
}

function wireHardModeButton(): void {
  const btn = $('hardModeBtn') as HTMLButtonElement | null;
  if (!btn) return;
  paintHardModeBtn(btn, loadHardMode());
  btn.addEventListener('click', () => {
    const next = !loadHardMode();
    setHardMode(next);
    paintHardModeBtn(btn, next);
    applyHardModeToCard();
    // Reset trend baseline when toggling — prior pct from a different mode
    // is misleading.
    lastMatchPct = null;
    // Hide the audience strip if turning off; clear hints if turning on.
    const audWrap = $('audience');
    if (audWrap && !next) audWrap.setAttribute('hidden', '');
    for (let i = 1; i <= 6; i++) {
      const h = $(`hint${i}`);
      if (h) h.textContent = '';
    }
    // Hide the explicit match% display if turning hard mode on.
    const matchWrap = $('challengeMatch');
    if (matchWrap && next) matchWrap.setAttribute('hidden', '');
  });
}

// ----- Tier 7 Phase B: mode toggle -----

function applyMode(mode: Mode): void {
  document.body.setAttribute('data-mode', mode);
  const story = $('storyShell');
  if (story) {
    if (mode === 'story') story.removeAttribute('hidden');
    else story.setAttribute('hidden', '');
  }
  const btn = $('modeBtn') as HTMLButtonElement | null;
  if (btn) {
    const isStory = mode === 'story';
    btn.setAttribute('aria-pressed', isStory ? 'true' : 'false');
    btn.textContent = isStory ? '🥪 Sandbox' : '🍴 Story';
    btn.setAttribute('aria-label', isStory ? 'Switch to Sandbox slider mode' : 'Switch to Story food mode');
  }
}

function wireModeButton(): void {
  const btn = $('modeBtn') as HTMLButtonElement | null;
  if (!btn) return;
  applyMode(loadMode());
  btn.addEventListener('click', () => {
    const next: Mode = loadMode() === 'story' ? 'sandbox' : 'story';
    setMode(next);
    applyMode(next);
  });
}

function init(): void {
  wireSliderDisplay();
  $('launchBtn')?.addEventListener('click', onLaunch);
  $('randomBtn')?.addEventListener('click', onRandom);
  wireMuteButton();
  wireVisibilityChange();
  wireHardModeButton();
  wireModeButton();
  initStoryPantry(); // Story Mode pantry/plate/belly — hidden in Sandbox by CSS
  wireShop();
  renderChallengeCard();
  renderBestToday();
  renderHall();
  showOnboarding();
  // Test/debug shims for E2E verification of internal state.
  const w = window as unknown as {
    __audioCtxState?: () => string;
    __challengeProfile?: () => number[];
    __lastFartSchedule?: () => unknown;
  };
  w.__audioCtxState = () => getAudioContext()?.state ?? 'none';
  w.__challengeProfile = () => [...getDailyChallenge().profile];
  w.__lastFartSchedule = () => getLastFartSchedule();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
