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
import {
  playEventSfx,
  playEventSfxOneOf,
  AUDIENCE_REACTION_SFX,
  playAudienceVoice,
  streakMilestoneSfx,
  COIN_SFX,
} from '../audio/event-sfx';
import { loadDiscoveredAxes } from '../state/axis-discovery';
import { getRecipe } from '../state/recipes';
import { renderFartProfileHtml } from './fart-profile';
import { axisEmoji } from './axis-emoji';
import type { RecipeResult } from '../scoring/fart-recipe';
import type { MatchResult, AxisFeedback } from '../scoring/match';
import type { DiscoveryResult } from '../scoring/discovery';
import type { FoodProperties } from '../state/food';
import type { Area } from '../state/containment';
import type { Audience } from '../state/audience';

type Tier = ReturnType<typeof audienceReaction>['tier'];
type Trend = ReturnType<typeof audienceReaction>['trend'];

/**
 * Post-launch audio stagger. The crowd reaction must land AFTER the fart —
 * twice now a reaction fired over it: first synchronously at t=0 (~3x louder,
 * masked the fart entirely), then on a FIXED 700ms timer tuned for the old ~1s
 * procedural fart, which the rebuilt bank (clips up to ~4.5s) outlived. The
 * delay is now computed from the actual fart duration plus a comic beat, with
 * 700ms as the floor when the duration is unknown. The voice line lands as a
 * punchline after the stinger. Exported for the timing test.
 */
export const REACTION_SFX_DELAY_MS = 700;
export const REACTION_BREATH_MS = 500;
export const VOICE_AFTER_REACTION_MS = 800;

/** A flop stinger is a punchline, not a headline — quieter than the cheers. */
const FAIL_STINGER_VOLUME = 4;
const STINGER_VOLUME = 5;
/** Meh is a shrug, not a punchline — the quietest reaction in the room. */
export const MEH_STINGER_VOLUME = 3;
/** Streak stingers on voiced tiers wait this long past the voice slot so the
 *  punchline (the voice line, ~3s) lands before the milestone flourish. */
export const STREAK_AFTER_VOICE_MS = 3200;
const STREAK_STINGER_VOLUME = 7;
/** Payout coin chime trails the crowd stinger by a beat — reward, then receipt. */
export const COIN_AFTER_REACTION_MS = 400;
const COIN_VOLUME = 3;

/**
 * Soft coin chime when a launch actually paid gold. Scheduled on the same
 * fart-duration clock as the crowd stinger so it never lands on the fart.
 * Called from the launch path (plate.ts) right after awardGoldForEncounter.
 */
export function scheduleGoldChime(goldPaid: number, fartDurationMs?: number): void {
  if (goldPaid <= 0) return;
  setTimeout(() => {
    void playEventSfx(COIN_SFX, COIN_VOLUME);
  }, reactionDelayMs(fartDurationMs) + COIN_AFTER_REACTION_MS);
}

export function reactionDelayMs(fartDurationMs?: number): number {
  if (!fartDurationMs || fartDurationMs <= 0) return REACTION_SFX_DELAY_MS;
  return Math.max(REACTION_SFX_DELAY_MS, fartDurationMs + REACTION_BREATH_MS);
}

/** Generous cap for a spoken reaction line — the longest clip is ~5.0s. */
export const VOICE_LINE_ALLOWANCE_MS = 5500;

/**
 * Overhaul v2 — how long the launch arc owns the room: fart, then the crowd
 * stinger, then the voice line. Music is fully silenced (duckMusic) for this
 * window; it's a performance, not background listening.
 */
export function performanceWindowMs(fartDurationMs?: number): number {
  return reactionDelayMs(fartDurationMs) + VOICE_AFTER_REACTION_MS + VOICE_LINE_ALLOWANCE_MS;
}

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

export function renderAudienceReaction(pct: number, audience: Audience, fartDurationMs?: number): void {
  const wrap = $('audienceReaction');
  const tierEl = $('audienceReactionTier');
  const trendEl = $('audienceReactionTrend');
  const r = audienceReaction(pct, loadLastMatch());
  if (wrap) wrap.removeAttribute('hidden');
  if (tierEl) tierEl.textContent = tierLabel(r.tier, audience);
  if (trendEl) trendEl.textContent = trendLabel(r.trend);
  applyReactionFace(r.tier);
  const streak = loadStreak();
  const streakEl = $('audienceReactionStreak');
  if (streakEl) {
    if (streak >= 2) {
      streakEl.removeAttribute('hidden');
      streakEl.textContent = streak >= 10 ? `🌟 LEGENDARY STREAK ×${streak}` : streak >= 5 ? `🔥🔥 Streak ×${streak}` : `🔥 Streak ×${streak}`;
    } else {
      streakEl.setAttribute('hidden', '');
    }
  }
  // Stagger the crowd reaction past the END of the fart (plus a beat to take
  // it in) so it reacts TO the fart instead of masking it — see reactionDelayMs.
  const delay = reactionDelayMs(fartDurationMs);
  const pool = AUDIENCE_REACTION_SFX[r.tier];
  if (pool.length > 0) {
    const vol =
      r.tier === 'meh' ? MEH_STINGER_VOLUME
      : r.tier === 'disliked' || r.tier === 'evacuated' ? FAIL_STINGER_VOLUME
      : STINGER_VOLUME;
    setTimeout(() => {
      void playEventSfxOneOf(pool, vol);
    }, delay);
  }
  // Streak milestone stinger (×5 / ×10). Every tier is voiced now, so the
  // flourish always waits out the voice line: fart → crowd → voice → flourish.
  const milestone = streakMilestoneSfx(streak);
  if (milestone) {
    const milestoneDelay = delay + VOICE_AFTER_REACTION_MS + STREAK_AFTER_VOICE_MS;
    setTimeout(() => {
      void playEventSfx(milestone, STREAK_STINGER_VOLUME);
    }, milestoneDelay);
  }
  void import('../visuals/reaction-particles').then(({ spawnReactionParticles }) => {
    spawnReactionParticles(r.tier);
  });
  // Voiced reaction line — EVERY tier reads its line (sound overhaul v2:
  // liked/meh/disliked were text-only). Lands as a punchline after the
  // stinger (reaction delay + voice delay).
  const tier = r.tier;
  setTimeout(() => {
    void playAudienceVoice(audience.id, tier);
  }, delay + VOICE_AFTER_REACTION_MS);
}

function matchEmoji(pct: number): string {
  if (pct >= 90) return '🎯💥';
  if (pct >= 70) return '🔥';
  if (pct >= 50) return '👍';
  if (pct >= 30) return '🤏';
  if (pct >= 10) return '😬';
  return '💀';
}

function wantLabel(f: AxisFeedback): string {
  if (f.hate) return 'wanted NONE';
  return f.wantHigh ? 'wanted LOTS' : 'wanted a little';
}

/**
 * Per-axis "why N%?" rows. Sourced from the SAME normalized closeness model as
 * the headline % (computeAxisFeedback), not the abandoned raw-scale breakdown —
 * so a satisfied axis never renders as a ✗ miss. Shows the qualitative want
 * (LOTS / a little / NONE) + a hit/near/miss verdict; no raw plate numbers
 * (avoids the "actual 4 / wanted 2 but ✓?!" confusion + is spoiler-free).
 */
export function renderBreakdown(feedback: AxisFeedback[]): string {
  const rank: Record<AxisFeedback['status'], number> = { miss: 0, near: 1, hit: 2 };
  const sorted = [...feedback].sort((a, b) => rank[a.status] - rank[b.status]);
  return sorted.map((f) => {
    const cls =
      f.status === 'hit' ? 'breakdown-matched' : f.status === 'near' ? 'breakdown-near' : 'breakdown-miss';
    const icon = f.status === 'hit' ? '✓' : f.status === 'near' ? '〜' : '✗';
    const verdict = f.status === 'hit' ? 'nailed it' : f.status === 'near' ? 'close' : 'off';
    return `<div class="breakdown-row ${cls}">${axisEmoji(f.axis)} ${f.axis}: ${wantLabel(f)} — ${verdict} ${icon}</div>`;
  }).join('');
}

export function renderStoryResult(
  r: RecipeResult,
  m: MatchResult,
  area: Area,
  plateLen: number,
  discovery: DiscoveryResult | null,
  audience: Audience,
  feedback?: AxisFeedback[],
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
  const breakdownHtml = feedback
    ? `<details class="breakdown-details" open><summary>📊 Match breakdown — why ${m.pct}%?</summary><div class="breakdown-grid">${renderBreakdown(feedback)}</div></details>`
    : '';
  effects.innerHTML = linesHtml + breakdownHtml;
}
