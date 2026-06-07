# 03 — Data Schemas & Seed Content

TypeScript interfaces for every content type, plus the **exact seed data** from the prototype
(`design_reference/prototype/ff-data.js`). Drop these into `src/state/` and expand.

---

## 1. Interfaces

```ts
type AxisKey = 'wet' | 'dry' | 'stink' | 'loud' | 'musical' | 'heat';
type Rarity  = 'c' | 'u' | 'r' | 'e' | 'l';   // common, uncommon, rare, epic, legendary

interface Food {
  id: string;
  e: string;                       // emoji
  n: string;                       // display name
  r: Rarity;
  belly: number;                   // belly cost (1–3)
  ax: Partial<Record<AxisKey, number>>;  // TRUE hidden profile, integers 0–5
  perk: string;                    // mastery perk text; parsed to {type:'belly'} or {type:'ax', ax}
}

interface RecipeEffect {
  type: 'mult' | 'bonus' | 'transform' | 'crowdBonus' | 'loot';
  ax?: AxisKey; x?: number;        // mult
  amt?: number;                    // bonus (additive fraction, e.g. 0.12)
  from?: AxisKey; to?: string;     // transform (full-game)
  audienceTag?: string; tiers?: number;  // crowdBonus (full-game)
  drop?: string;                   // loot (full-game)
}
interface Recipe {
  id: string;
  set: string[];                   // food ids that form the combo
  n: string;
  r: Rarity;
  effect: RecipeEffect;
  blurb: string;                   // short UI description, e.g. '+70% TOOTY · sings a little tune'
}

interface Want { ax: AxisKey; target: number; w: number; hate?: boolean; } // target 0–1, w = weight
interface Chip { ax: AxisKey; type: 'want' | 'no'; }   // the craving chips shown on the ticket
interface CrowdIntro { e: string; t: string; b: string; } // one-time intro card (b allows <b> tags)

interface Crowd {
  id: string;
  e: string;
  n: string;
  rarity: 'common' | 'rare' | 'boss';
  diff: number;                    // 1–4, shown as pips
  role: string;                    // e.g. "Today's crowd", "★ Rare VIP"
  line: string;                    // craving line (spoken + bubble)
  wants: Want[];                   // what's judged
  chips: Chip[];                   // craving chips on the ticket
  gold: number;                    // base gold reward at 100% match
  vip?: boolean;
  boss?: boolean;
  grant?: string;                  // food id granted when this crowd's intro is dismissed
  intro?: CrowdIntro;              // one-time teaching card before the show
}

interface Treatment {
  id: string;
  e: string;
  n: string;
  d: Partial<Record<AxisKey, number>>; // axis deltas applied to RAW totals (can be negative)
  blurb: string;
}

interface ShopItem { food: string; cost: number; tag?: string; }
```

A **Venue** (full-game generalization of the slice's single Hometown ladder):
```ts
interface Venue {
  id: string;
  name: string;
  e: string;
  crowds: string[];                // ordered crowd ids; last one should be a boss
  newAxes?: AxisKey[];             // axes this region introduces to judging
  unlockReq?: string;              // human-readable gate, e.g. "Beat the Mayor"
}
```

---

## 2. Seed foods (10)

Axis values are the **true hidden profile** (revealed one-at-a-time by use). `perk` unlocks at mastery (all axes revealed AND used ≥5×).

| id | e | name | r | belly | ax (true) | perk |
|---|---|---|---|---|---|---|
| beans | 🫘 | Beans | c | 3 | stink 3, loud 3, dry 2 | +1 LOUD |
| egg | 🥚 | Egg | c | 2 | stink 5, dry 1 | −1 belly |
| cheese | 🧀 | Cheese | c | 3 | stink 4, wet 1 | +1 STINK |
| garlic | 🧄 | Garlic | c | 2 | stink 4, heat 1 | +1 SPICY |
| onion | 🧅 | Onion | c | 2 | stink 3, wet 2 | −1 belly |
| broccoli | 🥦 | Broccoli | u | 3 | musical 3, loud 1, stink 2 | +1 TOOTY |
| kombucha | 🫖 | Kombucha | r | 2 | wet 4, musical 2 | +1 TOOTY |
| pepper | 🌶️ | Pepper | u | 2 | loud 3, heat 4 | +1 LOUD |
| cabbage | 🥬 | Cabbage | u | 3 | stink 3, wet 2, musical 2 | +1 STINK |
| pickle | 🥒 | Pickle | u | 2 | wet 3, stink 2 | −1 belly |

`STARTER` pantry (owned at game start): **beans, egg, cheese, garlic, onion** (the 5 commons).

---

## 3. Seed recipes (6)

| id | set | name | r | effect | blurb |
|---|---|---|---|---|---|
| classic | beans + egg | The Classic | c | mult stink ×1.5 | +50% STINK · deep rumble |
| lullaby | kombucha + broccoli | The Lullaby Toot | u | mult musical ×1.7 | +70% TOOTY · sings a little tune |
| fizz | kombucha + pickle | Fizz Bomb | u | mult wet ×1.6 | +60% WET · fizzy & loud |
| kraut | cabbage + pepper | Spicy Kraut | u | bonus +0.12 | +12% match · pure chaos |
| royal | cheese + garlic + egg | Royal Rumbler | r | bonus +0.16 | Refined funk · +16% match |
| inferno | pepper + garlic + beans | The Inferno | r | mult heat ×1.8 | +80% SPICY · the kettle screams |

---

## 4. Seed crowds (the Hometown venue ladder, in order)

`wants` use `target` 0–1 and weight `w`; a `hate` want has `target: 0`.

**1 · Granny Edna** 👵 — common, diff 1, gold 24, grants **broccoli**
- line: *"A polite little tune, dear. Nothing too loud!"*
- wants: `musical target 0.85 w 2.2`, `loud target 0.1 w 1.6 hate`
- chips: musical (want), loud (no)
- intro 🥦: *"A new food appeared! **Broccoli** joined your pantry. Some foods are secretly **musical** 🎺 — Granny will love that."*

**2 · The Frat Pack** 😎 — common, diff 2, gold 34, grants **pepper**
- line: *"BRO. Make it RIP and make it STANK. Go BIG!!"*
- wants: `loud target 0.9 w 2.2`, `stink target 0.8 w 1.7`
- chips: loud (want), stink (want)
- intro 🌶️: *"Heads up: it gets harder. These two judge **TWO** things at once — LOUD **and** STINK. **Pepper** joined your pantry."*

**3 · The Critic-Bot** 🤖 — **rare VIP**, diff 3, gold 80
- line: *"Requesting maximum offense. Moisture will not be tolerated."*
- wants: `stink target 0.92 w 2.2`, `loud target 0.7 w 1.2`, `wet target 0.0 w 1.6 hate`
- chips: stink (want), loud (want), wet (no)
- intro 🤖: *"A Rare VIP showed up! The Critic-Bot wants it **rotten & loud** but **HATES wet** 💦. Nail it for a guaranteed rare unlock + big gold."*

**4 · The Mayor** 👑 — **boss**, diff 4, gold 150
- line: *"Impress me with something LOUD and DIGNIFIED. And absolutely nothing… wet."*
- wants: `loud target 0.85 w 2`, `stink target 0.75 w 1.5`, `wet target 0.0 w 1.4 hate`
- chips: loud (want), stink (want), wet (no)
- intro 👑: *"BOSS: The Mayor — the headliner of Hometown. Bring your best **recipe** — a named combo bonus is how you tip a boss over the edge."*

---

## 5. Seed treatments (Kitchen) & shop

Treatments (equip one; deltas apply to raw axis totals):
| id | e | name | d (deltas) | blurb |
|---|---|---|---|---|
| ferment | 🫧 | Ferment | stink +2 | +2 stink, slower |
| spice | 🌶️ | Spice | heat +2, loud +1 | +2 spicy, +1 loud |
| chill | ❄️ | Chill | wet −2, stink −1 | −2 wet, −1 stink |

Shop stock (slice):
| food | cost | tag |
|---|---|---|
| kombucha | 90 | ★ Rare |
| cabbage | 55 | |
| pickle | 45 | |

---

## 6. Tutorial cards (shown before the first show)

1. 🧪 **Welcome, Fart Scientist!** — *"An audience just sat down. Tap foods to **plate** them, then hold the big green button to **BLAST**."*
2. 👀 **Read what they crave** — *"Every crowd wants something different. Match their craving to win — but you don't know what each food does yet…"*
3. 🔍 **Discover by doing** — *"Launch a food and you'll **learn what it does** 💦🤢🔊🎺. Your field guide fills in by itself as you play!"*

---

## 7. Full-game expansion blanks (filled-in recommendations)

The slice is one venue / 4 crowds / 10 foods / 6 recipes. To give the economy and discovery room to breathe, the full game should add (suggested, not prescriptive):
- **3–5 regions** beyond Hometown (Beach Town: wet+loud; The Peaks: dry+cold; Big City: loud+dignified; Volcano: heat+legendary), each introducing 1–2 new axes to judging and ending in a themed boss.
- **~30 foods across 5 rarity tiers** (the repo's existing `src/state/food.ts` catalog already targets 30 — reconcile its stats with the hidden-axis model here).
- **~20 named audiences** (the repo's `src/state/audience.ts` targets 20 — map them onto the `Crowd` schema, assigning rarity/diff/wants).
- **15–25 recipes** spanning all five effect types (introduce `transform`, `crowdBonus`, `loot` here).
- A handful more treatments + the **fermentation rack** (multi-show ingredient aging) sketched in the static app design.
