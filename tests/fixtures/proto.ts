/**
 * PLAN v9 D2 — synthetic PROTOTYPE fixtures (transcribed verbatim from
 * design_reference/prototype/ff-data.js). These exist solely so the
 * prototype-parity suite can lock the SHIPPED scoring math (computeBase +
 * closeness + grade/stars) against the prototype's verified golden numbers.
 *
 * These numbers are NOT reproducible against the real catalog (real broccoli
 * has musical:0, not 3) — that is by design. Real content is asserted by GRADE
 * in match-real-catalog.test.ts, never by these exact percentages.
 *
 * The base-match math goes through the production `computeBase`/`closeness`,
 * so a passing parity suite proves the real scorer, not a copy of it.
 */
import { computeBase, closeness, gradeForPct, starsForPct } from '../../src/scoring/match';
import { AXIS_CAP, BELLY_MAX } from '../../src/scoring/tuning';

type ProtoAxis = 'wet' | 'dry' | 'stink' | 'loud' | 'musical' | 'heat';

interface ProtoFood {
  belly: number;
  ax: Partial<Record<ProtoAxis, number>>;
}

export const protoFoods: Record<string, ProtoFood> = {
  beans: { belly: 3, ax: { stink: 3, loud: 3, dry: 2 } },
  egg: { belly: 2, ax: { stink: 5, dry: 1 } },
  cheese: { belly: 3, ax: { stink: 4, wet: 1 } },
  garlic: { belly: 2, ax: { stink: 4, heat: 1 } },
  onion: { belly: 2, ax: { stink: 3, wet: 2 } },
  broccoli: { belly: 3, ax: { musical: 3, loud: 1, stink: 2 } },
  kombucha: { belly: 2, ax: { wet: 4, musical: 2 } },
  pepper: { belly: 2, ax: { loud: 3, heat: 4 } },
  cabbage: { belly: 3, ax: { stink: 3, wet: 2, musical: 2 } },
  pickle: { belly: 2, ax: { wet: 3, stink: 2 } },
};

interface ProtoWant {
  ax: ProtoAxis | 'length';
  target: number;
  w: number;
  hate?: boolean;
}

export const protoCrowds: Record<string, { gold: number; wants: ProtoWant[] }> = {
  granny: {
    gold: 24,
    wants: [
      { ax: 'musical', target: 0.85, w: 2.2 },
      { ax: 'loud', target: 0.1, w: 1.6, hate: true },
    ],
  },
  frat: {
    gold: 34,
    wants: [
      { ax: 'loud', target: 0.9, w: 2.2 },
      { ax: 'stink', target: 0.8, w: 1.7 },
    ],
  },
  critic: {
    gold: 80,
    wants: [
      { ax: 'stink', target: 0.92, w: 2.2 },
      { ax: 'loud', target: 0.7, w: 1.2 },
      { ax: 'wet', target: 0.0, w: 1.6, hate: true },
    ],
  },
  mayor: {
    gold: 150,
    wants: [
      { ax: 'loud', target: 0.85, w: 2 },
      { ax: 'stink', target: 0.75, w: 1.5 },
      { ax: 'wet', target: 0.0, w: 1.4, hate: true },
    ],
  },
};

interface ProtoRecipe {
  set: string[];
  effect: { type: 'mult' | 'bonus'; ax?: ProtoAxis; x?: number; amt?: number };
}

export const protoRecipes: Record<string, ProtoRecipe> = {
  classic: { set: ['beans', 'egg'], effect: { type: 'mult', ax: 'stink', x: 1.5 } },
  lullaby: { set: ['kombucha', 'broccoli'], effect: { type: 'mult', ax: 'musical', x: 1.7 } },
  fizz: { set: ['kombucha', 'pickle'], effect: { type: 'mult', ax: 'wet', x: 1.6 } },
  kraut: { set: ['cabbage', 'pepper'], effect: { type: 'bonus', amt: 0.12 } },
  royal: { set: ['cheese', 'garlic', 'egg'], effect: { type: 'bonus', amt: 0.16 } },
  inferno: { set: ['pepper', 'garlic', 'beans'], effect: { type: 'mult', ax: 'heat', x: 1.8 } },
};

export interface ProtoLaunchResult {
  base: number;
  final: number;
  pct: number;
  grade: ReturnType<typeof gradeForPct>;
  stars: number;
}

/**
 * Faithful replay of ff-app.jsx computeLaunch (lines 43-106), with the
 * base-match math routed through the PRODUCTION `computeBase`/`closeness`.
 */
export function protoLaunch(
  plate: string[],
  crowdId: keyof typeof protoCrowds,
  recipeId: keyof typeof protoRecipes | null = null,
  quality = 1,
): ProtoLaunchResult {
  const raw: Record<string, number> = { wet: 0, dry: 0, stink: 0, loud: 0, musical: 0, heat: 0 };
  let belly = 0;
  for (const id of plate) {
    const f = protoFoods[id]!;
    for (const [k, v] of Object.entries(f.ax)) raw[k] = (raw[k] ?? 0) + v!;
    belly += f.belly;
  }
  const recipe = recipeId ? protoRecipes[recipeId]! : null;
  if (recipe && recipe.effect.type === 'mult') raw[recipe.effect.ax!] = raw[recipe.effect.ax!]! * recipe.effect.x!;

  const ax: Record<string, number> = {};
  for (const k of Object.keys(raw)) ax[k] = Math.min(1, raw[k]! / AXIS_CAP);
  ax.length = Math.min(1, belly / BELLY_MAX);

  const crowd = protoCrowds[crowdId];
  const judged = crowd.wants.map((w) => ({
    target: w.target,
    got: ax[w.ax] ?? 0,
    weight: w.w,
    hate: !!w.hate,
  }));
  // closeness re-exported only to assert the curve directly in tests
  void closeness;

  const base = computeBase(judged);
  let final = base;
  if (recipe && recipe.effect.type === 'bonus') final = Math.min(1, final + recipe.effect.amt!);
  if (quality > 1.001) final = Math.min(1, final * quality);
  else if (quality < 0.999) final = final * quality;

  const pct = Math.round(final * 100);
  return { base, final, pct, grade: gradeForPct(pct), stars: starsForPct(pct) };
}
