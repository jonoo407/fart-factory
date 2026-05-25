export interface TutorialStep {
  title: string;
  body: string;
  emoji: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    emoji: '🧪',
    title: 'Welcome, Fart Scientist!',
    body: "Today an audience is in town. Tap foods from your pantry to plate them, then smash 🚀 LAUNCH FART. The audience scores your match; ≥50% earns 💰 gold, less earns 📝 research notes — both unlock more.",
  },
  {
    emoji: '🚀',
    title: "You'll learn more as you play",
    body: "Each new system (Kitchen, Bosses, Daily Quest) gets a quick intro the first time it appears. For now: plate, launch, see what happens. Good luck!",
  },
];

const STORAGE_KEY = 'fart_onboarding_seen';

export function shouldShowOnboarding(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    const parsed = JSON.parse(raw);
    return parsed !== true;
  } catch {
    return true; // safe default — show on corrupt
  }
}

export function markOnboardingSeen(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

export function resetOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function showOnboarding(): void {
  if (!shouldShowOnboarding()) return;
  let stepIndex = 0;
  const overlay = document.createElement('div');
  overlay.className = 'onboarding';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'onboardingTitle');
  overlay.innerHTML = `
    <div class="onboarding-card">
      <div class="onboarding-emoji" aria-hidden="true"></div>
      <h2 class="onboarding-title" id="onboardingTitle"></h2>
      <p class="onboarding-body"></p>
      <div class="onboarding-step-indicator"></div>
      <div class="onboarding-actions">
        <button class="btn onboarding-skip" id="onboardingSkip" type="button">Skip</button>
        <button class="btn onboarding-next" id="onboardingNext" type="button">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector('.onboarding-title') as HTMLElement;
  const bodyEl = overlay.querySelector('.onboarding-body') as HTMLElement;
  const emojiEl = overlay.querySelector('.onboarding-emoji') as HTMLElement;
  const indicatorEl = overlay.querySelector(
    '.onboarding-step-indicator',
  ) as HTMLElement;
  const nextBtn = overlay.querySelector('#onboardingNext') as HTMLButtonElement;
  const skipBtn = overlay.querySelector('#onboardingSkip') as HTMLButtonElement;

  function render(): void {
    const step = TUTORIAL_STEPS[stepIndex];
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    emojiEl.textContent = step.emoji;
    indicatorEl.textContent = `Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}`;
    nextBtn.textContent =
      stepIndex === TUTORIAL_STEPS.length - 1 ? "Let's go! 🚀" : 'Next →';
  }

  function close(): void {
    markOnboardingSeen();
    overlay.remove();
  }

  nextBtn.addEventListener('click', () => {
    if (stepIndex < TUTORIAL_STEPS.length - 1) {
      stepIndex++;
      render();
    } else {
      close();
    }
  });
  skipBtn.addEventListener('click', close);

  render();
  // Move keyboard focus to the dialog so screen readers announce it
  setTimeout(() => skipBtn.focus(), 50);
}
