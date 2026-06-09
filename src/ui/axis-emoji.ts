import type { FoodProperties } from '../state/food';

export function axisEmoji(axis: keyof FoodProperties): string {
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
