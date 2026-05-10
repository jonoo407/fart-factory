export const comments: readonly string[] = [
  "That fart just applied for its own zip code.",
  "Local news is reporting a mysterious fog.",
  "Your dog just packed a suitcase and left.",
  "NASA detected that from orbit.",
  "The Geneva Convention would like a word.",
  "A nearby canary has fainted.",
  "That wasn't a fart. That was a DECLARATION.",
  "Three stars on Yelp: 'Interesting atmosphere.'",
  "Scientists are still arguing about what that was.",
  "Plot twist: the fart was sentient.",
  "Somewhere, a skunk just said 'respect.'",
  "That fart has been classified as a weather event.",
  "New species of bacteria just evolved from that.",
  "Your neighbors are calling a town meeting.",
  "A toast... to the brave souls in this room.",
  "That fart just got its own Wikipedia page.",
  "Breaking: local birds flying in the opposite direction.",
  "Your couch will never forgive you.",
  "The smoke detector is very confused right now.",
  "That fart had a beginning, a middle, and an end. Like a MOVIE.",
  "Congratulations! You've cleared the room. And the next room.",
  "A moment of silence for everyone's nostrils.",
  "That fart echoed. IN AN OPEN FIELD.",
  "Your future self just called to complain.",
  "Even the flies left.",
  "The walls are a different color now.",
  "That fart traveled back in time and ruined yesterday too.",
  "Three pigeons just filed a noise complaint.",
  "That fart had CHAPTERS.",
  "The United Nations has been notified.",
];

export const weakComments: readonly string[] = [
  "Was that... a fart? Or a gentle breeze?",
  "My grandmother farts louder than that.",
  "That was the fart equivalent of a whisper.",
  "Did something happen? I didn't notice.",
  "Even the dog didn't look up.",
  "That fart needs a confidence boost.",
  "Somewhere, a butterfly laughed at you.",
  "Try again. With FEELING this time.",
];

export interface ReactionSet {
  min: number;
  reactions: string[];
  desc: string;
}

export const reactionSets: ReactionSet[] = [
  { min: 0, reactions: ['😐', '🐕', '🌻', '🏠'], desc: 'Barely noticeable' },
  { min: 15, reactions: ['😳', '🐕💨', '🌻', '👃'], desc: 'Something happened' },
  { min: 25, reactions: ['🤢', '🐕🏃', '🥀', '👃💀'], desc: 'Definitely a fart' },
  { min: 35, reactions: ['🤮', '🐕🧳', '💀🌻', '🏃‍♂️'], desc: 'Oh no' },
  { min: 45, reactions: ['💀', '🐕✈️', '☠️', '🚒'], desc: 'EVACUATE' },
  { min: 55, reactions: ['👻', '🐕🚀', '🔥', '🛸'], desc: 'LEGENDARY' },
];

export function showReactions(total: number): void {
  const el = document.getElementById('reactions');
  if (!el) return;
  let set = reactionSets[0];
  for (const s of reactionSets) if (total >= s.min) set = s;
  el.innerHTML = set.reactions
    .map((r) => '<span class="reaction">' + r + '</span>')
    .join('');
  setTimeout(() => {
    el.querySelectorAll('.reaction').forEach((r, i) => {
      setTimeout(() => r.classList.add('active'), i * 200);
    });
  }, 300);
}
