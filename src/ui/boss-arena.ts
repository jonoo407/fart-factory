/**
 * Boss arena UI. Per PLAN_v4.md §A.O items 75-77.
 *
 * - openArena(bossId) — overlay with boss portrait + entrance animation
 * - closeArena() — forfeit (no penalty)
 * - per-skill round UI (items 76)
 * - victory / defeat flows (item 77)
 */

import { BOSSES, getBoss, type Boss } from '../state/bosses';
import { AUDIENCES, type Audience } from '../state/audience';
import {
  isBossUnlocked,
  loadBossesDefeated,
  loadBossUnlockToastSeen,
  markBossUnlockToastSeen,
} from '../state/boss-progress';
import {
  createBossRunState,
  evaluateBossRound,
  isBossWon,
  isBossLost,
  type BossRunState,
  type BossLaunchInput,
} from '../scoring/boss-match';
import { dispatchBossReward } from '../scoring/boss-reward';
import { renderPantryGrid, renderProgression } from './plate';
import { playEventSfx, QUEST_CLAIMED_SFX, LEGENDARY_FANFARE_SFX } from '../audio/event-sfx';

const BOSS_ENTRANCE_SFX: Record<string, string> = {
  'granny-family-reunion':    'boss-entrance-granny',
  'royal-court-escalation':   'boss-entrance-royal',
  'haunted-three-ghosts':     'boss-entrance-haunted',
  'volcano-cult-ritual':      'boss-entrance-volcano',
  'cosmic-council-judgment':  'boss-entrance-cosmic',
};

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

let currentBoss: Boss | null = null;
let currentState: BossRunState | null = null;

function audById(id: string): Audience | undefined {
  return AUDIENCES.find((a) => a.id === id);
}

export function renderBossList(): void {
  const grid = $('bossList');
  if (!grid) return;
  const defeated = new Set(loadBossesDefeated());
  grid.innerHTML = BOSSES.map((b) => {
    const unlocked = isBossUnlocked(b);
    const isDefeated = defeated.has(b.id);
    const ariaDisabled = unlocked ? 'false' : 'true';
    const buttonText = isDefeated ? '🔁 Re-fight' : (unlocked ? '⚔ Fight' : '🔒 Locked');
    const subtitle = unlocked
      ? `<span class="boss-card-subtitle">Act ${b.act} · ${b.skillKind}</span>`
      : `<span class="boss-card-subtitle boss-card-locked-hint">${b.unlockReq.description}</span>`;
    const defeatedBadge = isDefeated ? '<span class="boss-card-defeated">✓ Defeated</span>' : '';
    return `<div class="boss-card${isDefeated ? ' boss-card-won' : ''}" data-boss="${b.id}">
      <span class="boss-card-emoji">${b.emoji}</span>
      <div class="boss-card-meta">
        <div class="boss-card-name">${b.name} ${defeatedBadge}</div>
        ${subtitle}
      </div>
      <button type="button" class="boss-fight-btn" data-boss="${b.id}" aria-disabled="${ariaDisabled}" aria-label="${unlocked ? 'Fight' : 'Locked'} ${b.name}">${buttonText}</button>
    </div>`;
  }).join('');

  grid.querySelectorAll<HTMLButtonElement>('.boss-fight-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-boss');
      if (!id) return;
      if (btn.getAttribute('aria-disabled') === 'true') return;
      openArena(id);
    });
  });
}

export function openArena(bossId: string): void {
  const boss = getBoss(bossId);
  if (!boss || !isBossUnlocked(boss)) return;
  currentBoss = boss;
  currentState = createBossRunState(boss);
  const overlay = $('arenaOverlay');
  if (!overlay) return;
  overlay.removeAttribute('hidden');
  document.body.dataset.arenaActive = 'true';
  // Close the notebook if open (it's how the player got here).
  $('notebookModal')?.setAttribute('hidden', '');
  // Apply per-boss vignette class for themed background.
  overlay.className = `arena-overlay arena-vignette-${boss.skillKind}`;
  $('arenaBossEmoji')!.textContent = boss.emoji;
  $('arenaBossName')!.textContent = boss.name;
  $('arenaFlavor')!.textContent = boss.flavor;
  // Add entrance class for the animation.
  overlay.classList.remove('arena-entering');
  void overlay.offsetWidth;
  overlay.classList.add('arena-entering');
  // P8: per-boss entrance SFX (silent until operator regenerates audio).
  const sfxId = BOSS_ENTRANCE_SFX[boss.id];
  if (sfxId) void playEventSfx(sfxId, 8);
  renderArenaStage();
}

export function closeArena(): void {
  $('arenaOverlay')?.setAttribute('hidden', '');
  delete document.body.dataset.arenaActive;
  currentBoss = null;
  currentState = null;
  // Refresh underlying UI in case state changed (defeated bosses).
  renderProgression();
  renderPantryGrid();
}

function renderArenaStage(): void {
  if (!currentBoss || !currentState) return;
  const stage = $('arenaStage');
  if (!stage) return;

  const boss = currentBoss;
  const state = currentState;

  // Skill-specific stage rendering.
  const audiencesHtml = boss.audiences
    .map((aid, idx) => {
      const aud = audById(aid);
      if (!aud) return '';
      const passed = state.audiencesPassed.has(aid);
      const voted = state.votes.has(idx);
      const lost = state.votesLost.has(idx);
      const status = passed ? '✓' : (voted ? '🗳' : (lost ? '✗' : ''));
      return `<div class="arena-audience${passed ? ' arena-audience-passed' : ''}${lost ? ' arena-audience-lost' : ''}">
        <span class="arena-audience-emoji">${aud.emoji}</span>
        <span class="arena-audience-name">${aud.name} ${status}</span>
      </div>`;
    }).join('');

  const roundsLine = `<div class="arena-rounds">Launches remaining: <strong>${state.roundsRemaining}</strong></div>`;

  // Skill-specific subtitle (P4: per-boss hint for difficulty).
  let skillSubtitle = '';
  switch (boss.skillKind) {
    case 'intersection':
      skillSubtitle = 'One launch. Match ≥50% against ALL audiences. Find the intersection of their cravings.'; break;
    case 'escalation':
      skillSubtitle = `Round ${state.results.length + 1} of ${boss.rounds}. Restrictions tighten: R2 needs ≥2 foods. R3 needs ≥3 foods AND no dairy. 💡 Stay close to the audience's cravings.`; break;
    case 'prioritization':
      skillSubtitle = `2 launches total. Please any 2 of the 3 audiences. 💡 Pick the two whose cravings overlap most.`; break;
    case 'deduction':
      skillSubtitle = state.results.length === 0
        ? 'Cravings HIDDEN. First launch is a probe — read the reaction tier carefully.'
        : 'Inferring from the probe. Hit ≥60% to win. 💡 If the probe got 😍 you were close — try similar.';
      break;
    case 'resource-allocation':
      skillSubtitle = 'Declare a target before each launch. Need ≥3/4 votes. 💡 Cook for the easiest audience first — save hard ones for last.'; break;
  }

  // For resource-allocation, also show a target-selector.
  let targetSelector = '';
  if (boss.skillKind === 'resource-allocation') {
    const options = boss.audiences.map((aid, idx) => {
      const aud = audById(aid);
      if (!aud) return '';
      const used = state.votes.has(idx) || state.votesLost.has(idx);
      const disabledAttr = used ? 'disabled' : '';
      return `<option value="${idx}" ${disabledAttr}>${aud.emoji} ${aud.name}${used ? ' (locked)' : ''}</option>`;
    }).join('');
    targetSelector = `<label class="arena-target-label">Target councilor:
      <select id="arenaTargetSelect">${options}</select>
    </label>`;
  }

  // History of past rounds.
  const history = state.results.map((r, idx) => {
    if (r.probeOnly) return `<div class="arena-history-row">Probe launch: reaction recorded (match% hidden)</div>`;
    const perAud = r.audienceResults.map((ar) => {
      const aud = audById(ar.audienceId);
      const tier = ar.passed ? '✓' : '✗';
      return `${aud?.emoji ?? ''} ${ar.pct}% ${tier}`;
    }).join(' · ');
    return `<div class="arena-history-row">Launch ${idx + 1}: ${perAud}</div>`;
  }).join('');

  stage.innerHTML = `
    <div class="arena-skill-subtitle">${skillSubtitle}</div>
    <div class="arena-audiences">${audiencesHtml}</div>
    ${roundsLine}
    ${targetSelector}
    <div class="arena-history">${history}</div>
  `;
}

/**
 * Called by the existing Story Launch handler when an arena is active.
 * Routes the launch input to the boss engine instead of normal scoring.
 * Returns true if the launch was handled by the arena (caller should
 * skip the normal post-launch flow); false otherwise.
 */
export function isArenaActive(): boolean {
  return currentBoss !== null && currentState !== null;
}

export function submitArenaLaunch(launch: BossLaunchInput): void {
  if (!currentBoss || !currentState) return;
  currentState = evaluateBossRound(currentBoss, currentState, launch);
  renderArenaStage();
  // Check terminal state.
  if (isBossWon(currentBoss, currentState)) {
    handleVictory();
  } else if (isBossLost(currentBoss, currentState)) {
    handleDefeat();
  }
}

function handleVictory(): void {
  if (!currentBoss) return;
  const reward = dispatchBossReward(currentBoss);
  // P3: victory fanfare SFX (silent until operator runs sfx:generate).
  void playEventSfx(reward.firstWin ? LEGENDARY_FANFARE_SFX : QUEST_CLAIMED_SFX, 8);
  const r = $('arenaResult');
  if (!r) return;
  r.removeAttribute('hidden');
  if (reward.firstWin && reward.foodUnlocked) {
    r.innerHTML = `<div class="arena-victory">🏆 VICTORY! Unlocked legendary food: <strong>${reward.foodUnlocked}</strong>${reward.gamePlusUnlocked ? '<br>🌌 New Game+ is now available.' : ''}</div>`;
  } else {
    r.innerHTML = `<div class="arena-victory">🏆 VICTORY! +25 gold, +10 research notes.</div>`;
  }
}

function handleDefeat(): void {
  if (!currentBoss) return;
  const r = $('arenaResult');
  if (!r) return;
  r.removeAttribute('hidden');
  r.innerHTML = `<div class="arena-defeat">😔 ${currentBoss.name} is unsatisfied. Try again tomorrow.</div>`;
}

export function wireArena(): void {
  $('arenaCloseBtn')?.addEventListener('click', closeArena);
}

/**
 * Phase P item 79 — fire a once-per-boss toast when a boss becomes newly
 * unlocked. Called by `onStoryLaunch` after every launch.
 */
export function maybeShowBossUnlockToast(): void {
  for (const b of BOSSES) {
    if (!isBossUnlocked(b)) continue;
    if (loadBossUnlockToastSeen(b.id)) continue;
    markBossUnlockToastSeen(b.id);
    showToast(`🏆 ${b.emoji} ${b.name} is ready to fight! Check the Notebook.`);
    return; // one toast per launch
  }
}

function showToast(message: string): void {
  const toast = $('bossUnlockToast');
  if (!toast) return;
  toast.textContent = message;
  toast.removeAttribute('hidden');
  toast.classList.remove('boss-unlock-toast-enter');
  void toast.offsetWidth;
  toast.classList.add('boss-unlock-toast-enter');
  setTimeout(() => {
    toast.setAttribute('hidden', '');
  }, 5000);
}
