import type { Page } from '@playwright/test';

/**
 * Shared e2e helpers for the PLAN v9 Order Ticket flow. The redesign changed
 * the core loop (hold-to-charge BLAST → full-screen reaction takeover →
 * pass-gated advance), so specs drive it through these helpers instead of the
 * old click-launch / click-Move-On flow.
 */

export interface LoadStoryOptions {
  /** Seed `fart_kitchen_mode` = 'true' (Kitchen dock tab unlocked). */
  kitchen?: boolean;
  /** Seed `fart_gold`. */
  gold?: number;
  /** Seed `fart_research` (research notes). */
  notes?: number;
  /** Seed `fart_pantry` (unlocked food ids — replaces the starter pantry). */
  pantry?: string[];
  /** Seed `fart_recipes_seen` (discovered recipe ids). */
  recipes?: string[];
  /** Seed `fart_onboarding_seen` = 'true' (default true — skip the tutorial). */
  onboardingSeen?: boolean;
  /**
   * Seed `fart_intro_granny-edna` = 'true' (default true). NB: this flag gates
   * BOTH the granny feature-intro modal AND her broccoli grant
   * (plate.ts maybeGrantOnEncounter) — pass false when a spec needs the grant.
   */
  grannyIntroSeen?: boolean;
  /** Raw extra localStorage seeds, applied last (e.g. `fart_run_seed`). */
  extraKeys?: Record<string, string>;
}

function flagSeeds(opts: LoadStoryOptions): Record<string, string> {
  const seeds: Record<string, string> = {};
  if (opts.onboardingSeen ?? true) seeds['fart_onboarding_seen'] = 'true';
  if (opts.grannyIntroSeen ?? true) seeds['fart_intro_granny-edna'] = 'true';
  if (opts.kitchen) seeds['fart_kitchen_mode'] = 'true';
  return seeds;
}

function valueSeeds(opts: LoadStoryOptions): Record<string, string> {
  const seeds: Record<string, string> = {};
  if (opts.gold !== undefined) seeds['fart_gold'] = String(opts.gold);
  if (opts.notes !== undefined) seeds['fart_research'] = String(opts.notes);
  if (opts.pantry) seeds['fart_pantry'] = JSON.stringify(opts.pantry);
  if (opts.recipes) seeds['fart_recipes_seen'] = JSON.stringify(opts.recipes);
  return seeds;
}

/**
 * THE one parameterized loader: navigate, wipe localStorage for a fully
 * deterministic save, apply the requested seeds, reload. Each Playwright test
 * gets a fresh browser context, but the explicit clear() makes re-entry safe
 * and self-documenting.
 */
export async function loadStory(page: Page, opts: LoadStoryOptions = {}): Promise<void> {
  const seeds = { ...flagSeeds(opts), ...valueSeeds(opts), ...(opts.extraKeys ?? {}) };
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, seeds);
  await page.reload();
}

/**
 * Mirror of src/ui/plate.ts LAUNCH_COOLDOWN_MS (1200ms) + margin. A second
 * BLAST inside the window is silently DROPPED by the launch cooldown gate, so
 * any spec that launches twice must space the launches. This is a real timing
 * constraint of the app, not an arbitrary sleep.
 */
export async function waitLaunchCooldown(page: Page): Promise<void> {
  await page.waitForTimeout(1250);
}

/**
 * Fresh story save, onboarding skipped, the first-encounter grant modal
 * dismissed, and the per-save run seed PINNED to 7. The pin removes two
 * randomness seams that otherwise flake encounter-flow specs:
 *   - the 4% Mystery Unicorn roll (seed 7 rolls no unicorn for encounters
 *     0-3, so encounter 0 is always Granny and her broccoli grant lands —
 *     launchPassingPlate depends on it);
 *   - the intermission activity roll (seed 7 offers fizzy-drink /
 *     stretch-routine / glass-of-milk at encounter 0 — all buff-carrying).
 * Both verified against the real run-state.ts / activities.ts algorithms.
 */
export async function loadFreshStory(page: Page): Promise<void> {
  // grannyIntroSeen: false — launchPassingPlate depends on the broccoli grant,
  // which the granny-intro flag would suppress.
  await loadStory(page, { grannyIntroSeen: false, extraKeys: { fart_run_seed: '7' } });
  await dismissOverlays(page);
}

/** Dismiss any feature-intro modal (e.g. the Granny → broccoli food grant). */
export async function dismissOverlays(page: Page): Promise<void> {
  const close = page.locator('#featureIntroCloseBtn');
  for (let i = 0; i < 6; i++) {
    if ((await close.count()) > 0 && (await close.first().isVisible().catch(() => false))) {
      await close.first().click();
      await page.waitForTimeout(80);
    } else break;
  }
}

/**
 * Plate the broccoli Granny grants (it is secretly musical) twice and launch.
 * That passes Granny (~B). Leaves the reaction overlay open. A Playwright click
 * on the BLAST button generates the pointer events the charge meter needs, so
 * it resolves as a safe tap.
 */
export async function launchPassingPlate(page: Page): Promise<void> {
  // The first encounter grants broccoli AND pops a feature-intro modal. Wait for
  // the grant to land in the pantry, then dismiss the modal so the tile is
  // clickable (not covered) — both are needed to avoid a timing flake.
  const broc = page.locator('[data-food="broccoli"]').first();
  await broc.waitFor({ state: 'attached' });
  await dismissOverlays(page);
  await broc.click();
  await broc.click();
  await dismissOverlays(page);
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
}

/** From an open PASS reaction overlay, advance to the next encounter. */
export async function advanceToNext(page: Page): Promise<void> {
  await page.locator('#reactionOverlay .rxn-cta[data-action="next"]').click();
}

/**
 * Close the reaction takeover (if open) by its first footer button — retry on a
 * flop, Improve on a pass — staying on the same crowd. Specs that launch
 * repeatedly need this so the overlay stops covering the pantry.
 */
export async function dismissReaction(page: Page): Promise<void> {
  const ov = page.locator('#reactionOverlay');
  if (await ov.isVisible().catch(() => false)) {
    await ov.locator('.rxn-cta').first().click();
    await ov.waitFor({ state: 'hidden' });
  }
}

/** Launch the current plate and return the reaction grade shown on the stamp. */
export async function launchAndReadGrade(page: Page): Promise<string> {
  await page.click('#storyLaunchBtn');
  await page.locator('#reactionOverlay').waitFor({ state: 'visible' });
  return (await page.locator('#reactionOverlay .stamp .g').textContent()) ?? '';
}
