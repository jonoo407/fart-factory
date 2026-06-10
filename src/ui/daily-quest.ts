/**
 * Daily-quest strip for the story shell. Renders the 3 active steps + a
 * claim button once all are complete.
 */

import {
  getDailyQuest,
  isClaimable,
  claimReward,
  getClaimReward,
  type DailyQuest,
} from '../state/daily-quest';
import { addGold, addResearchNotes } from '../state/persistence';
import { renderProgression } from './plate';
import { playEventSfx, QUEST_CLAIMED_SFX } from '../audio/event-sfx';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function stepRowHtml(step: DailyQuest['steps'][number]): string {
  const done = step.progress >= step.target;
  const cls = done ? 'daily-quest-step daily-quest-step-done' : 'daily-quest-step';
  const checkbox = done ? '☑' : '☐';
  return `<li class="${cls}">
    <span class="daily-quest-check">${checkbox}</span>
    <span class="daily-quest-label">${step.label}</span>
    <span class="daily-quest-progress">${step.progress}/${step.target}</span>
  </li>`;
}

export function renderDailyQuest(): void {
  const root = $('dailyQuest');
  if (!root) return;
  const quest = getDailyQuest();
  const reward = getClaimReward();
  let actionHtml = '';
  if (quest.claimed) {
    actionHtml = '<button type="button" class="daily-quest-claim" disabled aria-disabled="true">✓ Claimed today</button>';
  } else if (isClaimable(quest)) {
    actionHtml = `<button type="button" class="daily-quest-claim daily-quest-claim-ready" id="dailyQuestClaimBtn" aria-label="Claim daily quest reward — ${reward.gold} gold and ${reward.notes} notes">🏅 Claim +${reward.gold}💰 +${reward.notes}📝</button>`;
  } else {
    actionHtml = '<span class="daily-quest-pending">Reward: ' + `+${reward.gold}💰 +${reward.notes}📝` + '</span>';
  }
  root.innerHTML = `
    <div class="daily-quest-header">🎯 Daily Quest</div>
    <ul class="daily-quest-steps">${quest.steps.map(stepRowHtml).join('')}</ul>
    <div class="daily-quest-action">${actionHtml}</div>
  `;
  const btn = $('dailyQuestClaimBtn');
  if (btn) btn.addEventListener('click', onClaim);
}

function onClaim(): void {
  const r = claimReward();
  if (!r) {
    renderDailyQuest();
    return;
  }
  addGold(r.gold);
  addResearchNotes(r.notes);
  void playEventSfx(QUEST_CLAIMED_SFX, 6);
  renderDailyQuest();
  // Refresh the progression strip so the new gold + notes totals show.
  renderProgression();
}

export function wireDailyQuest(): void {
  renderDailyQuest();
}
