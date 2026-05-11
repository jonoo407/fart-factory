/**
 * Per-boss snark lines for losses. Per PLAN_v7 T3.3.
 *
 * Replaces the generic "Cool off for a few performances" text with
 * something more in-character. Adds emotional sting to failure.
 */

const SNARK: Record<string, string[]> = {
  'granny-family-reunion': [
    "Granny shakes her head: 'I expected more from you, dear. The babies are crying.'",
    "Granny: 'When I was your age I could move a room. Just sayin'.'",
    "Granny pats your shoulder: 'There, there. Practice in the bathroom.'",
  ],
  'royal-court-escalation': [
    "Royal Court: 'Peasant. We shall not be amused again for THREE performances.'",
    "The Queen looks pained. The Court averts their gaze. You hear quiet weeping.",
    "Royal Decree: '...refund.'",
  ],
  'haunted-three-ghosts': [
    "The ghosts pass through you, unimpressed. One mutters 'meh' in three voices.",
    "A spectral hand patted your back. It was somehow disappointed.",
    "Even the ghosts moved on. That's a first.",
  ],
  'volcano-cult-ritual': [
    "The cult chants: 'Re-! Try! Re-! Try!' The magma god is bored.",
    "Volcano steam expresses disappointment. So does the high priest.",
    "Cult Leader: 'Come back when the mountain calls your name. Not soon.'",
  ],
  'cosmic-council-judgment': [
    "The Council murmurs in 9 dimensions. The verdict: 'mid.'",
    "A councilor blinks (slowly). You feel judged across spacetime.",
    "Cosmic Vote Recorded: 'try again, mortal.'",
  ],
};

export function snarkForBossLoss(bossId: string, seed: number): string {
  const lines = SNARK[bossId];
  if (!lines || lines.length === 0) return 'Try again — they expected more.';
  return lines[seed % lines.length]!;
}
