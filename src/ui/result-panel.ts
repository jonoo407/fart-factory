/**
 * Post-launch result rendering — audience reaction strip + the main
 * #storyResult card (match%, synergies, conflicts, breakdown, fart
 * profile). Extracted from plate.ts.
 *
 * These helpers take the resolved Audience as a parameter rather than
 * looking it up themselves, so the result panel is independent of plate
 * state (testable in isolation, reusable from non-plate launch sites).
 */

import { audienceReaction } from '../scoring/audience-reactions';
import { reactionTextForAudience } from '../scoring/audience-reactions';
import { loadLastMatch } from '../state/persistence';
import { loadStreak } from '../scoring/streak';
import { playEventSfx, AUDIENCE_REACTION_SFX, playAudienceVoice } from '../audio/event-sfx';
import { loadDiscoveredAxes } from '../state/axis-discovery';
import { getRecipe } from '../state/recipes';
import { renderFartProfileHtml } from './fart-profile';
import { axisEmoji } from './axis-emoji';
import type { RecipeResult } from '../scoring/fart-recipe';
import type { MatchResult, AxisBreakdown } from '../scoring/match';
import type { DiscoveryResult } from '../scoring/discovery';
import type { FoodProperties } from '../state/food';
import type { Area } from '../state/containment';
import type { Audience } from '../state/audience';

type Tier = ReturnType<typeof audienceReaction>['tier'];
type Trend = ReturnType<typeof audienceReaction>['trend'];

/**
 * Post-launch audio stagger. The crowd reaction must land AFTER the fart's main
 * hit — the fart schedules a cue at t=0, its main hit ~0.2s later and its body
 * runs ~1s — so firing the stinger at t=0 (as it used to) started it before the
 * fart, ran longer and ~3x louder, and masked the fart entirely. We defer the
 * stinger past the fart's main hit; the voice line lands as a punchline after
 * the stinger. Exported for the timing test.
 */
export const REACTION_SFX_DELAY_MS = 700;
export const VOICE_AFTER_REACTION_MS = 800;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function tierEmoji(tier: Tier): string {
  switch (tier) {
    case 'loved':     return '😍';
    case 'liked':     return '🙂';
    case 'meh':       return '😐';
    case 'disliked':  return '🤢';
    case 'evacuated': return '💀';
  }
}

function tierLabel(tier: Tier, audience: Audience): string {
  return `${tierEmoji(tier)} ${reactionTextForAudience(audience, tier)}`;
}

function trendLabel(trend: Trend): string {
  switch (trend) {
    case 'first':  return '';
    case 'warmer': return ' 🔥 warmer';
    case 'colder': return ' ❄️ colder';
    case 'same':   return ' ➡️ same';
  }
}

function applyReactionFace(tier: Tier): void {
  const emojiEl = $('audiencePortraitEmoji');
  if (!emojiEl) return;
  emojiEl.classList.remove(
    'audience-portrait-loved',
    'audience-portrait-liked',
    'audience-portrait-meh',
    'audience-portrait-disliked',
    'audience-portrait-evacuated',
  );
  emojiEl.classList.add(`audience-portrait-${tier}`);
  const emojiMap: Record<Tier, string> = {
    loved:    '😍',
    liked:    '🙂',
    meh:      '😐',
    disliked: '🤢',
    evacuated:'💀',
  };
  emojiEl.textContent = emojiMap[tier];
}

export function renderAudienceReaction(pct: number, audience: Audience): void {
  const wrap = $('audienceReaction');
  const tierEl = $('audienceReactionTier');
  const trendEl = $('audienceReactionTrend');
  const r = audienceReaction(pct, loadLastMatch());
  if (wrap) wrap.removeAttribute('hidden');
  if (tierEl) tierEl.textContent = tierLabel(r.tier, audience);
  if (trendEl) trendEl.textContent = trendLabel(r.trend);
  applyReactionFace(r.tier);
  const streakEl = $('audienceReactionStreak');
  if (streakEl) {
    const s = loadStreak();
    if (s >= 2) {
      streakEl.removeAttribute('hidden');
      streakEl.textContent = s >= 10 ? `🌟 LEGENDARY STREAK ×${s}` : s >= 5 ? `🔥🔥 Streak ×${s}` : `🔥 Streak ×${s}`;
    } else {
      streakEl.setAttribute('hidden', '');
    }
  }
  // Stagger the crowd reaction past the fart's main hit so it reacts TO the
  // fart instead of masking it (see REACTION_SFX_DELAY_MS).
  const reactionSfx = AUDIENCE_REACTION_SFX[r.tier];
  if (reactionSfx) {
    setTimeout(() => {
      void playEventSfx(reactionSfx, 5);
    }, REACTION_SFX_DELAY_MS);
  }
  void import('../visuals/reaction-particles').then(({ spawnReactionParticles }) => {
    spawnReactionParticles(r.tier);
  });
  // PR10 — voiced reaction line. Only loved + evacuated are voiced today.
  // Lands as a punchline after the stinger (reaction delay + voice delay).
  if (r.tier === 'loved' || r.tier === 'evacuated') {
    const tier = r.tier;
    setTimeout(() => {
      void playAudienceVoice(audience.id, tier);
    }, REACTION_SFX_DELAY_MS + VOICE_AFTER_REACTION_MS);
  }
}

function matchEmoji(pct: number): string {
  if (pct >= 90) return '🎯💥';
  if (pct >= 70) return '🔥';
  if (pct >= 50) return '👍';
  if (pct >= 30) return '🤏';
  if (pct >= 10) return '😬';
  return '💀';
}

function renderBreakdown(breakdown: AxisBreakdown[]): string {
  const sorted = [...breakdown].sort((a, b) => b.cost - a.cost);
  return sorted.map((row) => {
    if (row.matched) {
      return `<div class="breakdown-row breakdown-matched">${axisEmoji(row.axis)} ${row.axis}: <strong>${row.actual}</strong> / wanted ${row.target} ✓</div>`;
    }
    return `<div class="breakdown-row breakdown-miss">${axisEmoji(row.axis)} ${row.axis}: <strong>${row.actual}</strong> / wanted ${row.target} <span class="breakdown-cost">-${row.cost}</span></div>`;
  }).join('');
}

export function renderStoryResult(
  r: RecipeResult,
  m: MatchResult,
  area: Area,
  plateLen: number,
  discovery: DiscoveryResult | null,
  audience: Audience,
  breakdown?: AxisBreakdown[],
  fartProps?: FoodProperties,
): void {
  const wrap = $('storyResult');
  const title = $('storyResultTitle');
  const effects = $('storyResultEffects');
  const profile = $('fartProfile');
  if (!wrap || !title || !effects) return;
  if (plateLen === 0) {
    wrap.removeAttribute('hidden');
    title.innerHTML = '🌬️ A whisper. (Empty plate — the audience waits.)';
    effects.innerHTML = '';
    if (profile) {
      profile.innerHTML = '';
      profile.setAttribute('hidden', '');
    }
    return;
  }
  if (profile && fartProps) {
    profile.innerHTML = renderFartProfileHtml(fartProps, loadDiscoveredAxes());
    profile.removeAttribute('hidden');
  }
  const discoveryLine = (() => {
    if (!discovery) return '';
    const recipe = getRecipe(discovery.recipeId);
    if (!recipe) return '';
    if (discovery.freshlyDiscovered) {
      return `<div class="story-result-discovery story-result-discovery-new">✨ NEW RECIPE: ${recipe.emoji} <strong>${recipe.name}</strong> — added to your lab notebook!</div>`;
    }
    return `<div class="story-result-discovery">📖 Recipe: ${recipe.emoji} ${recipe.name}</div>`;
  })();
  wrap.removeAttribute('hidden');
  title.innerHTML = `${matchEmoji(m.pct)} <strong>${m.pct}%</strong> match for ${audience.emoji} ${audience.name} <span style="opacity:0.7">@ ${area.emoji} ${area.name}</span>`;
  const lines: string[] = [];
  if (discoveryLine) lines.push(discoveryLine);
  for (const v of m.violations) lines.push(`🚫 Restriction violated: ${v} (-25%)`);
  for (const s of r.triggeredSynergies) lines.push(`✨ Synergy: ${s}`);
  for (const c of r.triggeredConflicts) lines.push(`⚡ Conflict: ${c}`);
  const linesHtml = lines.length
    ? lines.map((l) => `<div class="story-result-effect">${l}</div>`).join('')
    : '<div class="story-result-effect" style="opacity:0.6">(no synergies or conflicts)</div>';
  const breakdownHtml = breakdown
    ? `<details class="breakdown-details" open><summary>📊 Match breakdown — why ${m.pct}%?</summary><div class="breakdown-grid">${renderBreakdown(breakdown)}</div></details>`
    : '';
  effects.innerHTML = linesHtml + breakdownHtml;
}
