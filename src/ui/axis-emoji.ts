import type { AxisBreakdown } from '../scoring/match';

export function axisEmoji(axis: AxisBreakdown['axis']): string {
  switch (axis) {
    case 'wet': return '💧';
    case 'dry': return '🌵';
    case 'stink': return '🦨';
    case 'loud': return '🔊';
    case 'musical': return '🎵';
    case 'length': return '⏱';
    case 'temp': return '🌡';
  }
}
