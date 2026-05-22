/**
 * Per-boss snark lines for losses. Per PLAN_v7 T3.3 + PR7 expansion.
 *
 * Replaces the generic "Cool off for a few performances" text with
 * something more in-character. Adds emotional sting to failure.
 *
 * Each boss now has ≥8 lines so re-attempts don't repeat as quickly.
 */

const SNARK: Record<string, string[]> = {
  'granny-family-reunion': [
    "Granny shakes her head: 'I expected more from you, dear. The babies are crying.'",
    "Granny: 'When I was your age I could move a room. Just sayin'.'",
    "Granny pats your shoulder: 'There, there. Practice in the bathroom.'",
    "Granny sighs: 'My casserole would have stopped traffic. Yours barely stopped the kindergartners.'",
    "Granny offers you a peppermint: 'You looked like you needed something sweet, sweetie.'",
    "Granny: 'Even the baby was unimpressed. THE BABY.'",
    "Granny knits, pointedly. The needles click in disapproval.",
    "Granny: 'Come back when you can shake the chandelier, dear.'",
  ],
  'royal-court-escalation': [
    "Royal Court: 'Peasant. We shall not be amused again for THREE performances.'",
    "The Queen looks pained. The Court averts their gaze. You hear quiet weeping.",
    "Royal Decree: '...refund.'",
    "A herald reads aloud: 'By order of the crown — that DID NOT slay.'",
    "The Court fan themselves rapidly. Not from heat. From shame.",
    "The Duke whispers to the Duchess. The Duchess audibly says 'oh dear.'",
    "Royal Court: 'We have employed jesters with more presence. Begone.'",
    "Royal Court: 'Take the rest of the day. Take the WEEK if you must.'",
  ],
  'haunted-three-ghosts': [
    "The ghosts pass through you, unimpressed. One mutters 'meh' in three voices.",
    "A spectral hand patted your back. It was somehow disappointed.",
    "Even the ghosts moved on. That's a first.",
    "The mansion's third ghost faded slightly. Out of boredom.",
    "A chill enters the room. It is the wind of a thousand sighs.",
    "The ghosts compare notes. They have decided: 'forgettable.'",
    "The chandelier swings. Slowly. Disappointed.",
    "A ghost asks for its haunting fee back. You don't even charge.",
  ],
  'volcano-cult-ritual': [
    "The cult chants: 'Re-! Try! Re-! Try!' The magma god is bored.",
    "Volcano steam expresses disappointment. So does the high priest.",
    "Cult Leader: 'Come back when the mountain calls your name. Not soon.'",
    "The acolytes lower their hoods. They are LOOKING at you.",
    "A novice giggles. The senior cultist glares. The novice now meditates.",
    "The Sacred Fire dims slightly. The cult notes this in the ledger.",
    "Cult Leader: 'The mountain wanted thunder. You delivered drizzle.'",
    "The cult begins a slow clap. It is not encouraging.",
  ],
  'cosmic-council-judgment': [
    "The Council murmurs in 9 dimensions. The verdict: 'mid.'",
    "A councilor blinks (slowly). You feel judged across spacetime.",
    "Cosmic Vote Recorded: 'try again, mortal.'",
    "The Council schedules another session. You will not be reminded.",
    "Reality shimmers briefly. The shimmer means 'next time.'",
    "Councilor Vela writes 'see me' on the void. The void receives it.",
    "The vote count: 0 for, infinity against. A quorum, technically.",
    "The Council fans out into parallel universes. None of them like that one either.",
  ],
};

export function snarkForBossLoss(bossId: string, seed: number): string {
  const lines = SNARK[bossId];
  if (!lines || lines.length === 0) return 'Try again — they expected more.';
  const positive = ((seed % lines.length) + lines.length) % lines.length;
  return lines[positive]!;
}

export function snarkLineCount(bossId: string): number {
  return SNARK[bossId]?.length ?? 0;
}
