/**
 * PLAN v9 P2 / 04 §3 — the full-screen reaction takeover. An opaque overlay
 * that fully covers the play screen after a launch: grade stamp, verdict +
 * caption, stars, the judge card (per-axis feedback), the score breakdown,
 * discovery/recipe toasts, and the pass/retry/improve footer that GATES
 * advancement (a flop can only retry the same crowd).
 *
 * The footer-state logic is pure + unit-tested (reactionFooterSpec). The DOM
 * rendering is verified in the browser.
 */
import { axisEmoji } from './axis-emoji';
import { loadCaptionsEnabled } from '../audio/audio-settings';
import type { AxisFeedback, Grade } from '../scoring/match';
import type { Audience } from '../state/audience';

export type FooterAction = 'retry' | 'improve' | 'next' | 'finish';

export interface FooterButton {
  action: FooterAction;
  label: string;
  /** primary = filled green CTA; secondary = ghost button. */
  primary: boolean;
}

/**
 * Which footer buttons to show. A flop (not passed) offers ONLY a retry —
 * it cannot advance. A pass offers Improve (replay) + advance (Next, or
 * Finish on a boss).
 */
export function reactionFooterSpec(passed: boolean, isBoss: boolean): FooterButton[] {
  if (!passed) {
    return [{ action: 'retry', label: '↻ Try this crowd again', primary: true }];
  }
  const advance: FooterButton = isBoss
    ? { action: 'finish', label: 'Finish ▶', primary: true }
    : { action: 'next', label: 'Next show ▶', primary: true };
  return [{ action: 'improve', label: '↻ Improve', primary: false }, advance];
}

const AXIS_LABEL: Record<AxisFeedback['axis'], string> = {
  wet: 'Wet',
  dry: 'Dry',
  stink: 'Stink',
  loud: 'Loud',
  musical: 'Tooty',
  length: 'Length',
  temp: 'Heat',
};

function gradeClass(grade: Grade): string {
  if (grade === 'S') return 'grade-s';
  if (grade === 'A') return 'grade-a';
  if (grade === 'F') return 'grade-f';
  return 'grade-b';
}

function gradeLabel(grade: Grade): string {
  switch (grade) {
    case 'S': return 'Legendary';
    case 'A': return 'Big Hit';
    case 'B': return 'Not bad';
    case 'C': return 'They’ll take it';
    case 'F': return 'Bombed';
  }
}

const STATUS_BADGE = { hit: '✓', near: '~', miss: '✗' } as const;

function judgeCardHtml(audience: Audience, feedback: AxisFeedback[], passed: boolean): string {
  if (feedback.length === 0) return '';
  const rows = feedback
    .map((a) => {
      const wantLabel = a.hate ? 'wanted NONE' : a.wantHigh ? 'wanted LOTS' : 'wanted a little';
      const targetPct = a.hate ? 2 : Math.round(a.target * 100);
      const gotPct = Math.max(3, Math.round(a.got * 100));
      return `<div class="judge-row ${a.status}">
        <span class="je">${axisEmoji(a.axis)}</span>
        <div class="jmid">
          <div class="jname">${AXIS_LABEL[a.axis]} <small>· ${wantLabel}</small></div>
          <div class="jbar"><span class="jtarget${a.hate ? ' hate' : ''}" style="left:${targetPct}%"></span><span class="jgot" style="width:${gotPct}%"></span></div>
        </div>
        <span class="jstatus ${a.status}">${STATUS_BADGE[a.status]}</span>
      </div>`;
    })
    .join('');
  const firstName = audience.name.split(' ')[0];
  const foot = passed
    ? 'Tune the ✗ and ~ axes to climb to ★★★.'
    : 'Fix the ✗ axes and try this crowd again.';
  return `<div class="judge-card">
    <div class="judge-h">How you matched ${firstName}’s taste</div>
    ${rows}
    <div class="judge-foot">${foot}</div>
  </div>`;
}

export interface BreakdownLine {
  icon: string;
  label: string;
  val: string;
}

export interface ReactionData {
  pct: number;
  grade: Grade;
  stars: number;
  passed: boolean;
  isBoss: boolean;
  audience: Audience;
  verdict: string;
  caption: string;
  axisFeedback: AxisFeedback[];
  breakdownLines: BreakdownLine[];
  goldPaid: number;
  learned: string[];
  newRecipe: string | null;
  /** PLAN v9 UI-overhaul Phase 5 — normalized 0-1 stink; ≥0.45 drifts a cloud. */
  stink?: number;
  onAction: (a: FooterAction) => void;
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function facesFor(grade: Grade): string[] {
  if (grade === 'F') return ['😖', '🤬', '🙄', '😤', '💢'];
  if (grade === 'S') return ['🤣', '🤩', '😍', '🤣', '😆'];
  if (grade === 'A') return ['😂', '🤩', '😆', '😄', '😂'];
  return ['😀', '🙂', '😯', '😀', '😬'];
}

const CONFETTI_COLORS = ['#8fd11e', '#f59e0b', '#a855f7', '#3b82f6', '#ff7a2f'];

/** Falling confetti for any non-F result (gated on prefers-reduced-motion in CSS). */
function confettiHtml(): string {
  const strips = Array.from({ length: 14 }, (_, i) =>
    `<i style="left:${(i * 7 + 5) % 100}%;background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};animation-delay:${(i % 7) * 0.12}s"></i>`,
  ).join('');
  return `<div class="confetti" aria-hidden="true">${strips}</div>`;
}

/** Drifting green stink cloud for a notably stinky launch. */
function stinkHtml(): string {
  const blobs = [12, 32, 50, 70, 88]
    .map((p, i) => `<i style="left:${p}%;animation-delay:${i * 0.3}s"></i>`)
    .join('');
  return `<div class="rxn-stink" aria-hidden="true">${blobs}</div>`;
}

export function hideReactionOverlay(): void {
  const ov = $('reactionOverlay');
  if (ov) {
    ov.setAttribute('hidden', '');
    ov.classList.remove('reaction-show');
    ov.innerHTML = '';
  }
}

export function showReactionOverlay(d: ReactionData): void {
  const ov = $('reactionOverlay');
  if (!ov) return;

  const faces = facesFor(d.grade).map((f) => `<span>${f}</span>`).join('');
  const starsHtml =
    d.stars > 0
      ? `<div class="rxn-stars">${[0, 1, 2].map((i) => `<span class="${i < d.stars ? 'on' : ''}">★</span>`).join('')}</div>`
      : '';
  const breakdownHtml = `<div class="bd-card">
    ${d.breakdownLines.map((b) => `<div class="bd-line"><span class="l">${b.icon} ${b.label}</span><span class="v">${b.val}</span></div>`).join('')}
    <div class="bd-tot"><span class="l">Final</span><span class="v">${d.grade} · ${d.pct}%${d.goldPaid > 0 ? ` <span class="bd-gold">+${d.goldPaid}💰</span>` : ''}</span></div>
  </div>`;
  const toasts =
    d.learned.map((l) => `<div class="rxn-toast learn"><span class="em">💡</span><div>${l}</div></div>`).join('') +
    (d.newRecipe ? `<div class="rxn-toast recipe"><span class="em">⚡</span><div>New recipe — <strong>${d.newRecipe}</strong></div></div>` : '');

  const footerBtns = reactionFooterSpec(d.passed, d.isBoss);
  const footerHtml = footerBtns
    .map(
      (b) =>
        `<button type="button" class="rxn-cta${b.primary ? '' : ' ghost'}${footerBtns.length === 1 ? ' wide' : ''}" data-action="${b.action}">${b.label}</button>`,
    )
    .join('');

  ov.innerHTML = `${d.grade !== 'F' ? confettiHtml() : ''}${(d.stink ?? 0) > 0.45 ? stinkHtml() : ''}<div class="rxn-scroll">
    <div class="rxn-crowd">${faces}</div>
    <div class="stamp ${gradeClass(d.grade)}"><span class="g">${d.grade}</span><span class="l">${gradeLabel(d.grade)}</span></div>
    <div class="rxn-verdict">${d.verdict}</div>
    ${loadCaptionsEnabled() ? `<div class="rxn-cap"><span class="who">🔊 ${d.audience.name}</span>“${d.caption}”</div>` : ''}
    ${starsHtml}
    ${judgeCardHtml(d.audience, d.axisFeedback, d.passed)}
    ${breakdownHtml}
    ${toasts}
  </div>
  <div class="rxn-foot">${footerHtml}</div>`;

  ov.querySelectorAll<HTMLButtonElement>('.rxn-cta').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action') as FooterAction;
      hideReactionOverlay();
      d.onAction(action);
    });
  });

  ov.classList.toggle('flop', d.grade === 'F');
  ov.removeAttribute('hidden');
  ov.classList.remove('reaction-show');
  void ov.offsetWidth;
  ov.classList.add('reaction-show');
  ov.scrollTop = 0;
}
