# Gameplay Critique — Post-v6 build (encounter loop shipped)

**Reviewer stance:** Pure critique. No fixes proposed in this document — those belong in `docs/PLAN_v7_FUN.md`.
**Reviewer instruction from user:** "focused on game play: elements that make it interesting and fun, and funny as well." Look at progression, funny, player choice matters, discovery, rewards, challenge, cause→effect, danger, power, skill, loot.

The build is now structurally sound (encounter loop, no real-world-time wall, 442 unit + 174 e2e green). But "structurally sound" is not the same as "fun to play." Below: what genuinely lands and what doesn't.

---

## What WORKS

- **The encounter loop**: Move On → intermission → next audience. Pacing is good. The "12 funny activity choices" feel right — Hot Pepper Chew → next launch is spicier. Bean Burrito → +6 belly right now.
- **Audience personality**: 100 unique reaction lines (Granny chuckles, Royal Court demands a refund). The voice carries.
- **Boss puzzle distinction**: 5 bosses, 5 different cognitive tests. Genuinely good design.
- **Discovery toast**: NEW RECIPE splash is satisfying.
- **The base loop is legible**: plate → launch → match% → reward → repeat. A 7-year-old can grok it in 30 seconds.

---

## What DOESN'T work (gaps the user cares about)

### 1. Loot accumulation — biggest gap

User flagged this explicitly: "loot accumulating better and better and more amazing stuff."

**Reality:** Food unlocks happen through *transactions* (gold purchase, notes purchase, boss reward). There are zero random drops. There are zero unexpected rewards. Every "unlock" is a thing you spent currency on.

The shop offers 4-5 items daily. You see them coming. You save up. You buy. That's not loot — that's commerce.

**What loot feels like in other kids' games:** Slay the Spire opens cards at random after a fight. Pokémon Sleep wakes up with a surprise sleep style. Mario Kart spins an item box. The player doesn't pick — the game *gives*, and the gift is exciting.

**In this build:** A boss win is the closest thing — the legendary food unlocks. But you saw it coming three encounters ago. And there are only 5 such moments per save.

### 2. Cause → effect math is opaque

After a launch you see:
- `83% match for 👵 Granny Edna`
- `🚫 Restriction violated: no-wet (-25%)`
- `✨ Synergy: bean-cheese-swamp`

You DON'T see:
- Per-axis breakdown of how the property vector compared to cravings
- "Your stink:5 vs wants:1 → 4 points off → -8% from this axis"
- Which treatment / location / buff contributed what

So players can't TUNE their strategy. They iterate by gut, not by understanding. "Hard to master" doesn't apply because the mastery is invisible.

### 3. Critical success / critical failure don't exist

In the current scoring:
- 100% match = same celebration as 88% match (just better gold)
- 0% match = same "try again" as 35% match (still bank notes)

There's no "OH MY GOD I HIT PERFECT" moment. There's no "I CATASTROPHICALLY FAILED, IT'S HILARIOUS" moment.

Comedy thrives on extremes. A fart game that doesn't reward extreme outcomes (legendary success + spectacular disaster) is missing 30% of its potential humor.

### 4. Streaks / combos don't exist

You launch. You get a match%. The game forgets the moment. No state carries between launches except encounter idx.

A streak system (3+ launches at ≥75%) would:
- Add a visible "On Fire 🔥" counter (like Spelling Bee's pangram streak)
- Multiply rewards
- Create a "don't break the streak" decision pressure
- Let players show off

Right now there's no "show off" path. No streak. No badge. No counter.

### 5. Food mastery doesn't exist

You eat beans 50 times across a save. The 51st bean is the same as the first. There's no "you've mastered beans, they now give +1 stink for you."

This is the single biggest gap for the "easy to learn, difficult to master" axis. Mastery has no representation.

### 6. Power moments don't pop

The legendary fanfare animation (Phase J) fires when you launch a legendary food. It's a gold pulse on the audience-wrap div. ~1.6s, subtle.

That should be a CINEMATIC moment. The screen should darken. Particles should fly. The audience should react bigger. Right now it's a 1.6-second background glow that you might miss.

### 7. Hidden / Easter-egg content doesn't exist

30 recipes total, all discoverable through normal play. No "if you plate three legendaries in a row you trigger a HIDDEN audience." No "stack 4 of the same food and unlock the Glutton's Trophy." No goofy hidden interaction.

For a game targeting a 7-year-old kid + parent, hidden secrets are PRIME territory. The "ooh I found something" moment compounds engagement.

### 8. Particles / visual joy

Launching produces:
- Gas particles (Phase C)
- A match-% number
- Audience portrait wobble

That's it. No confetti for high scores. No sparks for synergies. No comedic recoil ("the audience pushed back"). The animations exist but are subtle to the point of invisible.

### 9. Boss losses are toothless

Losing a boss puts that boss on 3-encounter cooldown. That's it. You burn 3 normal encounters and try again. There's no narrative consequence, no permanent setback, no "well I learned something" hint, no "they whisper about your defeat."

Failure should HURT a little — or be REALLY funny. Right now it's just inconvenient.

### 10. Funny gap

Per-audience reactions are funny in TEXT. But the gameplay doesn't generate visual comedy:
- When the audience "evacuates" (💀 tier), nothing visually conveys "they ran out."
- When Granny "chuckles politely," there's no chuckling animation.
- When a Cheese Sample synergy fires, no oozy yellow particle.
- When a synergy fails (conflict), no "stink lines."

The text is clever; the visual interpretation is bland. Visual comedy IS the easiest way to make a kid laugh.

### 11. Choice matters — but rarely

Real choices (player commits, can't undo):
- Boss attempt (1 shot, then cooldown)
- Intermission activity (3 → pick 1, can't change later)
- Map travel (you go to ONE place; the encounter happens there)

Reversible choices (no commitment):
- Plate composition (remove + readd as often as you like)
- Location (Travel any time before launching)
- Treatment selection in Kitchen (change before sending)

Most decisions are reversible. That's friendly to new players, but it removes stakes. Choosing should sometimes BIND you.

### 12. No "what just happened?" replay

After a 95% match with three synergies and a perfect plate, the result panel shows:
- The match%
- The synergies
- The recipe (if discovered)

You can't review this later. You can't show off the screenshot. There's no Hall of Fame anymore (the v2 game had one — it was removed in v3).

---

## Cross-cutting issue: feedback latency

The whole loop is fast (good!) but the WOW moments are NOT punctuated. A perfect launch should:
- Pause briefly
- Highlight the match%
- Show a celebration animation
- Play a sting
- Then return to normal

Currently a 100% match returns control instantly. The player doesn't have time to FEEL the win.

---

## Summary verdict

The framework is solid. The loop is legible. The puzzles are good. But the GAME doesn't quite feel ALIVE. Compare a kid's experience of plinko vs. solitaire: this is currently closer to solitaire. The user's intuition is right — it needs more *zing*.

**Top 5 gaps for the overnight work:**
1. **No loot accumulation** — surprise rewards, random drops, mastery progress.
2. **No critical success / failure pop** — every outcome feels the same magnitude.
3. **No streaks** — moment-to-moment doesn't accumulate.
4. **Power moments don't punch** — legendary launches are background events.
5. **Cause→effect is invisible** — players can't see WHY they got their match%.

Plan to address: `docs/PLAN_v7_FUN.md`.
