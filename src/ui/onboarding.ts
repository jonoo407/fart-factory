export interface TutorialStep {
  title: string;
  body: string;
  emoji: string;
}

// PLAN v9 P5 / 03 §6 + 04 §10 — the three Order Ticket onboarding cards.
// New systems are introduced just-in-time via crowd intro cards, not up front.
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    emoji: '🧪',
    title: 'Welcome, Fart Scientist!',
    body: 'An audience just sat down. Tap foods from your pantry to plate them, then hold the big green button to BLAST.',
  },
  {
    emoji: '👀',
    title: 'Read what they crave',
    body: "Every crowd wants something different. Match their craving chips to win — but you don't know what each food does yet…",
  },
  {
    emoji: '🔍',
    title: 'Discover by doing',
    body: "Launch a food and you'll learn what it does 💦🤢🔊🎵. Your field guide fills in by itself as you play — and you'll earn 💰 gold and 📝 notes along the way.",
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
      <div class="onboarding-step-indicator" role="img"></div>
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
    // PLAN v9 P7 — progress DOTS (one per step, current one .on) instead of
    // "Step N of M" text; a11y progress is preserved via the aria-label.
    indicatorEl.innerHTML = TUTORIAL_STEPS.map(
      (_, i) => `<i${i === stepIndex ? ' class="on"' : ''}></i>`,
    ).join('');
    indicatorEl.setAttribute('aria-label', `Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}`);
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
