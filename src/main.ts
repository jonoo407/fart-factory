import './style.css';
import {
  suspendAudio,
  resumeAudio,
  getAudioContext,
  getLastFartSchedule,
} from './audio/procedural';
import { loadMuted, setMuted } from './audio/mute';
import { initStoryPantry } from './ui/plate';
import { wireShop } from './ui/shop';
import { wireNotebook } from './ui/notebook';
import { wireResearch } from './ui/research';
import { wireArena } from './ui/boss-arena';
import { wireMap } from './ui/map-screen';
import { wireKitchen } from './ui/kitchen';
import { wireDailyQuest } from './ui/daily-quest';
import { wireSaveIo } from './ui/save-io';
import { showOnboarding } from './ui/onboarding';
import { playPerfectCinematic } from './ui/perfect-cinematic';
import { showFeatureIntro, type FeatureIntroOptions } from './ui/feature-intro';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
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
  wireMuteButton();
  wireVisibilityChange();
  initStoryPantry();
  wireShop();
  wireNotebook();
  wireResearch();
  wireArena();
  wireMap();
  wireKitchen();
  wireDailyQuest();
  wireSaveIo();
  showOnboarding();

  const w = window as unknown as {
    __audioCtxState?: () => string;
    __lastFartSchedule?: () => unknown;
    __playPerfectCinematic?: () => Promise<void>;
    __showFeatureIntro?: (opts: FeatureIntroOptions) => void;
  };
  w.__audioCtxState = () => getAudioContext()?.state ?? 'none';
  w.__lastFartSchedule = () => getLastFartSchedule();
  w.__playPerfectCinematic = () => playPerfectCinematic();
  w.__showFeatureIntro = (opts) => showFeatureIntro(opts);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
