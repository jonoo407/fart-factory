export interface GradeResult {
  grade: string;
  desc: string;
  color: string;
}

export function gradeFart(total: number): GradeResult {
  if (total < 12) return { grade: 'F-', desc: 'Did you even try?', color: '#888' };
  if (total < 18) return { grade: 'D', desc: 'Barely qualifies as a fart.', color: '#aa8844' };
  if (total < 24) return { grade: 'C', desc: 'A respectable toot.', color: '#88aa44' };
  if (total < 30) return { grade: 'C+', desc: "Now we're getting somewhere!", color: '#aacc44' };
  if (total < 36) return { grade: 'B', desc: 'Your butt has talent.', color: '#44aa88' };
  if (total < 42) return { grade: 'B+', desc: 'Professional-grade flatulence.', color: '#4488cc' };
  if (total < 48) return { grade: 'A', desc: 'A fart for the AGES.', color: '#8844cc' };
  if (total < 54) return { grade: 'A+', desc: 'LEGENDARY. Scientists are baffled.', color: '#cc44aa' };
  return { grade: 'S+', desc: 'YOU HAVE BROKEN THE FART SCALE. BOW DOWN.', color: '#ff0000' };
}

export function stinkEmoji(val: number): string {
  if (val < 3) return '🌸';
  if (val < 5) return '😐';
  if (val < 7) return '🤢';
  if (val < 9) return '💀';
  return '☠️🔥';
}

export function durationLabel(val: number): string {
  if (val < 3) return 'Blink-and-miss';
  if (val < 5) return 'Standard Issue';
  if (val < 7) return 'Extended Play';
  if (val < 9) return "Director's Cut";
  return 'NEVER-ENDING';
}
