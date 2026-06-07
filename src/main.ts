import './style.css';
import {
  suspendAudio,
  resumeAudio,
  getAudioContext,
  getLastFartSchedule,
} from './audio/procedural';
import { loadMuted } from './audio/audio-settings';
import { wireAudioPopover } from './ui/audio-popover';
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
import { wireVenueLadder } from './ui/venue-ladder';

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
  wireAudioPopover();
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
  wireVenueLadder();
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
