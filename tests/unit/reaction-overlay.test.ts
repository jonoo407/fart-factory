import { describe, it, expect, beforeEach } from 'vitest';
import { reactionFooterSpec, showReactionOverlay, type ReactionData } from '../../src/ui/reaction-overlay';
import type { Audience } from '../../src/state/audience';

/**
 * PLAN v9 P2 / 01 §4.1 — the pass/retry/improve gate. A flop can ONLY retry
 * the same crowd (no advance); a pass offers Improve + advance; a boss pass
 * offers Improve + Finish. (DOM rendering is verified in the browser.)
 */
describe('reactionFooterSpec', () => {
  it('a flop offers ONLY "Try this crowd again" — it cannot advance', () => {
    const f = reactionFooterSpec(false, false);
    expect(f).toHaveLength(1);
    expect(f[0]!.action).toBe('retry');
  });

  it('a flop on a boss still offers only retry', () => {
    const f = reactionFooterSpec(false, true);
    expect(f.map((b) => b.action)).toEqual(['retry']);
  });

  it('a pass offers Improve (ghost) + Next show (primary)', () => {
    const f = reactionFooterSpec(true, false);
    expect(f.map((b) => b.action)).toEqual(['improve', 'next']);
    expect(f.find((b) => b.action === 'improve')!.primary).toBe(false);
    expect(f.find((b) => b.action === 'next')!.primary).toBe(true);
  });

  it('a boss pass offers Improve + Finish', () => {
    const f = reactionFooterSpec(true, true);
    expect(f.map((b) => b.action)).toEqual(['improve', 'finish']);
  });

  // Fill-up belly model: when the player passed but is too stuffed for another
  // real attempt, "Improve" is a dead end (they can't plate a real meal) — only
  // the advance button shows.
  it('a pass with a stuffed belly drops Improve — advance only', () => {
    expect(reactionFooterSpec(true, false, false).map((b) => b.action)).toEqual(['next']);
    expect(reactionFooterSpec(true, true, false).map((b) => b.action)).toEqual(['finish']);
  });

  it('a flop still offers retry even when stuffed (the stuffed-fail branch never reaches the overlay)', () => {
    expect(reactionFooterSpec(false, false, false).map((b) => b.action)).toEqual(['retry']);
  });
});

// The overlay fully covers the play screen, so the belly meter is invisible at
// the exact moment the player decides whether to retry. The footer must carry
// the budget readout so the retry decision is informed.
describe('showReactionOverlay — belly readout', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="reactionOverlay" hidden></div>';
  });

  function baseData(): ReactionData {
    return {
      pct: 42,
      grade: 'F',
      stars: 0,
      passed: false,
      isBoss: false,
      audience: { id: 'test', name: 'Test Crowd', emoji: '🙂' } as unknown as Audience,
      verdict: 'Total flop. 💀',
      caption: 'meh',
      axisFeedback: [],
      breakdownLines: [],
      goldPaid: 0,
      learned: [],
      newRecipe: null,
      onAction: () => {},
    };
  }

  it('renders the belly fullness line in the footer when provided', () => {
    showReactionOverlay({ ...baseData(), belly: { used: 8, cap: 20, warn: false } });
    const line = document.querySelector('.rxn-belly');
    expect(line).not.toBeNull();
    expect(line!.textContent).toContain('8');
    expect(line!.textContent).toContain('20');
    expect(line!.classList.contains('warn')).toBe(false);
  });

  it('flags the warn state when nearly stuffed', () => {
    showReactionOverlay({ ...baseData(), belly: { used: 16, cap: 20, warn: true } });
    const line = document.querySelector('.rxn-belly');
    expect(line).not.toBeNull();
    expect(line!.classList.contains('warn')).toBe(true);
  });

  // The Live Show — Danger Zone misfire: a comic fizzle, not a scored launch.
  // There's no score to explain, so the judge card / breakdown / stars are
  // suppressed and the FIZZLE stamp + laughing crowd render instead.
  describe('misfire mode', () => {
    it('renders the FIZZLE stamp and suppresses judge card, breakdown, and stars', () => {
      showReactionOverlay({
        ...baseData(),
        misfire: true,
        stars: 3, // even if set, a misfire never shows stars
        verdict: 'It… squeaked.',
        learned: ['+1 📝 research note — science is also failure.'],
      });
      const stamp = document.querySelector('.stamp');
      expect(stamp).not.toBeNull();
      expect(stamp!.classList.contains('stamp-misfire')).toBe(true);
      expect(stamp!.textContent).toContain('FIZZLE!');
      expect(document.querySelector('.judge-card')).toBeNull();
      expect(document.querySelector('.bd-card')).toBeNull();
      expect(document.querySelector('.rxn-stars')).toBeNull();
      // The consolation note travels through the learned toasts.
      expect(document.querySelector('.rxn-toast.learn')!.textContent).toContain('research note');
      // The crowd is laughing, not booing.
      expect(document.querySelector('.rxn-crowd')!.textContent).toContain('🤣');
    });

    it('a misfire flop offers only the retry footer (same gate as any flop)', () => {
      showReactionOverlay({ ...baseData(), misfire: true });
      const ctas = [...document.querySelectorAll('.rxn-cta')];
      expect(ctas.map((b) => b.getAttribute('data-action'))).toEqual(['retry']);
    });
  });
});
