import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Sound overhaul — the economy + milestone moments get audio:
 *  - meh tier: soft awkward beat (cough/shuffle) instead of dead silence
 *  - streak ×5 / ×10: milestone stingers (visual-only before)
 *  - launch gold payout: soft coin chime after the crowd stinger
 *  - daily-quest claim + shop purchase: reward feedback
 * All manifest-gated ids, so the code lands before the assets exist.
 */

const { playEventSfx, playEventSfxOneOf, playAudienceVoice } = vi.hoisted(() => ({
  playEventSfx: vi.fn(async () => {}),
  playEventSfxOneOf: vi.fn(async () => {}),
  playAudienceVoice: vi.fn(async () => {}),
}));

vi.mock('../../src/audio/event-sfx', async (importActual) => {
  const actual = await importActual<typeof import('../../src/audio/event-sfx')>();
  return { ...actual, playEventSfx, playEventSfxOneOf, playAudienceVoice };
});

vi.mock('../../src/visuals/reaction-particles', () => ({
  spawnReactionParticles: vi.fn(),
}));

// shop.ts + daily-quest.ts pull render helpers from plate.ts — stub them so the
// import graph stays tiny.
vi.mock('../../src/ui/plate', () => ({
  renderPantryGrid: vi.fn(),
  renderProgression: vi.fn(),
}));

import {
  AUDIENCE_REACTION_SFX,
  COIN_SFX,
  SHOP_PURCHASE_SFX,
  QUEST_CLAIMED_SFX,
  streakMilestoneSfx,
} from '../../src/audio/event-sfx';
import {
  renderAudienceReaction,
  reactionDelayMs,
  scheduleGoldChime,
  VOICE_AFTER_REACTION_MS,
  STREAK_AFTER_VOICE_MS,
  MEH_STINGER_VOLUME,
  COIN_AFTER_REACTION_MS,
} from '../../src/ui/result-panel';
import { AUDIENCES } from '../../src/state/audience';

const granny = AUDIENCES.find((a) => a.id === 'granny-edna')!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  playEventSfx.mockClear();
  playEventSfxOneOf.mockClear();
  playAudienceVoice.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('new event-sfx ids (manifest-gated)', () => {
  it('meh tier has a soft awkward-beat pool', () => {
    expect(AUDIENCE_REACTION_SFX.meh).toEqual(['meh-cough', 'meh-shuffle']);
  });

  it('exposes coin + purchase ids', () => {
    expect(COIN_SFX).toBe('coin-clink');
    expect(SHOP_PURCHASE_SFX).toBe('shop-purchase');
  });

  it('maps streak milestones to stingers — exactly 5 and 10, nothing else', () => {
    expect(streakMilestoneSfx(5)).toBe('streak-5');
    expect(streakMilestoneSfx(10)).toBe('streak-10');
    expect(streakMilestoneSfx(4)).toBeNull();
    expect(streakMilestoneSfx(6)).toBeNull();
    expect(streakMilestoneSfx(11)).toBeNull();
    expect(streakMilestoneSfx(0)).toBeNull();
  });
});

describe('meh tier plays the awkward beat (no longer dead silence)', () => {
  it('fires the meh pool at reduced volume after the fart', () => {
    renderAudienceReaction(60, granny, 1000); // 60% -> meh
    vi.advanceTimersByTime(reactionDelayMs(1000));
    expect(playEventSfxOneOf).toHaveBeenCalledWith(AUDIENCE_REACTION_SFX.meh, MEH_STINGER_VOLUME);
  });

  it('meh is quieter than the fail stinger (a shrug, not a punchline)', () => {
    expect(MEH_STINGER_VOLUME).toBeLessThan(4);
  });
});

describe('streak milestone stingers', () => {
  it('liked tier (now voiced): streak-5 waits for the voice line to land', () => {
    localStorage.setItem('fart_streak_count', '5');
    renderAudienceReaction(80, granny, 1000); // liked — voiced like every tier now
    vi.advanceTimersByTime(reactionDelayMs(1000) + VOICE_AFTER_REACTION_MS);
    expect(playEventSfx).not.toHaveBeenCalledWith('streak-5', expect.anything());
    vi.advanceTimersByTime(STREAK_AFTER_VOICE_MS);
    expect(playEventSfx).toHaveBeenCalledWith('streak-5', expect.any(Number));
  });

  it('voiced tier (loved): the stinger waits for the voice line to land', () => {
    localStorage.setItem('fart_streak_count', '10');
    renderAudienceReaction(100, granny, 1000); // loved — voiced
    vi.advanceTimersByTime(reactionDelayMs(1000) + VOICE_AFTER_REACTION_MS);
    expect(playEventSfx).not.toHaveBeenCalledWith('streak-10', expect.anything());
    vi.advanceTimersByTime(STREAK_AFTER_VOICE_MS);
    expect(playEventSfx).toHaveBeenCalledWith('streak-10', expect.any(Number));
  });

  it('non-milestone streaks stay silent', () => {
    localStorage.setItem('fart_streak_count', '6');
    renderAudienceReaction(80, granny, 1000);
    vi.advanceTimersByTime(60_000);
    expect(playEventSfx).not.toHaveBeenCalled();
  });
});

describe('scheduleGoldChime — payout coin lands just after the crowd stinger', () => {
  it('chimes when gold was paid', () => {
    scheduleGoldChime(12, 1000);
    vi.advanceTimersByTime(reactionDelayMs(1000) + COIN_AFTER_REACTION_MS - 1);
    expect(playEventSfx).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(playEventSfx).toHaveBeenCalledWith(COIN_SFX, expect.any(Number));
  });

  it('stays silent on a zero payout', () => {
    scheduleGoldChime(0, 1000);
    vi.advanceTimersByTime(60_000);
    expect(playEventSfx).not.toHaveBeenCalled();
  });
});

describe('daily-quest claim chime', () => {
  it('plays quest-claimed on a successful claim', async () => {
    vi.doMock('../../src/state/daily-quest', () => ({
      getDailyQuest: () => ({ claimed: false, steps: [] }),
      isClaimable: () => true,
      claimReward: () => ({ gold: 25, notes: 10 }),
      getClaimReward: () => ({ gold: 25, notes: 10 }),
    }));
    vi.doMock('../../src/state/persistence', () => ({
      addGold: vi.fn(),
      addResearchNotes: vi.fn(),
    }));
    document.body.innerHTML = '<div id="dailyQuest"></div>';
    const { renderDailyQuest } = await import('../../src/ui/daily-quest');
    renderDailyQuest();
    const btn = document.getElementById('dailyQuestClaimBtn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(playEventSfx).toHaveBeenCalledWith(QUEST_CLAIMED_SFX, expect.any(Number));
  });
});

describe('shop purchase ka-ching', () => {
  it('plays shop-purchase on a successful buy, not on a refused one', async () => {
    let purchaseOk = true;
    vi.doMock('../../src/state/shop', () => ({
      getShopOffers: () => [{ foodId: 'beans', price: 10 }],
      attemptPurchase: () => (purchaseOk ? { ok: true, balance: 90 } : { ok: false, reason: 'poor' }),
    }));
    vi.doMock('../../src/state/persistence', () => ({
      loadGold: () => 100,
      addGold: vi.fn(),
      addResearchNotes: vi.fn(),
    }));
    let surfaceRender: (() => void) | null = null;
    vi.doMock('../../src/ui/dock', () => ({
      registerSurface: (_name: string, s: { render: () => void }) => {
        surfaceRender = s.render;
      },
    }));
    document.body.innerHTML = '<div id="shopOffers"></div><span id="shopBalance"></span>';
    const { wireShop } = await import('../../src/ui/shop');
    wireShop();
    expect(surfaceRender).not.toBeNull();
    surfaceRender!();
    const buy = document.querySelector<HTMLButtonElement>('.shop-offer-buy');
    expect(buy).not.toBeNull();
    buy!.click();
    expect(playEventSfx).toHaveBeenCalledWith(SHOP_PURCHASE_SFX, expect.any(Number));

    playEventSfx.mockClear();
    purchaseOk = false;
    surfaceRender!();
    document.querySelector<HTMLButtonElement>('.shop-offer-buy')!.click();
    expect(playEventSfx).not.toHaveBeenCalled();
  });
});
